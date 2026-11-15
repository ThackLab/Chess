// Your progress in the London course: your level, how well you know each
// line (spaced repetition, like the opening trainer), the traps you've
// solved, and your games against the coach.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LEARNT_BOX, nextReviewText, type LineProgress } from './repertoire';
import { useLearn } from './learn';

export type LondonLevel = 'beginner' | 'intermediate' | 'advanced';
export const LEVELS: LondonLevel[] = ['beginner', 'intermediate', 'advanced'];
export const LEVEL_NAME: Record<LondonLevel, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

const DAY = 86_400_000;
const INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY, 80 * DAY];

/** The bot you play in "Play the coach" at each level, as an Elo. */
export const DEFAULT_BOT_ELO: Record<LondonLevel, number> = { beginner: 400, intermediate: 900, advanced: 1400 };

export interface TrapProgress {
  solved: number;
  tries: number;
  /** Solved on the first try last time. */
  clean: boolean;
}

export interface GameTally {
  played: number;
  won: number;
  drawn: number;
  lost: number;
}

interface LondonState {
  level: LondonLevel;
  lines: Record<string, LineProgress>;
  traps: Record<string, TrapProgress>;
  /** Clean lines in a row in drills. */
  streak: number;
  bestStreak: number;
  games: GameTally;
  botElo: Record<LondonLevel, number>;
  setLevel: (l: LondonLevel) => void;
  setBotElo: (l: LondonLevel, elo: number) => void;
  /** Records a run through a line; `clean` means no wrong moves. */
  grade: (lineId: string, clean: boolean) => LineProgress;
  trapResult: (id: string, firstTry: boolean) => void;
  gameResult: (r: 'won' | 'drawn' | 'lost') => void;
}

export const useLondon = create<LondonState>()(
  persist(
    (set, get) => ({
      level: 'beginner',
      lines: {},
      traps: {},
      streak: 0,
      bestStreak: 0,
      games: { played: 0, won: 0, drawn: 0, lost: 0 },
      botElo: { ...DEFAULT_BOT_ELO },
      setLevel: (level) => set({ level }),
      setBotElo: (l, elo) => set((s) => ({ botElo: { ...s.botElo, [l]: Math.max(100, Math.min(2000, Math.round(elo / 50) * 50)) } })),
      grade: (lineId, clean) => {
        const cur = get().lines[lineId] ?? { box: 0, due: 0, runs: 0, misses: 0 };
        const box = clean ? Math.min(INTERVALS.length - 1, cur.box + 1) : Math.max(0, cur.box - 2);
        const next: LineProgress = {
          box,
          due: Date.now() + (clean ? INTERVALS[box] : 10 * 60_000),
          runs: cur.runs + 1,
          misses: cur.misses + (clean ? 0 : 1),
        };
        set((s) => {
          const streak = clean ? s.streak + 1 : 0;
          return { lines: { ...s.lines, [lineId]: next }, streak, bestStreak: Math.max(s.bestStreak, streak) };
        });
        useLearn.getState().noteOpening();
        return next;
      },
      trapResult: (id, firstTry) =>
        set((s) => {
          const cur = s.traps[id] ?? { solved: 0, tries: 0, clean: false };
          return { traps: { ...s.traps, [id]: { solved: cur.solved + 1, tries: cur.tries + 1, clean: firstTry } } };
        }),
      gameResult: (r) => set((s) => ({ games: { ...s.games, played: s.games.played + 1, [r]: s.games[r] + 1 } })),
    }),
    { name: 'grandmasters.london', version: 1 },
  ),
);

export const isLearnt = (p?: LineProgress) => (p?.box ?? 0) >= LEARNT_BOX;
export { nextReviewText };
