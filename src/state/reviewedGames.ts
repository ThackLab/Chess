// Your reviewed games (where you played one side), kept up to date as games are saved and reviewed.
import { useEffect, useState } from 'react';
import type { ReviewedGame } from '../lib/insights';
import { getReview, listGames, onDbChange } from '../lib/storage/db';

export function useReviewedGames(): ReviewedGame[] | null {
  const [list, setList] = useState<ReviewedGame[] | null>(null);
  useEffect(() => {
    const load = async () => {
      const games = (await listGames()).filter((g) => g.userColor && g.reviewedAt);
      const out: ReviewedGame[] = [];
      for (const game of games) {
        const review = await getReview(game.id);
        if (review) out.push({ game, review, color: game.userColor! });
      }
      setList(out);
    };
    void load();
    return onDbChange(() => void load());
  }, []);
  return list;
}
