// The coach's side of a review: what to say first about a game, and the one
// habit to work on across your recent games, with whether it is improving.
// Pure functions over stored reviews (see src/state/coach.ts for the watching).
import type { Color } from 'chess.js';
import { endingLine } from '../review/review';
import { gameLessons, type GameLessons } from '../review/lessons';
import type { GameReview, ReviewedMove } from '../review/types';
import type { GameRecord } from '../storage/db';
import { LESSON_FOR_THEME } from '../learn/curriculum';
import type { PuzzleTheme } from '../learn/tags';

export interface ReviewedGame {
  game: GameRecord;
  review: GameReview;
  color: Color;
}

const moveNo = (m: ReviewedMove) => `${Math.floor(m.ply / 2) + 1}${m.color === 'w' ? '.' : '...'} ${m.san}`;

export function lessonsFor({ game, review, color }: ReviewedGame): GameLessons {
  const tc = game.timeControl?.match(/^(\d+(?:\.\d+)?)\+/);
  return gameLessons(review, { userColor: color, result: game.result, clocks: game.clocks, initialMs: tc ? +tc[1] * 60_000 : undefined });
}

export interface Intro {
  /** One line on how the game ended. */
  ending: string;
  /** The best thing you did, if anything stood out. */
  good?: string;
  /** Where the game turned against you, in words. */
  turn?: string;
  /** How many moments the debrief will walk through. */
  moments: number;
}

/** What the coach says before going through a game. */
export function debriefIntro(g: ReviewedGame, lessons: GameLessons): Intro {
  const mine = g.review.moves.filter((m) => m.color === g.color);
  const best = mine.filter((m) => m.classification === 'brilliant' || m.classification === 'great').sort((a, b) => b.epLoss - a.epLoss)[0];
  const worst = [...mine].sort((a, b) => b.epLoss - a.epLoss)[0];
  const good = best ? `Your best moment was ${moveNo(best)}: ${best.headline.replace(/[.!]*$/, '')}.` : lessons.strengths[0];
  const turn = worst && worst.epLoss >= 0.15 ? `The game turned on ${moveNo(worst)}. ${worst.headline.replace(/[.!]*$/, '')}.` : undefined;
  return {
    ending: endingLine(g.review, g.color, { result: g.game.result, termination: g.game.termination }) || 'Here is your game.',
    good,
    turn,
    moments: lessons.practice.length,
  };
}

/** Puzzle themes that train each review theme (where there are puzzles for it). */
const PUZZLES_FOR_THEME: Record<string, PuzzleTheme[]> = {
  fork: ['fork'],
  pin: ['pin'],
  skewer: ['skewer'],
  discovered: ['discovered'],
  hanging: ['hanging'],
  exchanges: ['hanging', 'removeDefender'],
  missedChance: ['hanging', 'fork'],
  missedRecapture: ['hanging'],
  missedMate: ['mateIn1', 'mateIn2'],
  backRank: ['backRankMate'],
  kingSafety: ['mateIn2', 'backRankMate'],
  passedPawn: ['promotion'],
};

export interface Habit {
  key: string;
  icon: string;
  title: string;
  rule: string;
  /** How often it came up per game, in your last few games and the few before. */
  recent: number;
  before: number | null;
  games: number;
  lesson?: string;
  puzzles?: PuzzleTheme[];
}

/**
 * The habit to work on: the pattern that cost the most points over your last
 * twelve reviewed games, and how often it came up in the latest six against
 * the six before.
 */
export function focusHabit(all: ReviewedGame[]): Habit | null {
  const list = [...all].sort((a, b) => b.game.createdAt - a.game.createdAt).slice(0, 12);
  if (!list.length) return null;
  const perGame = list.map((g) => lessonsFor(g).lessons.filter((l) => l.theme !== 'positional'));
  const cost = new Map<string, { icon: string; title: string; rule: string; cost: number }>();
  for (const ls of perGame)
    for (const l of ls) {
      const cur = cost.get(l.theme) ?? { icon: l.icon, title: l.title, rule: l.rule, cost: 0 };
      cur.cost += l.cost;
      cost.set(l.theme, cur);
    }
  const top = [...cost.entries()].sort((a, b) => b[1].cost - a[1].cost)[0];
  if (!top) return null;
  const [key, info] = top;
  const count = (games: typeof perGame) =>
    games.reduce((n, ls) => n + ls.filter((l) => l.theme === key).reduce((k, l) => k + Math.max(1, l.plies.length), 0), 0);
  const recent = perGame.slice(0, 6);
  const older = perGame.slice(6);
  return {
    key,
    icon: info.icon,
    title: info.title,
    rule: info.rule,
    recent: count(recent) / recent.length,
    before: older.length >= 3 ? count(older) / older.length : null,
    games: list.length,
    lesson: LESSON_FOR_THEME[key],
    puzzles: PUZZLES_FOR_THEME[key],
  };
}

/** "Getting better", "about the same" or "more often lately", from a habit's numbers. */
export function habitTrend(h: Habit): 'better' | 'same' | 'worse' | null {
  if (h.before === null) return null;
  if (h.recent <= h.before * 0.75) return 'better';
  if (h.recent >= h.before * 1.25 + 0.1) return 'worse';
  return 'same';
}
