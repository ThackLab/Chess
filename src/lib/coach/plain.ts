// Moves and mistakes in plain words, for the talking coach: "their knight
// takes your bishop", "that lets their queen fork your king and rook". No
// notation and no square names; the board shows where with arrows.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_NAME, PIECE_VALUE, playUci } from '../chess/utils';
import { describeMaterial, hangingPieces, lineMaterial, moveMotifs } from '../chess/tactics';
import { expectedFor } from '../review/winprob';
import type { PositionEval } from '../review/types';

const name = (t: PieceSymbol) => PIECE_NAME[t];

/** "your" or "their", from the point of view of `you`. */
const owner = (c: Color, you: Color) => (c === you ? 'your' : 'their');

const HOME: Partial<Record<string, string>> = {
  b1: 'n',
  g1: 'n',
  c1: 'b',
  f1: 'b',
  d1: 'q',
  b8: 'n',
  g8: 'n',
  c8: 'b',
  f8: 'b',
  d8: 'q',
};

/**
 * A motif from the tactics finder in plain words, aimed at `target`'s
 * pieces ("forks your king and rook"), without square names.
 */
function motifPhrase(text: string, targetOwner: string): string {
  return text
    .replace(/\s+on [a-h][1-8]\b/g, '')
    .replace(/\s+with [^\s,.]+/g, (m) => (/check$/.test(m) ? m : ''))
    .replace(/\bthe (king|queen|rook|bishop|knight|pawn)/g, `${targetOwner} $1`)
    .trim();
}

/**
 * One move in words: "their knight takes your bishop, with check". With
 * `base`, the verb is in the form that follows "lets" or "could"
 * ("that lets their knight take your bishop").
 */
export function describeMove(fen: string, uci: string, you: Color, base = false): string {
  const c = new Chess(fen);
  const m = playUci(c, uci);
  if (!m) return '';
  const mine = owner(m.color, you);
  const theirs = owner(m.color === 'w' ? 'b' : 'w', you);
  const who = m.color === you ? 'you' : 'they';
  // Third person ("takes") unless it follows "lets" or the subject is you/they.
  const v = (verb: string, third: string) => (base ? verb : third);
  let s: string;
  if (m.san.startsWith('O-O')) s = `${who} castle`;
  else if (m.captured) s = `${mine} ${name(m.piece)} ${v('take', 'takes')} ${theirs} ${name(m.captured)}`;
  else if (m.promotion) s = `${mine} pawn ${v('become', 'becomes')} a ${name(m.promotion)}`;
  else if (m.piece === 'p') s = `${mine} pawn ${v('move', 'moves')} up`;
  else if (HOME[m.from] === m.piece) s = `${mine} ${name(m.piece)} ${v('come', 'comes')} out`;
  else s = `${mine} ${name(m.piece)} ${v('move', 'moves')}`;
  if (c.isCheckmate()) return `${s}, and that's checkmate`;
  const motifs = moveMotifs(fen, uci).filter((x) => ['fork', 'pin', 'skewer', 'discovered', 'discoveredCheck', 'threatensMate'].includes(x.kind));
  if (motifs.length) {
    const target = m.color === you ? 'their' : 'your';
    let phrase = motifPhrase(motifs[0].text, target);
    if (base)
      phrase = phrase.replace(/^(\w+?)(e?s)\b/, (_w, stem: string, end: string) =>
        end === 'es' && /(sh|ch|x|ss)$/.test(stem) ? stem : stem + (end === 'es' ? 'e' : ''),
      );
    return `${s} and ${phrase}`;
  }
  if (c.inCheck()) return `${s}, with check`;
  return s;
}

/** Arrow for a move in the curriculum's format ("r:e2e4"). */
export const arrow = (uci: string, brush: 'g' | 'r' | 'b' | 'y' = 'g') => (brush === 'g' ? uci.slice(0, 4) : `${brush}:${uci.slice(0, 4)}`);

export interface PlainNote {
  text: string;
  arrows: string[];
}

/**
 * Why a move just played by `color` is a mistake, from the engine's view of
 * the position before and after it: what the opponent's best reply does and
 * what it costs.
 */
