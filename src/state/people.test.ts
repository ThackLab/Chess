import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent: { to: string; data: { t: string; code?: string; from: { id: string; name: string } }; retain: boolean }[] = [];
const cleared: string[] = [];
let codes = 0;
vi.mock('../lib/online/relay', async (orig) => {
  const real = await orig<typeof import('../lib/online/relay')>();
  return {
    normaliseCode: real.normaliseCode,
    newCode: () => `GAME${String(codes++).padStart(6, '0')}`,
    relay: {
      send: async (to: string, data: (typeof sent)[number]['data'], retain: boolean) => void sent.push({ to, data, retain }),
      clearInbox: async (id: string) => void cleared.push(id),
      publishState: async () => {},
      onStatus: () => () => {},
      join: async () => () => {},
      inbox: async () => () => {},
      beat: async () => {},
    },
  };
});
vi.mock('../lib/sound', () => ({ playSound: () => {}, soundForSan: () => 'move' }));
vi.mock('../lib/storage/db', () => ({ saveGame: async () => {} }));

const { usePeople, parseNote, INVITE_TTL } = await import('./people');
const { useOnline } = await import('./online');

const ME = 'MEMEMEMEME';
const ALEX = 'A1EX000000';
const from = { id: ALEX, name: 'Alex' };
const invite = (over: Record<string, unknown> = {}) => ({
  v: 1,
  t: 'invite',
  mid: 'm1',
  from,
  code: 'GAMEC0DE00',
  tc: { initial: 600_000, increment: 0 },
  at: Date.now(),
  ...over,
});

