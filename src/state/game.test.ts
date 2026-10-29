import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';

vi.mock('../lib/storage/db', () => ({ saveGame: async () => {}, newId: () => 'game-1' }));

const { canMate, ruleResult, useLiveGame, chessOf } = await import('./game');

describe('the rules', () => {
  it('ends games by the rules', () => {
    expect(ruleResult(new Chess('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1'))).toEqual({ result: '1-0', termination: 'checkmate' });
    expect(ruleResult(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toEqual({ result: '1/2-1/2', termination: 'stalemate' });
    expect(ruleResult(new Chess('7k/8/6K1/8/8/8/8/6N1 b - - 0 1'))?.termination).toBe('insufficient material');
    expect(ruleResult(new Chess('7k/8/6K1/8/8/8/8/R7 b - - 100 80'))?.termination).toBe('50-move rule');
    const c = new Chess();
    for (const m of ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']) c.move(m);
    expect(ruleResult(c)?.termination).toBe('threefold repetition');
    expect(ruleResult(new Chess())).toBeNull();
  });

  it('knows who can still mate when a flag falls', () => {
    expect(canMate(new Chess('7k/8/6K1/8/8/8/8/R7 w - - 0 1'), 'w')).toBe(true);
    expect(canMate(new Chess('7k/8/6K1/8/8/8/8/6N1 w - - 0 1'), 'w')).toBe(false); // lone knight, bare king
    expect(canMate(new Chess('7k/7p/6K1/8/8/8/8/6N1 w - - 0 1'), 'w')).toBe(true); // the pawn can block its own king in
    expect(canMate(new Chess('7k/8/6K1/8/8/8/8/5B2 w - - 0 1'), 'w')).toBe(false);
    expect(canMate(new Chess('7k/8/6K1/8/8/8/8/4BB2 w - - 0 1'), 'w')).toBe(true); // bishops on both colours
    expect(canMate(new Chess('7k/8/6K1/8/8/8/1B6/4B3 w - - 0 1'), 'w')).toBe(false); // b2 and e1: both on dark squares
    expect(canMate(new Chess('7k/8/6K1/8/8/8/8/8 w - - 0 1'), 'w')).toBe(false);
  });
});

describe('a game against a bot', () => {
  beforeEach(() => useLiveGame.setState({ game: null }));
  const start = (tc: { initial: number; increment: number } | null) =>
    useLiveGame.getState().start({ botId: 'hugo', userColor: 'w', timeControl: tc, takebacks: true, hints: false, evalBar: false });

  it('rejects illegal moves and moves after the game is over', () => {
    start(null);
    const st = useLiveGame.getState();
    expect(st.applyMove('e2e5')).toBe(false);
    expect(st.applyMove('e2e4')).toBe(true);
    expect(st.applyMove('e2e4')).toBe(false);
    st.finish('0-1', 'resignation');
    expect(useLiveGame.getState().applyMove('e7e5')).toBe(false);
  });

  it('ends the game on time instead of taking a move made after the flag fell', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    start({ initial: 60_000, increment: 0 });
    const st = useLiveGame.getState();
    st.applyMove('e2e4');
    st.applyMove('e7e5');
    vi.setSystemTime(1_000_000 + 61_000);
    expect(useLiveGame.getState().applyMove('g1f3')).toBe(false);
    const g = useLiveGame.getState().game!;
    expect(g.status).toBe('over');
    expect(g.result).toBe('0-1');
    expect(g.termination).toBe('timeout');
    vi.useRealTimers();
  });

  it('puts the clocks back on a takeback', () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000_000);
    start({ initial: 60_000, increment: 2000 });
    const st = useLiveGame.getState();
    st.applyMove('e2e4');
    st.applyMove('e7e5');
    vi.setSystemTime(2_010_000);
    st.applyMove('g1f3'); // White spends 10 s, gets 2 s back: 52 s
    vi.setSystemTime(2_015_000);
    st.applyMove('b8c6'); // Black spends 5 s: 57 s
    expect(useLiveGame.getState().game!.clocks).toEqual({ w: 52_000, b: 57_000 });
    useLiveGame.getState().takeback(); // back to White's move after 1...e5
    const g = useLiveGame.getState().game!;
    expect(g.moves).toEqual(['e2e4', 'e7e5']);
    expect(g.clocks).toEqual({ w: 60_000, b: 60_000 });
    expect(chessOf(g).turn()).toBe('w');
    vi.useRealTimers();
  });
});