export function plainWarning(before: PositionEval, after: PositionEval, color: Color): PlainNote {
  const reply = after.lines[0]?.pv ?? [];
  const afterFen = after.fen;
  const score = after.lines[0]?.score;
  if (score?.type === 'mate' && (color === 'w' ? score.value < 0 : score.value > 0)) {
    const n = Math.abs(score.value);
    const first = reply[0] ? describeMove(afterFen, reply[0], color) : '';
    return {
      text:
        n === 1 ? `That lets them checkmate you straight away.` : `That walks into a checkmate. ${first ? `It starts with ${first}.` : ''}`.trim(),
      arrows: reply[0] ? [arrow(reply[0], 'r')] : [],
    };
  }
  if (!reply.length) return { text: 'That throws away your position.', arrows: [] };
  const what = describeMove(afterFen, reply[0], color, true);
  const mat = lineMaterial(afterFen, reply, color, 8);
  const cost = mat.delta <= -1 ? ` You'd lose ${describeMaterial(mat.delta, mat.wonPieces, mat.lostPieces)}.` : '';
  const ep = expectedFor(after.lines[0].score, color);
  const was = before.lines[0] ? expectedFor(before.lines[0].score, color) : 0.5;
  const tail =
    cost ||
    (was > 0.7 && ep < 0.5
      ? ' You were winning, and that throws it away.'
      : ep < 0.3
        ? ' Your position falls apart after that.'
        : ' It hands them the advantage.');
  return { text: `That lets ${what}.${tail}`, arrows: [arrow(reply[0], 'r')] };
}

/** What a winning move does, for after a chance was missed: "you could have taken their knight for free". */
export function plainChance(pos: PositionEval, you: Color): PlainNote {
  const best = pos.lines[0]?.pv ?? [];
  if (!best.length) return { text: '', arrows: [] };
  const what = describeMove(pos.fen, best[0], you);
  const mat = lineMaterial(pos.fen, best, you, 8);
  const gain = mat.mate
    ? ' It leads to checkmate.'
    : mat.delta >= 1
      ? ` That wins ${describeMaterial(mat.delta, mat.wonPieces, mat.lostPieces)}.`
      : '';
  return { text: `The move was there: ${what}.${gain}`, arrows: [arrow(best[0])] };
}

/**
 * A nudge when the opponent has slipped, without giving the answer: what
 * kind of chance it is.
 */
export function plainSlipHint(pos: PositionEval, you: Color): string {
  const best = pos.lines[0];
  if (!best?.pv.length) return '';
  if (best.score.type === 'mate' && (you === 'w' ? best.score.value > 0 : best.score.value < 0))
    return 'Their king is in trouble. Look at every check.';
  const c = new Chess(pos.fen);
  const m = playUci(c, best.pv[0]);
  if (!m) return '';
  const loose = hangingPieces(new Chess(pos.fen), you === 'w' ? 'b' : 'w');
  if (m.captured && loose.some((h) => h.square === m.to)) return `Their ${name(m.captured)} isn't properly protected.`;
  const motifs = moveMotifs(pos.fen, best.pv[0]);
  if (motifs.some((x) => x.kind === 'fork')) return 'One of your pieces can attack two things at once.';
  if (motifs.some((x) => x.kind === 'pin' || x.kind === 'skewer')) return 'Two of their pieces are lined up. Use it.';
  if (m.captured) return `Something of theirs can be taken. Count who wins the swap.`;
  if (c.inCheck()) return 'Start with a check.';
  return 'Look for a forcing move: a check, a capture or a threat.';
}

/** A piece of `you`'s that is under attack and can be lost (the biggest one), for the "watch out" nudge. */
export function threatenedPiece(fen: string, you: Color): { square: Square; text: string } | null {
  const h = hangingPieces(new Chess(fen), you)[0];
  if (!h || h.loss < 2) return null;
  return { square: h.square, text: `Your ${name(h.type)} is under attack.` };
}

/** Points for the material on the board, for "you're a piece up" style remarks. */
export function materialEdge(fen: string, you: Color): number {
  const c = new Chess(fen);
  let s = 0;
  for (const row of c.board()) for (const p of row) if (p) s += (p.color === you ? 1 : -1) * PIECE_VALUE[p.type];
  return s;
}