describe('friends and invites', () => {
  beforeEach(() => {
    usePeople.setState({ me: ME, people: [], sent: [], done: [], incoming: [], clock: { initial: 600_000, increment: 0 } });
    useOnline.setState({ games: [] });
    sent.length = 0;
    cleared.length = 0;
  });

  it('only takes well-formed, fresh messages', () => {
    expect(parseNote(invite())).not.toBeNull();
    expect(parseNote(invite({ at: Date.now() - INVITE_TTL - 1000 }))).toBeNull();
    expect(parseNote(invite({ code: 'not a code' }))).toBeNull();
    expect(parseNote(invite({ from: { id: 'bad', name: 'x' } }))).toBeNull();
    expect(parseNote(invite({ tc: { initial: -5, increment: 0 } }))).toBeNull();
    expect(parseNote(invite({ t: 'evil' }))).toBeNull();
    expect(parseNote(invite({ tc: null }))).toMatchObject({ tc: null });
    expect(parseNote(invite({ from: { id: ALEX, name: '  ' + 'x'.repeat(60) } }))!.from.name).toHaveLength(24);
    expect(parseNote({ v: 1, t: 'hello', mid: 'h', from, at: Date.now() })).toMatchObject({ t: 'hello' });
  });

  it('adds a friend once and tells them', () => {
    const st = usePeople.getState();
    expect(st.add('a1ex0-00000', 'Alex')).toBe('added');
    expect(usePeople.getState().people.map((p) => p.id)).toEqual([ALEX]);
    expect(sent).toMatchObject([{ to: ALEX, data: { t: 'hello', from: { id: ME } }, retain: false }]);
    expect(st.add(ALEX, '')).toBe('already');
    expect(st.add(ME, 'Me')).toBe('self');
    expect(st.add('nope', 'x')).toBe('invalid');
    expect(sent).toHaveLength(1);
  });

  it('sends an invite with a new live game, kept for a friend who opens the app later', () => {
    const code = usePeople.getState().invite(ALEX);
    expect(useOnline.getState().games.map((g) => g.code)).toEqual([code]);
    expect(sent).toMatchObject([{ to: ALEX, retain: true, data: { t: 'invite', code, from: { id: ME } } }]);
  });

  it('shows an invite once, and accepting adds the sender and empties the inbox', () => {
    const st = usePeople.getState();
    st.receive(invite());
    st.receive(invite()); // the same invite from a second relay
    expect(usePeople.getState().incoming).toHaveLength(1);
    expect(st.accept('m1')).toBe('GAMEC0DE00');
    expect(usePeople.getState().incoming).toHaveLength(0);
    expect(usePeople.getState().people.map((p) => p.name)).toEqual(['Alex']);
    expect(cleared).toEqual([ME]);
    // Delivered again later (it was kept on the relay): already answered.
    st.receive(invite());
    expect(usePeople.getState().incoming).toHaveLength(0);
  });

  it('declining tells the sender, whose waiting game is called off', () => {
    usePeople.getState().receive(invite());
    usePeople.getState().decline('m1');
    expect(sent).toMatchObject([{ to: ALEX, retain: false, data: { t: 'decline', code: 'GAMEC0DE00' } }]);

    // On the sender's side.
    sent.length = 0;
    const code = usePeople.getState().invite(ALEX);
    usePeople.getState().receive({ v: 1, t: 'decline', mid: 'd1', from, code, at: Date.now() });
    expect(useOnline.getState().games[0].s!.t).toBe('aborted');
    expect(usePeople.getState().incoming).toMatchObject([{ t: 'decline' }]);
    // A "decline" for a game we never invited them to is ignored.
    usePeople.getState().receive({ v: 1, t: 'decline', mid: 'd2', from: { id: 'B0B0000000', name: 'Bob' }, code, at: Date.now() });
    expect(usePeople.getState().incoming).toHaveLength(1);
  });

  it('carries avatars, and ignores a profile update from someone who isn’t a friend', () => {
    usePeople.getState().receive(invite({ from: { id: ALEX, name: 'Alex', av: 5000 } }));
    expect(usePeople.getState().incoming[0].from.av).toBe(5000);
    usePeople.getState().accept('m1');
    expect(usePeople.getState().people[0].av).toBe(5000);
    // A new look from a friend is applied quietly.
    usePeople.getState().receive({ v: 1, t: 'hello', upd: true, mid: 'u1', from: { id: ALEX, name: 'Alex', av: 6000 }, at: Date.now() });
    expect(usePeople.getState().people[0].av).toBe(6000);
    expect(usePeople.getState().incoming).toHaveLength(0);
    // From a stranger: no "added you" pop-up.
    usePeople.getState().receive({ v: 1, t: 'hello', upd: true, mid: 'u2', from: { id: 'B0B0000000', name: 'Bob' }, at: Date.now() });
    expect(usePeople.getState().incoming).toHaveLength(0);
    // A photo travels with the avatar, and anything that isn't a small JPEG is dropped.
    const ph = 'data:image/jpeg;base64,AAAA';
    usePeople.getState().receive({ v: 1, t: 'hello', upd: true, mid: 'u3', from: { id: ALEX, name: 'Alex', av: 1, ph }, at: Date.now() });
    expect(usePeople.getState().people[0]).toMatchObject({ av: 1, ph });
    expect(parseNote(invite({ from: { id: ALEX, name: 'Alex', av: 1, ph: 'data:text/html,<b>' } }))!.from.ph).toBeUndefined();
    // Junk avatars are dropped.
    expect(parseNote(invite({ from: { id: ALEX, name: 'Alex', av: 'x' } }))!.from.av).toBeUndefined();
  });

  it('asks to add back someone who added you, and updates known friends silently', () => {
    usePeople.getState().receive({ v: 1, t: 'hello', mid: 'h1', from, at: Date.now() });
    expect(usePeople.getState().incoming).toMatchObject([{ t: 'hello' }]);
    usePeople.setState({ incoming: [], people: [{ id: ALEX, name: 'Old name', addedAt: 0 }] });
    usePeople.getState().receive({ v: 1, t: 'hello', mid: 'h2', from, at: Date.now() });
    expect(usePeople.getState().incoming).toHaveLength(0);
    expect(usePeople.getState().people[0].name).toBe('Alex');
  });
});
