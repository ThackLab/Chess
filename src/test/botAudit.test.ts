// What a bot of each rating does in the five situations that decide beginner
// and club games, on positions from the puzzle bank:
//   take:   an enemy piece can simply be taken (one move, no tactic)
//   mate1:  there is a mate in one
//   tactic: winning needs a real tactic (fork, pin, skewer, discovery, mate in 2...), nothing is just hanging
//   save:   one of its own pieces hangs: does it do something about it?
//   calm:   the position a player blundered in: how often does the bot blunder too (loses 2+ pawns)?
// Run with: BOT_AUDIT="100,250,500,850,1150,1450;60" npx vitest run src/test/botAudit.test.ts --silent=false
// (the number after ";" is how many positions of each kind to use).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Chess, type Color, type Square } from 'chess.js';
import { it } from 'vitest';
import { customBot } from '../lib/bots/bots';
import { chooseBotMove } from '../lib/bots/brain';
import { playUci } from '../lib/chess/utils';
import { hangingPieces } from '../lib/chess/tactics';
import type { Engine } from '../lib/engine/engine';
import { scoreToCp } from '../lib/engine/uci';
import type { TacticPuzzle } from '../lib/learn/puzzles';
import { nodeEngine } from './nodeEngine';

type Kind = 'take' | 'mate1' | 'tactic' | 'save' | 'calm';
const KINDS: Kind[] = ['take', 'mate1', 'tactic', 'save', 'calm'];
const TACTICS = new Set(['fork', 'pin', 'skewer', 'discovered', 'removeDefender', 'mateIn2', 'doubleCheck', 'setup']);

const puzzles: TacticPuzzle[] = JSON.parse(readFileSync(fileURLToPath(new URL('../../public/puzzles.json', import.meta.url)), 'utf8'));

function after(fen: string, moves: string[]): Chess {
  const c = new Chess(fen);
  for (const u of moves) playUci(c, u);
  return c;
}

/** The same position with the other side to move (null if that isn't legal). */
function flipped(c: Chess): string | null {
  if (c.inCheck()) return null;
  const parts = c.fen().split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  try {
    const f = new Chess(parts.join(' '));
    return f.inCheck() || !f.moves().length ? null : f.fen();
  } catch {
    return null;
  }
}

/** Positions of each kind, and the move that solves it (when there's a single answer). */
function positions(per: number): { kind: Kind; fen: string; answer?: string }[] {
  const out: { kind: Kind; fen: string; answer?: string }[] = [];
  const count = new Map<Kind, number>();
  const push = (kind: Kind, fen: string, answer?: string) => {
    if ((count.get(kind) ?? 0) >= per) return;
    count.set(kind, (count.get(kind) ?? 0) + 1);
    out.push({ kind, fen, answer });
  };
  // A fixed shuffle, so every run uses the same positions.
  const order = puzzles.map((p, i) => ({ p, k: (i * 7919) % 1223 })).sort((a, b) => a.k - b.k);
  for (const { p } of order) {
    const pre = p.noPrev ? [] : [p.moves[0]];
    const line = p.noPrev ? p.moves : p.moves.slice(1);
    const c = after(p.fen, pre);
    const me = c.turn();
    const first = line[0];
    const target = first.slice(2, 4) as Square;
    const hanging = hangingPieces(c, me === 'w' ? 'b' : 'w');
    const simpleTake = !!c.get(target) && hanging.some((h) => h.square === target);
    if (p.themes.includes('mateIn1')) push('mate1', c.fen(), first);
    else if (p.themes.includes('hanging') && line.length === 1 && simpleTake) push('take', c.fen(), first);
    else if (line.length >= 3 && p.themes.some((t) => TACTICS.has(t)) && !hanging.length) push('tactic', c.fen(), first);
    if (!p.noPrev && p.themes.includes('hanging')) {
      const f = flipped(c);
      if (f && hangingPieces(new Chess(f), new Chess(f).turn()).length) push('save', f);
    }
    if (!p.noPrev) push('calm', p.fen);
  }
  return out;
}

async function evalFor(ana: Engine, fen: string, color: Color): Promise<number> {
  const r = await ana.analyse({ fen, limits: { depth: 12 }, multipv: 1 });
  const s = r.lines[0]?.score;
  return s ? scoreToCp(s) * (color === 'w' ? 1 : -1) : 0;
}

it.skipIf(!process.env.BOT_AUDIT)('bot audit', { timeout: 6 * 3_600_000 }, async () => {
  const [elosArg, perArg] = process.env.BOT_AUDIT!.split(';');
  const elos = elosArg.split(',').map(Number);
  const pos = positions(+(perArg ?? 40));
  const jobs = elos.flatMap((elo) => pos.map((p) => ({ elo, ...p })));
  const stats = new Map<string, { ok: number; n: number }>();
  const best = new Map<string, number>();
  let next = 0;
  const worker = async () => {
    const bot = nodeEngine();
    const ana = nodeEngine({ Hash: 32 });
    while (next < jobs.length) {
      const job = jobs[next++];
      const color = job.fen.split(' ')[1] as Color;
      if (!best.has(job.fen)) best.set(job.fen, await evalFor(ana, job.fen, color));
      const mv = await chooseBotMove(bot, { startFen: job.fen, moves: [], bot: customBot(job.elo) });
      const c = new Chess(job.fen);
      playUci(c, mv.uci);
      const value = c.isCheckmate() ? 10000 : -(await evalFor(ana, c.fen(), c.turn()));
      const loss = Math.max(0, best.get(job.fen)! - value);
      const ok =
        job.kind === 'mate1'
          ? c.isCheckmate()
          : job.kind === 'take'
            ? mv.uci === job.answer || loss < 100
            : job.kind === 'tactic'
              ? mv.uci === job.answer || loss < 60
              : job.kind === 'calm'
                ? loss >= 200 // counts blunders
                : loss < 150;
      const key = `${job.elo}:${job.kind}`;
      const s = stats.get(key) ?? { ok: 0, n: 0 };
      s.n++;
      if (ok) s.ok++;
      stats.set(key, s);
      if (next % 50 === 0) process.stdout.write('.');
    }
    bot.terminate();
    ana.terminate();
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  process.stdout.write('\n\nElo    takes free   mate in 1   finds tactic   saves own   blunders (n per kind)\n');
  for (const elo of elos) {
    const pct = (k: Kind) => {
      const s = stats.get(`${elo}:${k}`);
      return s ? `${((100 * s.ok) / s.n).toFixed(0)}%` : '-';
    };
    const n = KINDS.map((k) => stats.get(`${elo}:${k}`)?.n ?? 0).join('/');
    process.stdout.write(
      `${String(elo).padEnd(6)} ${pct('take').padStart(10)} ${pct('mate1').padStart(11)} ${pct('tactic').padStart(14)} ${pct('save').padStart(11)} ${pct('calm').padStart(10)}   (${n})\n`,
    );
  }
});
