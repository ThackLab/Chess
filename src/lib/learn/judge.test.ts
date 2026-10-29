import { describe, expect, it } from 'vitest';
import { acceptsAlternative } from './judge';

const cp = (value: number) => ({ type: 'cp' as const, value });
const mate = (value: number) => ({ type: 'mate' as const, value });

describe('accepting a move that is not the answer', () => {
  it('accepts any checkmate', () => {
    expect(acceptsAlternative({ solver: 'w', mine: null, best: null, mates: true, firstMove: true })).toBe(true);
  });
  it('accepts only checkmate when the answer is checkmate', () => {
    expect(acceptsAlternative({ solver: 'w', mine: mate(1), best: null, mates: false, answerMates: true, firstMove: true })).toBe(false);
  });
  it('needs a mate at least as fast when the answer mates', () => {
    expect(acceptsAlternative({ solver: 'w', mine: mate(2), best: mate(2), mates: false, firstMove: false })).toBe(true);
    expect(acceptsAlternative({ solver: 'w', mine: mate(3), best: mate(2), mates: false, firstMove: false })).toBe(false);
    // Winning a queen instead of mating is wrong, however winning it is.
    expect(acceptsAlternative({ solver: 'w', mine: cp(1500), best: mate(2), mates: false, firstMove: false })).toBe(false);
    // Black to move: mates are negative from White's point of view.
    expect(acceptsAlternative({ solver: 'b', mine: mate(-1), best: mate(-1), mates: false, firstMove: true })).toBe(true);
    expect(acceptsAlternative({ solver: 'b', mine: cp(-900), best: mate(-1), mates: false, firstMove: true })).toBe(false);
  });
  it('rejects moves that miss the tactic even when the position stays winning', () => {
    // +12 instead of +14: expected points barely differ, centipawns do.
    expect(acceptsAlternative({ solver: 'w', mine: cp(1200), best: cp(1400), mates: false, firstMove: false })).toBe(false);
    expect(acceptsAlternative({ solver: 'w', mine: cp(500), best: cp(900), mates: false, firstMove: true })).toBe(false);
  });
  it('accepts an equally good move', () => {
    expect(acceptsAlternative({ solver: 'w', mine: cp(310), best: cp(330), mates: false, firstMove: true })).toBe(true);
    expect(acceptsAlternative({ solver: 'b', mine: cp(-310), best: cp(-330), mates: false, firstMove: true })).toBe(true);
  });
  it('rejects a move that gets the solver mated', () => {
    expect(acceptsAlternative({ solver: 'w', mine: mate(-3), best: cp(50), mates: false, firstMove: true })).toBe(false);
  });
});
