// The people you play: from live games and games by link, newest first, one
// entry per opponent.
import { useMemo } from 'react';
import { useFriends, turnOf } from './friend';
import { avatarOf, useOnline } from './online';
import { usePeople } from './people';

export interface Opponent {
  key: string;
  name: string;
  av?: number;
  ph?: string;
  /** Where tapping the card goes. */
  href: string;
  status: string;
  yourMove: boolean;
  /** A game with them is still going. */
  active: boolean;
  at: number;
}

export function useOpponents(): Opponent[] {
  const online = useOnline((s) => s.games);
  const friends = useFriends((s) => s.games);
  const people = usePeople((s) => s.people);
  return useMemo(() => {
    // Games by link carry no avatar: use the friend's, if they're one.
    const byName = new Map(people.map((p) => [p.name.toLowerCase(), p]));
    const out = new Map<string, Opponent>();
    const add = (o: Opponent) => {
      const k = o.name.toLowerCase();
      const cur = out.get(k);
      // Keep the game that needs you, else the most recent one.
      if (!cur || (o.yourMove && !cur.yourMove) || (o.yourMove === cur.yourMove && o.at > cur.at)) out.set(k, o);
    };
    for (const g of online) {
      if (!g.s || !g.me) continue;
      const them = g.me === 'w' ? g.s.b : g.s.w;
      if (!them) continue;
      const toMove = g.s.m.length % 2 === 0 ? 'w' : 'b';
      const yourMove = !g.s.r && toMove === g.me;
      const rematchForYou = !!g.s.r && !!g.s.re && g.s.reBy !== g.me;
      add({
        key: `o-${g.code}`,
        name: them,
        av: avatarOf(g.s, g.me === 'w' ? 'b' : 'w') ?? byName.get(them.toLowerCase())?.av,
        ph: g.ph?.[g.me === 'w' ? 'b' : 'w'] ?? byName.get(them.toLowerCase())?.ph,
        href: `/online/${g.code}`,
        status: rematchForYou ? 'Wants a rematch' : g.s.r ? 'Game over' : yourMove ? 'Your move' : 'Their move',
        yourMove: yourMove || rematchForYou,
        active: !g.s.r,
        at: g.createdAt,
      });
    }
    for (const g of friends) {
      if (g.mode !== 'link' || !g.me) continue;
      const them = g.me === 'w' ? g.black : g.white;
      const yourMove = !g.result && turnOf(g) === g.me;
      add({
        key: `f-${g.id}`,
        name: them,
        av: byName.get(them.toLowerCase())?.av,
        ph: byName.get(them.toLowerCase())?.ph,
        href: `/friend/${g.id}`,
        status: g.result ? 'Game over' : yourMove ? 'Your move (by link)' : 'Their move (by link)',
        yourMove,
        active: !g.result,
        at: g.updatedAt,
      });
    }
    return [...out.values()].sort((a, b) => Number(b.yourMove) - Number(a.yourMove) || b.at - a.at);
  }, [online, friends, people]);
}
