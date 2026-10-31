// The coach watches your games: the ones you play here, and (with a
// chess.com username) the ones you play on chess.com, which it fetches when
// the app opens, saves and reviews in the background. It remembers which
// games you have gone over with it.
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchChessCom, toRecord } from '../lib/importGames';
import { getGame, listGames, onDbChange, saveGame, type GameRecord } from '../lib/storage/db';
import { useReviewer } from './reviewer';

/** How often the app may look for new chess.com games on its own. */
const SYNC_EVERY = 10 * 60_000;
/** The first look only brings in the latest few games, not the whole history. */
const FIRST_SYNC_GAMES = 5;
const MAX_PER_SYNC = 12;

interface CoachState {
  /** The chess.com account to watch ('' for none). */
  chesscom: string;
  /** When the coach started (games before then are history, not "new"). */
  since: number;
  lastSync: number;
  lastError: string;
  /** How many games the last look brought in. */
  lastNew: number;
  syncing: boolean;
  /** Games you have gone over with the coach, and when. */
  debriefed: Record<string, number>;
  setChessCom: (name: string) => void;
  markDebriefed: (id: string) => void;
  /** Looks for new chess.com games (at most every ten minutes unless forced). */
  sync: (force?: boolean) => Promise<number>;
}

export const useCoach = create<CoachState>()(
  persist(
    (set, get) => ({
      chesscom: '',
      since: Date.now(),
      lastSync: 0,
      lastError: '',
      lastNew: 0,
      syncing: false,
      debriefed: {},
      setChessCom: (name) => set({ chesscom: name.trim(), lastSync: 0, lastError: '' }),
      markDebriefed: (id) => set((s) => ({ debriefed: { ...s.debriefed, [id]: Date.now() } })),
      sync: async (force = false) => {
        const s = get();
        if (!s.chesscom || s.syncing) return 0;
        if (!force && Date.now() - s.lastSync < SYNC_EVERY) return 0;
        set({ syncing: true, lastError: '' });
        try {
          const first = s.lastSync === 0;
          const found = await fetchChessCom(s.chesscom, first ? 1 : 2, first ? FIRST_SYNC_GAMES : MAX_PER_SYNC * 2);
          const fresh = [];
          for (const c of found) {
            const rec = toRecord(c, s.chesscom);
            if (!rec || !rec.userColor) continue;
            if (await getGame(rec.id)) continue;
            fresh.push(rec);
            if (fresh.length >= (first ? FIRST_SYNC_GAMES : MAX_PER_SYNC)) break;
          }
          for (const rec of fresh) await saveGame(rec);
          set({
            lastSync: Date.now(),
            lastNew: fresh.length,
            syncing: false,
            since: first ? Math.min(s.since, ...fresh.map((g) => g.createdAt)) : s.since,
          });
          // Review them one at a time, newest first, without holding anything up.
          void (async () => {
            for (const rec of fresh) {
              try {
                await useReviewer.getState().start(rec.id);
              } catch {
                /* a game that can't be reviewed is skipped */
              }
            }
          })();
          return fresh.length;
        } catch (e) {
          set({ syncing: false, lastError: e instanceof Error ? e.message : String(e), lastSync: Date.now() });
          return 0;
        }
      },
    }),
    {
      name: 'grandmasters.coach',
      version: 1,
      partialize: (s) => ({ chesscom: s.chesscom, since: s.since, lastSync: s.lastSync, lastNew: s.lastNew, debriefed: s.debriefed }),
    },
  ),
);

/** Looks for new games when the app opens and whenever it comes back to the front. */
export function watchForGames() {
  const look = () => void useCoach.getState().sync();
  look();
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && look());
}

/** Your games since the coach started that you haven't gone over yet, newest first. */
export function useGamesToDebrief(): GameRecord[] {
  const since = useCoach((s) => s.since);
  const debriefed = useCoach((s) => s.debriefed);
  const [list, setList] = useState<GameRecord[]>([]);
  useEffect(() => {
    const load = () =>
      void listGames().then((all) =>
        setList(all.filter((g) => g.userColor && g.moves.length >= 6 && g.createdAt >= since && !debriefed[g.id] && g.reviewedAt)),
      );
    load();
    return onDbChange(load);
  }, [since, debriefed]);
  return list;
}

export const useToDebrief = () => useGamesToDebrief().length;
