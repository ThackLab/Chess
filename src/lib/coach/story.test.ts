import { describe, expect, it } from 'vitest';
import { captionMove, outcomeOf, storyOf } from './story';

describe('show-me stories', () => {
  it('says what each move does, from your side', () => {
    // White's knight jumps to c7, forking Black's king and rook.
    const fen = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1';
    const fork = captionMove(fen, 'b5c7', 'b');
    expect(fork.caption).toMatch(/^Their knight forks the (king and rook|rook and king)/);
    expect(fork.squares).toEqual(expect.arrayContaining(['c7', 'e8', 'a8']));
    expect(captionMove(fen, 'b5c7', 'w').caption).toMatch(/^Your knight forks/);
    expect(captionMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'g1f3', 'w').caption).toBe('Your knight comes into play.');
  });

  it('tells how a line ends', () => {
    // Scholar's mate from Black's side.
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
    expect(outcomeOf(fen, ['h5f7'], 'b')).toBe('It ends in checkmate: you lose.');
    const s = storyOf(fen, ['h5f7'], 'b');
    expect(s.steps[0].caption).toMatch(/^Their queen delivers checkmate/);
    // A pawn takes a queen that was left on d5.
    expect(outcomeOf('4k3/8/8/3q4/4P3/8/8/4K3 w - - 0 1', ['e4d5'], 'w')).toBe('In the end you win a queen.');
    expect(outcomeOf('4k3/8/8/3q4/4P3/8/8/4K3 w - - 0 1', ['e4d5'], 'b')).toBe('In the end you lose a queen.');
    // A count that disagrees with the engine goes by the engine.
    expect(outcomeOf('4k3/8/8/3q4/4P3/8/8/4K3 w - - 0 1', ['e4d5'], 'b', { type: 'cp', value: -150 })).toBe('You end up slightly better.');
  });
});
