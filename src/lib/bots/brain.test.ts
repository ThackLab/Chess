import { describe, expect, it } from 'vitest';
import type { Engine } from '../engine/engine';
import { customBot } from './bots';
import { chooseBotMove } from './brain';

/** Answers every search with the given lines, so the bot logic can run without Stockfish. */
function fakeEngine(lines: { pv: string[]; cp: number }[]): Engine {
  const result = {
    depth: 10,
    bestmove: lines[0]?.pv[0],
    lines: lines.map((l) => ({ pv: l.pv, score: { type: 'cp' as const, value: l.cp }, depth: 10, multipv: 1 })),
  };
  return { analyse: async () => result } as unknown as Engine;
}

/** A repeatable random number generator (mulberry32). */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('bot move choice', () => {
  it('a 100-rated bot nearly always takes a queen that is simply hanging', async () => {
    // Black's queen on d4 can be taken by the e3 pawn.
    const fen = 'k7/8/8/8/3q4/4P3/8/K7 w - - 0 1';
    const engine = fakeEngine([
      { pv: ['e3d4'], cp: 900 },
      { pv: ['a1a2'], cp: -900 },
      { pv: ['a1b1'], cp: -900 },
      { pv: ['e3e4'], cp: -900 },
    ]);
    let took = 0;
    for (let i = 0; i < 100; i++) {
      const mv = await chooseBotMove(engine, { startFen: fen, moves: [], bot: customBot(100), rng: seeded(i + 1) });
      if (mv.uci === 'e3d4') took++;
    }
    expect(took).toBeGreaterThanOrEqual(80);
  });

  it('still moves when every legal move is one it failed to notice', async () => {
    // White's only moves take one of two loose pawns (the king can't go to g1, the
    // bishop covers it), and a bot that notices nothing must still play one of them.
    const fen = 'k7/b7/8/8/8/6pp/6PP/7K w - - 0 1';
    const engine = fakeEngine([
      { pv: ['g2h3'], cp: 100 },
      { pv: ['h2g3'], cp: 90 },
    ]);
    const mv = await chooseBotMove(engine, { startFen: fen, moves: [], bot: customBot(250), rng: () => 0.99 });
    expect(['g2h3', 'h2g3']).toContain(mv.uci);
  });

  it('a strong bot never plays a move it sees losing material, and mostly plays the best', async () => {
    const fen = 'k7/8/8/8/8/8/4P3/K7 w - - 0 1';
    const engine = fakeEngine([
      { pv: ['e2e4'], cp: 60 },
      { pv: ['e2e3'], cp: 45 },
      { pv: ['a1b1'], cp: 20 },
      { pv: ['a1a2'], cp: -250 },
    ]);
    const best: number[] = [];
    for (const elo of [1600, 2200]) {
      const count = new Map<string, number>();
      for (let i = 0; i < 200; i++) {
        const mv = await chooseBotMove(engine, { startFen: fen, moves: [], bot: customBot(elo), rng: seeded(i + 1) });
        count.set(mv.uci, (count.get(mv.uci) ?? 0) + 1);
      }
      expect(count.get('a1a2') ?? 0).toBe(0);
      best.push(count.get('e2e4')!);
    }
    expect(best[0]).toBeGreaterThan(90);
    expect(best[1]).toBeGreaterThan(best[0]);
  });
});
