// Friends: people you've added (nearby over Bluetooth, by link or by friend
// code) and can invite to a live game with one tap. Each player has a friend
// code, and an inbox on the relay named after it (src/lib/online/relay.ts):
// invites travel there, encrypted, and pop up on the friend's screen.
import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { newCode, normaliseCode, relay } from '../lib/online/relay';
import { useOnline, type Clock } from './online';
import { useSettings } from './settings';

export interface Person {
  id: string;
  name: string;
  addedAt: number;
}

interface From {
  id: string;
  name: string;
}

/** What travels through an inbox. */
export type Note =
  | { v: 1; t: 'invite'; mid: string; from: From; code: string; tc: Clock | null; at: number }
  /** "I added you as a friend." */
  | { v: 1; t: 'hello'; mid: string; from: From; at: number }
  /** "Can't play right now", in answer to an invite. */
  | { v: 1; t: 'decline'; mid: string; from: From; code: string; at: number };

/** How long an invite stays good. */
export const INVITE_TTL = 15 * 60_000;
const MAX_NAME = 24;

const isCode = (x: unknown): x is string => typeof x === 'string' && normaliseCode(x) === x;

/** Checks a message from the relay; null unless it is well formed and fresh. */
export function parseNote(x: unknown, now = Date.now()): Note | null {
  const n = x as Partial<Record<string, unknown>> | null;
  if (!n || typeof n !== 'object' || n.v !== 1 || typeof n.mid !== 'string' || typeof n.at !== 'number') return null;
  if (n.at < now - INVITE_TTL || n.at > now + 2 * 60_000) return null;
  const f = n.from as Partial<From> | undefined;
  if (!f || !isCode(f.id) || typeof f.name !== 'string') return null;
  const base = { v: 1 as const, mid: n.mid.slice(0, 16), from: { id: f.id, name: f.name.trim().slice(0, MAX_NAME) || 'Player' }, at: n.at };
  if (n.t === 'hello') return { ...base, t: 'hello' };
  if (!isCode(n.code)) return null;
  if (n.t === 'decline') return { ...base, t: 'decline', code: n.code };
  if (n.t !== 'invite') return null;
  const tc = n.tc as Clock | null | undefined;
  if (tc === null) return { ...base, t: 'invite', code: n.code, tc: null };
  const ok =
    !!tc &&
    Number.isFinite(tc.initial) &&
    Number.isFinite(tc.increment) &&
    tc.initial > 0 &&
    tc.initial <= 3 * 3_600_000 &&
    tc.increment >= 0 &&
    tc.increment <= 60_000;
  return ok ? { ...base, t: 'invite', code: n.code, tc: { initial: tc.initial, increment: tc.increment } } : null;
}

const myName = () => {
  const n = useSettings.getState().playerName;
  return n && n !== 'You' ? n : '';
};

interface PeopleStore {
  /** This player's friend code; made the first time friends are used. */
  me: string | null;
  people: Person[];
  /** The clock for invites. */
  clock: Clock | null;
  /** Invites this device sent, to match a "can't play right now" with its game. */
  sent: { code: string; to: string; at: number }[];
  /** Messages already answered, so a kept invite doesn't pop up again. */
  done: string[];
  /** Messages waiting on screen, oldest first (not saved). */
  incoming: Note[];
  ensureMe: () => string;
  /** Adds a friend and lets them know. */
  add: (id: string, name: string) => 'added' | 'already' | 'self' | 'invalid';
  remove: (id: string) => void;
  setClock: (tc: Clock | null) => void;
  /** Creates a live game and invites a friend to it; returns the game's code. */
  invite: (id: string) => string;
  receive: (data: unknown) => void;
  /** Takes an invite; returns the game's code to open. */
  accept: (mid: string) => string | null;
  decline: (mid: string) => void;
  /** Closes a message without answering. */
  dismiss: (mid: string) => void;
}

