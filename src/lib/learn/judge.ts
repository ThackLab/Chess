// Deciding whether a move that isn't the puzzle's answer still counts.
// A different move is accepted only when it is genuinely as good: if the
// answer mates, the move must mate as fast; otherwise it must keep the same
// evaluation both in expected points and in centipawns (expected points alone
// flatten out once a position is winning, which used to let moves that miss
// the tactic but stay "winning" through).
import type { Color } from 'chess.js';
import type { Score } from '../engine/uci';
import { scoreToCp } from '../engine/uci';
import { expectedFor } from '../review/winprob';

export interface AlternativeCheck {
  solver: Color;
  /** The position after the move that was played (White's point of view), or null if not analysed. */
  mine: Score | null;
  /** The position after the answer. */
  best: Score | null;
  /** The move played is checkmate. */
  mates: boolean;
  /** The answer itself is checkmate: then only another checkmate will do. */
  answerMates?: boolean;
  /** Later moves in a line may have more than one good continuation; the first move is held to a stricter standard. */
  firstMove: boolean;
}

const forSolver = (s: Score, solver: Color): Score =>
  solver === 'w' ? s : s.type === 'cp' ? { type: 'cp', value: -s.value } : { type: 'mate', value: -s.value };

export function acceptsAlternative({ solver, mine, best, mates, answerMates, firstMove }: AlternativeCheck): boolean {
  if (mates) return true;
  if (answerMates || !mine || !best) return false;
  const m = forSolver(mine, solver);
  const b = forSolver(best, solver);
  // Mates (positive: the solver mates in n).
  if (m.type === 'mate' && m.value < 0) return false;
  if (b.type === 'mate' && b.value > 0) return m.type === 'mate' && m.value > 0 && m.value <= b.value;
  if (m.type === 'mate' && m.value > 0) return true;
  const epGap = expectedFor(best, solver) - expectedFor(mine, solver);
  const cpGap = scoreToCp(b) - scoreToCp(m);
  return firstMove ? epGap <= 0.02 && cpGap <= 40 : epGap <= 0.03 && cpGap <= 80;
}
