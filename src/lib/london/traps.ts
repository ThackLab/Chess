// Traps from London games: positions where Black has just gone wrong (or is
// setting a trap of their own) and there is one move that wins. Each comes
// from a line in lines.ts, and src/test/londonVerify.test.ts checks with
// Stockfish that the answer is the best move and clearly better than the rest.
import type { LondonLevel } from '../../state/london';

export interface LondonTrap {
  id: string;
  level: LondonLevel;
  title: string;
  /** Moves from the start to the puzzle position, in SAN. White (you) to move. */
  moves: string;
  /** Your move, then their reply, then yours... in SAN, starting and ending with yours. */
  solution: string[];
  /** Other first moves that also win, accepted with a note. */
  alts?: string[];
  /** Said when the puzzle starts. */
  intro: string;
  /** Said when you ask for a hint (no answer given away). */
  hint: string;
  /** Said when you solve it: why it works. */
  why: string;
  /** Said after a wrong try. */
  wrong: string;
  /** Arrows shown once it's solved. */
  arrows?: string[];
  /** The line in lines.ts it comes from. */
  line?: string;
}

export const LONDON_TRAPS: LondonTrap[] = [
  {
    id: 'raid-grab',
    level: 'beginner',
    title: 'The greedy queen',
    moves: 'd4 d5 Bf4 c5 e3 Qb6 Nc3 Qxb2',
    solution: ['Nxd5'],
    alts: ['Bb5+'],
    intro: 'Their queen just grabbed the pawn your bishop left behind. Make them pay for it.',
    hint: 'Your knight can take something in the middle, and then threaten a fork.',
    why: 'The knight takes their centre pawn and threatens to jump in with check, forking their king and rook. Their queen is stranded on your side too.',
    wrong: 'That gives them time to bring the queen home. Look at what your knight can take.',
    arrows: ['r:d5c7'],
    line: 'raid',
  },
  {
    id: 'raid-ignore',
    level: 'beginner',
    title: 'The forgotten pawn',
    moves: 'd4 d5 Bf4 c5 e3 Qb6 Nc3 c4',
    solution: ['Nxd5'],
    intro: 'Their queen came out early, and now they’ve pushed a pawn instead of guarding the middle. Something’s loose.',
    hint: 'Their queen used to guard their centre pawn. Nothing does now.',
    why: 'A free pawn, and your knight hits their queen as it lands. Their queen raid has cost them.',
    wrong: 'Their centre pawn is still there for the taking. What guards it now that the queen has left?',
    arrows: ['r:d5b6'],
    line: 'raid',
  },
  {
    id: 'free-bishop',
    level: 'beginner',
    title: 'Bishop on the wrong line',
    moves: 'd4 d5 Bf4 Nf6 e3 c5 c3 Qb6 Qb3 c4 Qc2 Bf5',
    solution: ['Qxf5'],
    intro: 'Their bishop just came out to hit your queen. Look a bit closer.',
    hint: 'Follow your queen’s diagonal all the way along.',
    why: 'Their bishop walked straight into your queen’s line, and nothing guards it. A whole piece for free.',
    wrong: 'There’s a free piece on the board. Look along your queen’s diagonal.',
    line: 'raid2',
  },
  {
    id: 'e5-pawn',
    level: 'beginner',
    title: 'Two against one',
    moves: 'd4 d5 Bf4 Nc6 e3 e5',
    solution: ['dxe5'],
    alts: ['Bxe5'],
    intro: 'They just pushed a pawn into the middle. Count the attackers and defenders.',
    hint: 'That pawn is attacked twice and guarded once.',
    why: 'Two attackers, one defender: you win a clean pawn. Always count before you leave something hanging, and before you take.',
    wrong: 'That pawn they pushed is attacked by two of your pieces and guarded by only one. Take it.',
  },
  {
    id: 'englund-safe',
    level: 'intermediate',
    title: 'Don’t chase the queen',
    moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2',
    solution: ['Nc3'],
    intro: 'The Englund trap. Their queen just grabbed your side pawn. One move keeps you safe and a pawn up.',
    hint: 'Don’t hit the queen with your bishop; that’s the trap. Calmly bring out another piece instead.',
    why: 'The knight comes out and covers everything. Chasing the queen with your bishop instead loses to a checkmate on your back row.',
    wrong: 'Careful: after that their queen and bishop can team up against your back row. Find the move that develops and defends.',
    line: 'englund',
  },
  {
    id: 'ne4-pawn',
    level: 'intermediate',
    title: 'Swap and pick it off',
    moves: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 Be7 Bd3 O-O Nbd2 Nbd7 Qe2 Ne4',
    solution: ['Nxe4', 'dxe4', 'Bxe4'],
    intro: 'Their knight jumped into the middle. It looks strong, but it’s only held up by a pawn.',
    hint: 'Swap off the knight, then count who guards the pawn that takes back.',
    why: 'Swap knights, and the pawn that takes back has no protection. Your bishop picks it off: a clean pawn up.',
    wrong: 'Count it out: swap the knights first, then see what happens to the pawn that recaptures.',
  },
  {
    id: 'nh5-chase',
    level: 'intermediate',
    title: 'Run with a threat',
    moves: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Nh5',
    solution: ['Bg5'],
    intro: 'Their knight is chasing your bishop. Where should it go?',
    hint: 'Find a square where your bishop is safe and attacks something big.',
    why: 'The bishop gets away and hits their queen at the same time, so they have to answer you instead of carrying on with their plan.',
    wrong: 'That’s a bit passive. Look for a bishop move that attacks their queen.',
    arrows: ['r:g5d8'],
    line: 'chase',
  },
  {
    id: 'jobava-fork',
    level: 'advanced',
    title: 'The Jobava fork',
    moves: 'd4 d5 Nc3 Nf6 Bf4 e6 Nb5 Nc6',
    solution: ['Nxc7+'],
    intro: 'Your knight is already hitting their weak pawn, and they’ve just brought out a different piece. Punish it.',
    hint: 'Their king and rook are both one knight jump from the same square.',
    why: 'The knight takes with check and forks their king and rook. They lose the rook.',
    wrong: 'They didn’t guard the pawn in front of their queen’s bishop. What can your knight do about that?',
    arrows: ['r:c7a8', 'r:c7e8'],
    line: 'jobava',
  },
];

export const findTrap = (id: string) => LONDON_TRAPS.find((t) => t.id === id);