export const usePeople = create<PeopleStore>()(
  persist(
    (set, get) => {
      const close = (mid: string) =>
        set((st) => ({ incoming: st.incoming.filter((n) => n.mid !== mid), done: [...st.done.filter((d) => d !== mid), mid].slice(-200) }));
      const from = (): From => ({ id: get().ensureMe(), name: myName() || 'Player' });
      return {
        me: null,
        people: [],
        clock: { initial: 600_000, increment: 0 },
        sent: [],
        done: [],
        incoming: [],
        ensureMe: () => {
          const me = get().me;
          if (me) return me;
          const id = newCode();
          set({ me: id });
          return id;
        },
        add: (raw, name) => {
          const id = normaliseCode(raw);
          if (!id) return 'invalid';
          if (id === get().ensureMe()) return 'self';
          const clean = name.trim().slice(0, MAX_NAME);
          if (get().people.some((p) => p.id === id)) {
            if (clean) set((st) => ({ people: st.people.map((p) => (p.id === id ? { ...p, name: clean } : p)) }));
            return 'already';
          }
          set((st) => ({ people: [...st.people, { id, name: clean || 'Friend', addedAt: Date.now() }] }));
          void relay.send(id, { v: 1, t: 'hello', mid: newCode(), from: from(), at: Date.now() }, false);
          return 'added';
        },
        remove: (id) => set((st) => ({ people: st.people.filter((p) => p.id !== id) })),
        setClock: (clock) => set({ clock }),
        invite: (id) => {
          const me = from();
          const tc = get().clock;
          const code = useOnline.getState().create({ tc, color: 'random', name: me.name });
          void relay.send(id, { v: 1, t: 'invite', mid: newCode(), from: me, code, tc, at: Date.now() }, true);
          set((st) => ({ sent: [...st.sent, { code, to: id, at: Date.now() }].slice(-20) }));
          return code;
        },
        receive: (data) => {
          const n = parseNote(data);
          const st = get();
          if (!n || n.from.id === st.me || st.done.includes(n.mid) || st.incoming.some((x) => x.mid === n.mid)) return;
          const known = st.people.find((p) => p.id === n.from.id);
          if (known && known.name !== n.from.name) {
            set((s) => ({ people: s.people.map((p) => (p.id === known.id ? { ...p, name: n.from.name } : p)) }));
          }
          if (n.t === 'hello' && known) return close(n.mid);
          if (n.t === 'decline') {
            if (!st.sent.some((x) => x.code === n.code && x.to === n.from.id)) return close(n.mid);
            useOnline.getState().abort(n.code);
          }
          // An invite to a game this device already plays in (the same invite again, from another relay).
          if (n.t === 'invite' && useOnline.getState().games.some((g) => g.code === n.code && g.me !== undefined)) return close(n.mid);
          set((s) => ({ incoming: [...s.incoming, n] }));
        },
        accept: (mid) => {
          const n = get().incoming.find((x) => x.mid === mid);
          if (!n || n.t !== 'invite') return null;
          close(mid);
          if (!get().people.some((p) => p.id === n.from.id)) {
            set((st) => ({ people: [...st.people, { id: n.from.id, name: n.from.name, addedAt: Date.now() }] }));
          }
          void relay.clearInbox(get().ensureMe());
          return n.code;
        },
        decline: (mid) => {
          const n = get().incoming.find((x) => x.mid === mid);
          if (!n) return;
          close(mid);
          if (n.t !== 'invite') return;
          void relay.send(n.from.id, { v: 1, t: 'decline', mid: newCode(), from: from(), code: n.code, at: Date.now() }, false);
          void relay.clearInbox(get().ensureMe());
        },
        dismiss: close,
      };
    },
    {
      name: 'grandmasters.people',
      version: 1,
      partialize: ({ me, people, clock, sent, done }) => ({ me, people, clock, sent, done }),
    },
  ),
);

/** Listens to this player's inbox while the app is open. Mounted once, in App. */
export function useInboxSync() {
  const me = usePeople((s) => s.me);
  useEffect(() => {
    if (!me) return;
    const off = relay.inbox(me, (kind, data) => {
      if (kind === 'inbox') usePeople.getState().receive(data);
    });
    return () => void off.then((f) => f());
  }, [me]);
}
