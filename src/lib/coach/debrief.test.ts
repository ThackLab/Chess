import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { buildReview } from '../review/review';
import type { PositionEval } from '../review/types';
import type { GameRecord } from '../storage/db';
import { debriefIntro, focusHabit, gist, habitTrend, lessonsFor, type Habit, type ReviewedGame } from './debrief';

const START = new Chess().fen();

/** A reviewed game from moves and, for each position, the engine's score (White's view) and best move. */
function reviewed(
  moves: string[],
  evals: [number | 'M1' | 'end', string][],
  color: 'w' | 'b',
  result: GameRecord['result'],
  termination: string,
  at = 0,
): ReviewedGame {
  const c = new Chess();
  const fens = [c.fen()];
  for (const u of moves) {
    c.move({ from: u.slice(0, 2), to: u.slice(2, 4) });
    fens.push(c.fen());
  }
  const positions: PositionEval[] = fens.map((fen, i) => {
    const [v, best] = evals[i];
    if (v === 'end') return { fen, lines: [], depth: 0, terminal: 'checkmate' };
    const score = v === 'M1' ? ({ type: 'mate', value: 1 } as const) : ({ type: 'cp', value: v } as const);
    return { fen, depth: 18, lines: [{ score, pv: [best], san: [], depth: 18 }] };
  });
  const review = buildReview({ startFen: START, moves }, positions, { depth: 18, userColor: color, outcome: { result, termination } });
  const game: GameRecord = {
    id: `g${at}`,
    createdAt: at,
    source: 'bot',
    white: { name: 'White', isUser: color === 'w' },
    black: { name: 'Black', isUser: color === 'b' },
    result,
    termination,
    startFen: START,
    moves,
    sans: review.moves.map((m) => m.san),
    pgn: '',
    userColor: color,
  };
  return { game, review, color };
}

// Scholar's mate: Black (you) plays 3...Nf6?? and is mated.
const scholars = (at = 0) =>
  reviewed(
    ['e2e4', 'e7e5', 'd1h5', 'b8c6', 'f1c4', 'g8f6', 'h5f7'],
    [
      [30, 'e2e4'],
      [30, 'e7e5'],
      [30, 'g1f3'],
      [0, 'b8c6'],
      [20, 'f1c4'],
      [40, 'g7g6'],
      ['M1', 'h5f7'],
      ['end', ''],
    ],
    'b',
    '1-0',
    'checkmate',
    at,
  );

describe('the coach', () => {
  it('keeps the point of a comment, not the whole line', () => {
    expect(gist('Your opponent wins the queen for a pawn after 2... Nxh5 3. d4 g5 4. e5 Bc6.')).toBe(
      'Your opponent wins the queen for a pawn after 2... Nxh5.',
    );
    expect(gist('This allows mate: 4. Qxf7#. Defend f7 first.')).toBe('This allows mate: 4. Qxf7#.');
  });

  it('opens a debrief with how it ended and where it turned', () => {
    const g = scholars();
    const intro = debriefIntro(g, lessonsFor(g));
    expect(intro.ending).toBe('You were checkmated on move 4.');
    expect(intro.turn).toMatch(/^The game turned on 3\.\.\. Nf6: /);
    expect(intro.moments).toBeGreaterThanOrEqual(1);
  });

  it('picks the habit that costs the most and says whether it is improving', () => {
    const games = Array.from({ length: 8 }, (_, i) => scholars(i));
    const h = focusHabit(games)!;
    expect(h).not.toBeNull();
    expect(h.games).toBe(8);
    expect(h.rule.length).toBeGreaterThan(20);
    const base: Habit = { ...h, recent: 1, before: 2 };
    expect(habitTrend(base)).toBe('better');
    expect(habitTrend({ ...base, recent: 2, before: 2 })).toBe('same');
    expect(habitTrend({ ...base, recent: 3, before: 1 })).toBe('worse');
    expect(habitTrend({ ...base, before: null })).toBeNull();
  });
});
