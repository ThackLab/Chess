// Checks the London course against Stockfish: in every line, each of your
// (White's) moves is within MAX_LOSS of the engine's best and the line ends
// in a playable position; every trap's answer is the engine's best move and
// clearly better than any other.
// Run with: LONDON=1 npx vitest run src/test/londonVerify.test.ts --silent=false
import { Chess } from 'chess.js';
import { it, expect } from 'vitest';
import { LONDON_LINES } from '../lib/london/lines';
import { LONDON_TRAPS } from '../lib/london/traps';
import { playLine } from '../lib/london/tree';
import { scoreToCp } from '../lib/engine/uci';
import { nodeEngine } from './nodeEngine';

const DEPTH = 16;
/** Centipawns a move of yours may give up against the engine's best (the London's 2.Bf4 itself costs about 25). */
const MAX_LOSS = 45;
/** Where a line may end, from your side. */
const MIN_END = -60;
/** How much better a trap's answer must be than the best move it doesn't accept. */
const TRAP_MARGIN = 20;

it.skipIf(!process.env.LONDON)('London lines and traps hold up against Stockfish', { timeout: 3_600_000 }, async () => {
  const engine = nodeEngine({ Hash: 64 });
  const problems: string[] = [];

  for (const line of LONDON_LINES) {
    const { uci, fens } = playLine(line);
    for (let i = 0; i < uci.length; i += 2) {
      const before = await engine.analyse({ fen: fens[i], limits: { depth: DEPTH }, multipv: 1 });
      const best = before.lines[0];
      if (best.pv[0] === uci[i]) continue;
      const after = await engine.analyse({ fen: fens[i + 1], limits: { depth: DEPTH }, multipv: 1 });
      // Scores are from White's side, so whatever the score drops by is what your move gave away.
      const loss = scoreToCp(best.score) - scoreToCp(after.lines[0].score);
      const msg = `${line.id} move ${i / 2 + 1} ${line.moves[i].san}: loses ${loss}cp`;
      console.log(`${loss > MAX_LOSS ? '✗' : '·'} ${msg}`);
      if (loss > MAX_LOSS) problems.push(msg);
    }
    const end = fens[fens.length - 1];
    if (!new Chess(end).isGameOver()) {
      const fin = await engine.analyse({ fen: end, limits: { depth: DEPTH }, multipv: 1 });
      const v = scoreToCp(fin.lines[0].score);
      console.log(`  ${line.id} ends at ${(v / 100).toFixed(2)}`);
      if (v < MIN_END) problems.push(`${line.id} ends at ${v}cp`);
    }
  }

  for (const trap of LONDON_TRAPS) {
    const c = new Chess();
    for (const san of trap.moves.split(' ')) c.move(san);
    for (let i = 0; i < trap.solution.length; i++) {
      const fen = c.fen();
      const mine = i % 2 === 0;
      const m = new Chess(fen).move(trap.solution[i]);
      const u = m.from + m.to + (m.promotion ?? '');
      if (mine) {
        const r = await engine.analyse({ fen, limits: { depth: DEPTH }, multipv: 4 });
        const accepted = new Set([u]);
        if (i === 0)
          for (const a of trap.alts ?? []) {
            const am = new Chess(fen).move(a);
            accepted.add(am.from + am.to + (am.promotion ?? ''));
          }
        const bestOk = accepted.has(r.lines[0].pv[0]);
        const top = scoreToCp(r.lines[0].score);
        const rival = r.lines.find((l) => !accepted.has(l.pv[0]));
        const margin = rival ? top - scoreToCp(rival.score) : Infinity;
        const msg = `${trap.id} ${trap.solution[i]}: best ${bestOk ? 'yes' : `no (${r.lines[0].pv[0]})`}, ${(top / 100).toFixed(2)}, margin ${margin}`;
        console.log(`${bestOk && margin >= TRAP_MARGIN ? '·' : '✗'} ${msg}`);
        if (!bestOk || margin < TRAP_MARGIN) problems.push(msg);
      }
      c.move(trap.solution[i]);
    }
  }
  engine.terminate();
  expect(problems).toEqual([]);
});
