// Lines of moves told as a story, for the coach's "show me": a caption for
// each move ("Their knight forks the king and rook"), the squares that
// matter, and what the line comes to in the end ("you lose a rook").
import { Chess, type Color, type Square } from 'chess.js';
import { PIECE_NAME, playUci } from '../chess/utils';
import { describeMaterial, lineMaterial, moveMotifs } from '../chess/tactics';
import { scoreToCp } from '../engine/uci';
import { standing } from '../review/explain';
import { expectedFor } from '../review/winprob';
import type { EngineLine, GameReview } from '../review/types';

export interface StoryStep {
  uci: string;
  san: string;
  /** Whose move it is, from your side. */
  mine: boolean;
  caption: string;
  /** Squares the move is about (the pieces it hits, the square it lands on). */
  squares: Square[];
}

export interface Story {
  base: string;
  steps: StoryStep[];
  /** What the line comes to, from your side. */
  outcome: string;
}

/** One move in words, with the mover as "Your"/"Their" piece. */
export function captionMove(
  fenBefore: string,
  uci: string,
  you: Color,
  recaptureSquare?: string,
): { caption: string; san: string; squares: Square[] } {
  const c = new Chess(fenBefore);
  const mover = c.turn();
  const m = playUci(c, uci);
  if (!m) return { caption: uci, san: uci, squares: [] };
  const owner = mover === you ? 'Your' : 'Their';
  const piece = PIECE_NAME[m.piece];
  const motif = moveMotifs(fenBefore, uci, recaptureSquare)[0];
  const squares = [...new Set([m.to, ...(motif?.squares ?? [])])] as Square[];
  if (m.isKingsideCastle() || m.isQueensideCastle())
    return { caption: `${mover === you ? 'You castle' : 'They castle'}: the king tucks away behind its pawns.`, san: m.san, squares };
  let text: string;
  if (!motif) text = m.captured ? `takes the ${PIECE_NAME[m.captured]} on ${m.to}` : `goes to ${m.to}`;
  else if (motif.kind === 'develops') text = 'comes into play';
  else if (motif.kind === 'escapes') text = 'steps out of danger';
  else if (motif.kind === 'centre') text = `takes the centre square ${m.to}`;
  else text = motif.text;
  const check = c.isCheckmate() ? '' : c.inCheck() && !/check/.test(text) ? ', with check' : '';
  return { caption: `${owner} ${piece} ${text}${check}.`, san: m.san, squares };
}

/** A line of moves from `base`, told from `you`'s side, at most `max` moves. */
export function storyOf(base: string, line: string[], you: Color, max = 6, endScore?: EngineLine['score']): Story {
  const c = new Chess(base);
  const steps: StoryStep[] = [];
  let lastCapture: string | undefined;
  for (const uci of line.slice(0, max)) {
    const fen = c.fen();
    const mine = c.turn() === you;
    const { caption, san, squares } = captionMove(fen, uci, you, lastCapture);
    const m = playUci(c, uci);
    if (!m) break;
    lastCapture = m.captured ? m.to : undefined;
    steps.push({ uci, san, mine, caption, squares });
    if (c.isGameOver()) break;
  }
  // The outcome looks further than the steps shown, so a trade still going on at the last step isn't counted as a loss.
  return { base, steps, outcome: outcomeOf(base, line.slice(0, 12), you, endScore) };
}

/** What a line comes to: checkmate, material won or lost, or how the position stands. */
export function outcomeOf(base: string, line: string[], you: Color, endScore?: EngineLine['score']): string {
  const c = new Chess(base);
  for (const u of line) if (!playUci(c, u)) break;
  if (c.isCheckmate()) return c.turn() === you ? 'It ends in checkmate: you lose.' : 'It ends in checkmate: you win.';
  const mat = lineMaterial(base, line, you, line.length);
  const ep = endScore ? expectedFor(endScore, you) : null;
  const where = ep !== null ? standing(ep) : null;
  // A pawn either way matters less than where you stand, so say that first;
  // and when the count disagrees with the engine (a line that stops in the
  // middle of a trade, or a sacrifice), go by the engine.
  const contradicts = ep !== null && ((mat.delta <= -2 && ep >= 0.5) || (mat.delta >= 2 && ep <= 0.5));
  if (where && contradicts) return `You end up ${where}.`;
  if (Math.abs(mat.delta) < 2 && where) return `You end up ${where}${mat.delta >= 1 ? ', a pawn up' : mat.delta <= -1 ? ', a pawn down' : ''}.`;
  if (mat.delta <= -1)
    return `In the end you lose ${describeMaterial(mat.delta, mat.wonPieces, mat.lostPieces)}${where ? ` and you're ${where}` : ''}.`;
  if (mat.delta >= 1)
    return `In the end you win ${describeMaterial(mat.delta, mat.wonPieces, mat.lostPieces)}${where ? ` and you're ${where}` : ''}.`;
  return 'Material stays level.';
}

export interface Variation {
  key: 'played' | 'best' | 'alt';
  /** "What happened", "The better move", "Another idea". */
  label: string;
  /** The move it starts with, for the title. */
  san: string;
  story: Story;
  /** For other ideas: how it compares with the best. */
  verdict?: string;
}

/** The lines worth seeing at one of your moves: what you played, the best move, and other moves you might have tried. */
export function momentVariations(review: GameReview, ply: number, you: Color): Variation[] {
  const m = review.moves[ply];
  const before = review.positions[ply];
  const after = review.positions[ply + 1];
  const out: Variation[] = [];
  const best = before?.lines[0];
  const reply = after?.lines[0]?.pv ?? [];
  if (m.uci !== best?.pv[0]) {
    out.push({ key: 'played', label: 'What happened', san: m.san, story: storyOf(m.fenBefore, [m.uci, ...reply], you, 5, after?.lines[0]?.score) });
  }
  if (best?.pv.length)
    out.push({
      key: 'best',
      label: m.uci === best.pv[0] ? 'Your move' : 'The better move',
      san: m.bestSan ?? best.pv[0],
      story: storyOf(m.fenBefore, best.pv, you, 5, best.score),
    });
  const bestCp = best ? scoreToCp(best.score) * (you === 'w' ? 1 : -1) : 0;
  for (const l of before?.lines.slice(1, 3) ?? []) {
    const first = l.pv[0];
    if (!first || first === m.uci || first === best?.pv[0]) continue;
    const cp = scoreToCp(l.score) * (you === 'w' ? 1 : -1);
    const story = storyOf(m.fenBefore, l.pv, you, 5, l.score);
    out.push({
      key: 'alt',
      label: 'Another idea',
      san: story.steps[0]?.san ?? first,
      story,
      verdict: bestCp - cp <= 40 ? 'also good' : 'not quite as good',
    });
  }
  return out;
}
