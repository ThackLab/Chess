// Compares a real player with the bots, in the player's own games. For every
// move the player made, it notes the situation (a free piece to take, a mate
// in one, a winning tactic, one of their own pieces hanging) and what they
// did, then asks the bots what they would have played in the same position.
// Run with:
//   HUMAN_AUDIT="games.pgn;MingeNinja;100,175,250" npx vitest run src/test/humanAudit.test.ts --silent=false
import { readFileSync } from 'node:fs';
import { Chess, type Color } from 'chess.js';
import { it } from 'vitest';
import { customBot } from '../lib/bots/bots';
import { chooseBotMove } from '../lib/bots/brain';
import { moveToUci, playUci } from '../lib/chess/utils';
import { hangingPieces } from '../lib/chess/tactics';
import type { Engine } from '../lib/engine/engine';
import { scoreToCp } from '../lib/engine/uci';
import { nodeEngine } from './nodeEngine';

type Kind = 'take' | 'mate1' | 'tactic' | 'save' | 'any';
const KINDS: Kind[] = ['take', 'mate1', 'tactic', 'save', 'any'];

interface Spot {
  fen: string;
  kinds: Kind[];
  played: string;
  best: number;
  bestMove: string;
  /** The capture of a hanging piece, if there is one. */
  takes: Set<string>;
}

/** Splits a PGN file into games and finds the player's moves in them. */
function playerPositions(pgn: string, player: string): { fen: string; played: string; color: Color }[] {
  const out: { fen: string; played: string; color: Color }[] = [];
  const games = pgn.split(/\n(?=\[Event )/).filter((g) => g.includes('['));
  for (const text of games) {
    const c = new Chess();
    try {
      c.loadPgn(text);
    } catch {
      continue;
    }
    const h = c.getHeaders();
    const color: Color | null = h.White?.toLowerCase() === player.toLowerCase() ? 'w' : h.Black?.toLowerCase() === player.toLowerCase() ? 'b' : null;
    if (!color) continue;
    const moves = c.history({ verbose: true });
    const replay = new Chess(h.FEN || undefined);
    for (const m of moves) {
      if (replay.turn() === color) out.push({ fen: replay.fen(), played: moveToUci(m), color });
      replay.move(m);
    }
  }
  return out;
}

async function analyse(ana: Engine, fen: string, multipv: number) {
  const r = await ana.analyse({ fen, limits: { depth: 12 }, multipv });
  const sign = fen.split(' ')[1] === 'w' ? 1 : -1;
  return r.lines.filter((l) => l.pv.length).map((l) => ({ move: l.pv[0], cp: sign * scoreToCp(l.score) }));
}

async function valueAfter(ana: Engine, fen: string, uci: string): Promise<number> {
  const c = new Chess(fen);
  playUci(c, uci);
  if (c.isCheckmate()) return 10000;
  const r = await analyse(ana, c.fen(), 1);
  return -(r[0]?.cp ?? 0);
}

it.skipIf(!process.env.HUMAN_AUDIT)('human audit', { timeout: 6 * 3_600_000 }, async () => {
  const [file, player, elosArg] = process.env.HUMAN_AUDIT!.split(';');
  const elos = (elosArg ?? '100,175,250').split(',').map(Number);
  const positions = playerPositions(readFileSync(file, 'utf8'), player);
  process.stdout.write(`\n${positions.length} moves by ${player}\n`);

  // Classify each position.
  const ana = nodeEngine({ Hash: 32 });
  const spots: Spot[] = [];
  for (const p of positions) {
    const c = new Chess(p.fen);
    const legal = c.moves({ verbose: true });
    const lines = await analyse(ana, p.fen, 2);
    if (!lines.length) continue;
    const kinds: Kind[] = ['any'];
    const hanging = hangingPieces(c, p.color === 'w' ? 'b' : 'w');
    const takes = new Set(legal.filter((m) => hanging.some((h) => h.square === m.to)).map(moveToUci));
    const mates = legal.filter((m) => m.san.endsWith('#'));
    if (mates.length) kinds.push('mate1');
    else if (takes.size) kinds.push('take');
    else if (lines.length > 1 && lines[0].cp >= 150 && lines[0].cp - lines[1].cp >= 200) kinds.push('tactic');
    if (!mates.length && hangingPieces(c, p.color).length && !takes.size) kinds.push('save');
    spots.push({ fen: p.fen, kinds, played: p.played, best: lines[0].cp, bestMove: lines[0].move, takes });
  }

  // How a move did in its position, for each kind.
  const judge = async (s: Spot, uci: string): Promise<Partial<Record<Kind, boolean>>> => {
    const loss = Math.max(0, s.best - (await valueAfter(ana, s.fen, uci)));
    const c = new Chess(s.fen);
    playUci(c, uci);
    return {
      take: s.takes.has(uci) || loss < 100,
      mate1: c.isCheckmate(),
      tactic: uci === s.bestMove || loss < 60,
      save: loss < 150,
      any: loss >= 200, // a blunder
    };
  };
  const tally = new Map<string, { ok: number; n: number }>();
  const count = (who: string, s: Spot, r: Partial<Record<Kind, boolean>>) => {
    for (const k of s.kinds) {
      const t = tally.get(`${who}:${k}`) ?? { ok: 0, n: 0 };
      t.n++;
      if (r[k]) t.ok++;
      tally.set(`${who}:${k}`, t);
    }
  };
  for (const s of spots) count(player, s, await judge(s, s.played));
  const bot = nodeEngine();
  for (const elo of elos)
    for (const s of spots) {
      const mv = await chooseBotMove(bot, { startFen: s.fen, moves: [], bot: customBot(elo) });
      count(String(elo), s, await judge(s, mv.uci));
    }
  bot.terminate();
  ana.terminate();

  process.stdout.write('\nwho           takes free   mate in 1   finds tactic   saves own   blunders/move   (n per kind)\n');
  for (const who of [player, ...elos.map(String)]) {
    const pct = (k: Kind) => {
      const t = tally.get(`${who}:${k}`);
      return t ? `${((100 * t.ok) / t.n).toFixed(0)}%` : '-';
    };
    const n = KINDS.map((k) => tally.get(`${who}:${k}`)?.n ?? 0).join('/');
    process.stdout.write(
      `${who.padEnd(13)} ${pct('take').padStart(10)} ${pct('mate1').padStart(11)} ${pct('tactic').padStart(14)} ${pct('save').padStart(11)} ${pct('any').padStart(15)}   (${n})\n`,
    );
  }
});
