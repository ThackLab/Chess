// The London course: every common Black reply to the London System, as
// lines with a plain-English note on each move (what the talking coach
// says). Notes never use notation or square names; the board draws arrows.
// Every line is checked by src/lib/london/london.test.ts (legal, notes in
// plain English) and, with LONDON=1, against Stockfish by
// src/test/londonVerify.test.ts (each of White's moves within a few
// centipawns of the best, traps have one winning answer).
import type { LondonLevel } from '../../state/london';

export interface LondonMove {
  /** The move in SAN (for the board; never shown in the coach's words). */
  san: string;
  /** What the coach says about it. */
  note: string;
  /** One of your moves worth explaining when you find it yourself (otherwise a quick "yep"). */
  key?: boolean;
  /** Extra arrows to draw with the note: "e2e4", or "r:"/"b:"/"y:" for red, blue, yellow. */
  arrows?: string[];
}

export interface LondonLine {
  id: string;
  level: LondonLevel;
  /** What Black does, in a few words. */
  group: string;
  /** Plain name of the line. */
  name: string;
  /** Its name in the books, for anyone who wants to look it up. */
  aka: string;
  /** Said when the line starts. */
  summary: string;
  /** The one thing to remember. */
  rule: string;
  /**
   * A different White setup (the Jobava): its positions may be played
   * differently from the main London's, so it's drilled as its own system.
   */
  system?: string;
  moves: LondonMove[];
}

// The first moves most lines share.
const D4 = (note = 'Push the pawn in front of your queen two squares. It grabs the middle and lets your dark-squared bishop out.'): LondonMove => ({
  san: 'd4',
  note,
  key: true,
});
const D5: LondonMove = { san: 'd5', note: 'They copy you. A pawn each in the middle. Most of your games will start like this.' };
const BF4 = (note = 'Here’s the London move: get that bishop out now, before the pawn in front of your king locks it in.'): LondonMove => ({
  san: 'Bf4',
  note,
  key: true,
});
const E3 = (note = 'Pawn in front of your king, one square. It backs up your centre pawn and opens the door for your other bishop.'): LondonMove => ({
  san: 'e3',
  note,
  key: true,
});

export const LONDON_LINES: LondonLine[] = [
  // ------------------------------------------------------------- beginner
  {
    id: 'setup',
    level: 'beginner',
    group: 'Black plays solid moves in the middle',
    name: 'The basic setup',
    aka: 'London System: main line',
    summary: 'The main line. Black keeps it solid in the middle and you build the classic London setup, the one you’ll play nearly every game.',
    rule: 'Bishop out first, then the pawn triangle, knights behind the pawns, castle. Same setup nearly every game.',
    moves: [
      D4(),
      D5,
      BF4(),
      { san: 'Nf6', note: 'Their knight comes out towards the middle. Normal stuff.' },
      E3(),
      { san: 'e6', note: 'They do the same to free their bishop.' },
      { san: 'Nf3', note: 'Knight out towards the middle. It backs up your centre pawn and watches the squares in front of it.' },
      { san: 'c5', note: 'Now they attack your centre pawn from the side. This is Black’s main way to fight the London.' },
      {
        san: 'c3',
        note: 'Pawn next to your queen’s pawn, one square. Now your centre pawn is rock solid. That V of three pawns is the London’s backbone.',
        key: true,
      },
      { san: 'Nc6', note: 'Another knight out, piling up on your centre pawn.' },
      {
        san: 'Nbd2',
        note: 'Your other knight comes out behind your pawns, not in front of them, so it doesn’t block your pawn triangle. It can jump forward later.',
        key: true,
      },
      { san: 'Bd6', note: 'They offer to swap bishops. Their bishop is staring straight at yours.' },
      {
        san: 'Bg3',
        note: 'Step back and keep your bishop. If they take it, take back with the pawn on the edge and your rook gets an open lane up the side.',
        key: true,
      },
      { san: 'O-O', note: 'They castle, tucking their king away.' },
      { san: 'Bd3', note: 'Last bishop out, aiming straight at their king. Castle next and your setup is complete.', key: true, arrows: ['y:d3h7'] },
    ],
  },
  {
    id: 'copycat',
    level: 'beginner',
    group: 'Black copies your bishop move',
    name: 'The copycat bishop',
    aka: 'London System: symmetrical, 2...Bf5',
    summary: 'Black copies your bishop move. Their bishop is their best piece in this setup, so you offer to swap it off.',
    rule: 'When they copy your bishop, offer a trade with your other bishop.',
    moves: [
      D4(),
      D5,
      BF4(),
      { san: 'Bf5', note: 'They copy your bishop move. Their bishop gets out before they lock it in, same idea as yours.' },
      E3('Pawn in front of your king, one square, freeing your other bishop.'),
      { san: 'e6', note: 'They follow along.' },
      { san: 'Nf3', note: 'Knight out. Knights before bishops is a good habit.' },
      { san: 'Nf6', note: 'Their knight comes out too.' },
      {
        san: 'Bd3',
        note: 'Offer to swap bishops. Their bishop is their best piece here, and swapping it off makes your life easier.',
        key: true,
      },
      { san: 'Bxd3', note: 'They take.' },
      {
        san: 'Qxd3',
        note: 'Take back with the queen. She’s well placed here. Next, castle, bring your other knight out behind your pawns, and you’re set.',
        key: true,
      },
    ],
  },
  {
    id: 'raid',
    level: 'beginner',
    group: 'Black’s queen grabs a pawn',
    name: 'The queen raid',
    aka: 'London System: 2...c5 3.e3 Qb6',
    summary: 'Black brings the queen out early to grab the pawn your bishop left behind. Let them, and punish it.',
    rule: 'An early queen raid on your side pawn is usually a trap for them. Develop with a threat instead of panicking.',
    moves: [
      D4(),
      D5,
      BF4(),
      { san: 'c5', note: 'They hit your centre pawn straight away.' },
      E3('Pawn in front of your king, one square. Back up the centre first.'),
      {
        san: 'Qb6',
        note: 'Their queen comes out early, eyeing the pawn in front of your queen’s knight. Your bishop used to guard it.',
        arrows: ['r:b6b2'],
      },
      {
        san: 'Nc3',
        note: 'Knight out, and here’s the trick: if their queen grabs that pawn, your knight jumps in and their queen gets into trouble. Don’t worry about the pawn.',
        key: true,
      },
      { san: 'Qxb2', note: 'They take the bait. The queen grabs the pawn, deep in your half of the board.' },
      {
        san: 'Nxd5',
        note: 'Your knight takes their centre pawn. Now it threatens to jump in with check and fork their king and rook, and their queen is stuck on your side. You’re winning.',
        key: true,
        arrows: ['r:d5c7'],
      },
    ],
  },
  {
    id: 'kid',
    level: 'beginner',
    group: 'Black puts a bishop in the corner',
    name: 'The fianchetto',
    aka: 'London System against the King’s Indian setup',
    summary: 'Black skips the centre pawn and tucks a bishop in the corner on the long diagonal. Same setup for you, with one small extra move.',
    rule: 'Against the fianchetto: same setup, quiet bishop, and a little edge pawn move so your bishop has a bolt-hole.',
    moves: [
      D4(),
      { san: 'Nf6', note: 'This time their knight comes out first, without a centre pawn.' },
      BF4('Same plan: bishop out straight away.'),
      { san: 'g6', note: 'They push a pawn to make room for their bishop in the corner. That setup is called a fianchetto.' },
      E3(),
      { san: 'Bg7', note: 'Their bishop sits on the long diagonal, aiming across at your side of the board.' },
      { san: 'Nf3', note: 'Knight out to cover the middle.' },
      { san: 'O-O', note: 'They castle early.' },
      { san: 'Be2', note: 'Quiet bishop move so you can castle. There’s nothing to aim at yet, so keep it safe.', key: true },
      { san: 'd6', note: 'They’re getting ready to push the pawn in front of their king two squares and kick your bishop.' },
      {
        san: 'h3',
        note: 'Little pawn move on the edge. It gives your bishop a hiding square if it gets chased, and stops their pieces landing next to your king.',
        key: true,
      },
      { san: 'Nbd7', note: 'Other knight out, backing up that pawn push.' },
      { san: 'O-O', note: 'Castle. You’re safe and ready: if they push that pawn, your bishop drops back to its hiding square.', key: true },
    ],
  },

  // --------------------------------------------------------- intermediate
  {
    id: 'swap',
    level: 'intermediate',
    group: 'Black offers a bishop swap',
    name: 'The bishop swap offer',
    aka: 'London System: 2...e6 3.e3 Bd6',
    summary: 'Black offers a bishop swap straight away. You step back, and if they take, you get an open lane for your rook.',
    rule: 'When they offer a bishop swap, step back. If they take, take back with the edge pawn and use the open lane.',
    moves: [
      D4(),
      D5,
      BF4(),
      { san: 'e6', note: 'They free their bishop first.' },
      E3(),
      { san: 'Bd6', note: 'Straight away they offer a bishop swap. Their bishop stares at yours.' },
      { san: 'Bg3', note: 'Step back. Taking would only help their queen come out. Let them make the decision.', key: true },
      { san: 'Bxg3', note: 'They swap anyway.' },
      {
        san: 'hxg3',
        note: 'Take back with the edge pawn. Your rook now has an open lane straight at their king’s side.',
        key: true,
        arrows: ['y:h1h7'],
      },
      { san: 'Nf6', note: 'Knight out.' },
      { san: 'Nd2', note: 'Knight comes out behind your pawns, keeping your options open.' },
      { san: 'O-O', note: 'They castle right where your rook’s lane is open. Brave.' },
      {
        san: 'Bd3',
        note: 'Bishop aims at the pawn in front of their king. With your rook’s open lane, that’s two pieces pointing at their king. Look for attacking chances.',
        key: true,
        arrows: ['y:d3h7', 'y:h1h7'],
      },
    ],
  },
  {
    id: 'chase',
    level: 'intermediate',
    group: 'Black’s knight chases your bishop',
    name: 'The knight chase',
    aka: 'London System: ...Nh5 against the bishop',
    summary: 'Black sends a knight to the edge to hunt your bishop. Don’t run; move with a threat.',
    rule: 'When a piece gets chased, look for a retreat that makes a threat.',
    moves: [
      D4(),
      D5,
      BF4(),
      { san: 'Nf6', note: 'Knight out.' },
      E3(),
      { san: 'e6', note: 'They free their bishop.' },
      { san: 'Nf3', note: 'Knight out towards the middle.' },
      { san: 'c5', note: 'They hit your centre.' },
      { san: 'c3', note: 'Pawn triangle. Your centre pawn is safe.', key: true },
      { san: 'Nc6', note: 'Another knight out.' },
      { san: 'Nbd2', note: 'Your other knight comes out behind your pawns.' },
      { san: 'Nh5', note: 'Their knight goes to the edge to chase your bishop. They want to swap a knight for it.', arrows: ['r:h5f4'] },
      {
        san: 'Bg5',
        note: 'Don’t just run away. Your bishop slides over and attacks their queen, so they have to deal with that first.',
        key: true,
        arrows: ['r:g5d8'],
      },
      { san: 'Be7', note: 'They block with their bishop and offer a swap.' },
      { san: 'Bxe7', note: 'Take. You trade bishops on your terms, and their knight is left sitting on the edge.', key: true },
      { san: 'Qxe7', note: 'Queen takes back.' },
      { san: 'Ne5', note: 'Knight jumps into the middle, right where it bothers them most. A classic London outpost.', key: true },
    ],
  },
  {
    id: 'open',
    level: 'intermediate',
    group: 'Black swaps pawns in the middle',
    name: 'The open centre',
    aka: 'London System: 2...c5 3.e3 cxd4',
    summary: 'Black swaps pawns in the middle early. When their light bishop leaves home, the pawn it was guarding becomes a target.',
    rule: 'When their light bishop leaves home early, hit the pawn it left behind with your queen.',
    moves: [
      D4(),
      D5,
      BF4(),
      { san: 'c5', note: 'They hit your centre pawn.' },
      E3(),
      { san: 'cxd4', note: 'They swap pawns in the middle straight away.' },
      { san: 'exd4', note: 'Take back with the pawn in front of your king. Now your other bishop has an open path.', key: true },
      { san: 'Nc6', note: 'Knight out, hitting your centre pawn.' },
      { san: 'c3', note: 'Back up the centre pawn with a pawn. Solid.', key: true },
      { san: 'Nf6', note: 'Another knight out.' },
      { san: 'Nf3', note: 'Knight out.' },
      { san: 'Bg4', note: 'Their bishop pins your knight to your queen. Annoying, but no danger yet.', arrows: ['r:g4d1'] },
      { san: 'Nbd2', note: 'Your other knight backs up the pinned one.' },
      {
        san: 'e6',
        note: 'Their bishop is now shut outside its pawns, and the pawn in front of their queen’s knight has lost its guard.',
      },
      {
        san: 'Qb3',
        note: 'Queen out, attacking that unguarded pawn. Their bishop left it, and now it’s a target.',
        key: true,
        arrows: ['r:b3b7'],
      },
    ],
  },
  {
    id: 'raid2',
    level: 'intermediate',
    group: 'Queen raid before your knight is out',
    name: 'The queen raid, knight still home',
    aka: 'London System: ...c5 and ...Qb6 with c3',
    summary:
      'The queen raid again, but this time your knight isn’t out. Offer a queen swap, and watch for their bishop walking into your queen’s line.',
    rule: 'Queen raid with your knight still at home? Offer your queen for a swap.',
    moves: [
      D4(),
      D5,
      BF4(),
      { san: 'Nf6', note: 'Knight out.' },
      E3(),
      { san: 'c5', note: 'They hit your centre pawn.' },
      { san: 'c3', note: 'Pawn triangle first.', key: true },
      { san: 'Qb6', note: 'Queen raid again, eyeing the pawn your bishop left behind.', arrows: ['r:b6b2'] },
      {
        san: 'Qb3',
        note: 'Offer a queen swap. If they take, you take back with the edge pawn and your rook gets an open lane.',
        key: true,
      },
      { san: 'c4', note: 'They won’t swap. Their pawn jumps forward and hits your queen.' },
      {
        san: 'Qc2',
        note: 'Queen steps back, still guarding that pawn. And now she looks along the diagonal towards their king’s side.',
        key: true,
        arrows: ['y:c2h7'],
      },
      { san: 'g6', note: 'Smart. That pawn move lets their bishop come out safely. Without it, the bishop would just drop to your queen.' },
      { san: 'h3', note: 'Little edge pawn move: a hiding square for your bishop.' },
      { san: 'Bf5', note: 'Now their bishop comes out, hitting your queen.' },
      { san: 'Qc1', note: 'Queen goes home, but she still guards the pawn your bishop left behind and backs up your bishop.', key: true },
      { san: 'Nc6', note: 'Knight out.' },
      { san: 'Nd2', note: 'Knight behind your pawns. It’s level and solid: castle and get on with the game.', key: true },
    ],
  },
  {
    id: 'dutch',
    level: 'intermediate',
    group: 'Black pushes the pawn beside their king',
    name: 'The Dutch',
    aka: 'Dutch Defence against the London',
    summary: 'Black pushes the pawn next to their king two squares. It grabs space but loosens their king, so aim your pieces there.',
    rule: 'Against the Dutch, aim your bishops at their king; that early pawn push weakened it.',
    moves: [
      D4(),
      { san: 'f5', note: 'This is the Dutch. They push the pawn next to their king two squares. It grabs space but loosens their king.' },
      BF4('Same bishop move. It works against this too.'),
      { san: 'Nf6', note: 'Knight out.' },
      E3(),
      { san: 'e6', note: 'They free their bishop.' },
      { san: 'Nf3', note: 'Knight out.' },
      { san: 'Be7', note: 'Their bishop gets ready so they can castle.' },
      { san: 'h3', note: 'Edge pawn move. It gives your bishop somewhere to hide if their knight comes chasing.', key: true },
      { san: 'O-O', note: 'They castle.' },
      {
        san: 'Bd3',
        note: 'Bishop aims at their king, where that early pawn push loosened things. Castle next.',
        key: true,
      },
    ],
  },
  {
    id: 'qid',
    level: 'intermediate',
    group: 'Black puts a bishop on the queen’s side long diagonal',
    name: 'The long-range bishop',
    aka: 'London System against the Queen’s Indian setup',
    summary: 'Black puts their light bishop on the long diagonal on the queen’s side. Nothing changes for you: build the setup.',
    rule: 'Same setup every time; the edge pawn move comes in when their knight could chase your bishop.',
    moves: [
      D4(),
      { san: 'Nf6', note: 'Knight first.' },
      BF4(),
      { san: 'e6', note: 'They free their dark bishop.' },
      E3(),
      { san: 'b6', note: 'They push a pawn to put their other bishop on the long diagonal.' },
      { san: 'Nf3', note: 'Knight out.' },
      { san: 'Bb7', note: 'Their bishop now aims at the middle and, from far away, at your king’s side.', arrows: ['r:b7f3'] },
      { san: 'h3', note: 'Edge pawn move: a hiding square for your bishop.', key: true },
      { san: 'c5', note: 'They hit your centre.' },
      { san: 'c3', note: 'Pawn triangle.', key: true },
      { san: 'Be7', note: 'Bishop ready to castle.' },
      { san: 'Nbd2', note: 'Knight behind your pawns, so it can jump into the middle later.' },
      { san: 'O-O', note: 'They castle.' },
      { san: 'Bd3', note: 'Bishop out, aiming at their king. Castle next and you’ve got the full London.', key: true, arrows: ['y:d3h7'] },
    ],
  },
  {
    id: 'push',
    level: 'intermediate',
    group: 'Black hits your centre pawn before you back it up',
    name: 'Push past it',
    aka: 'London System: 1...Nf6 2.Bf4 c5 3.d5',
    summary: 'Black hits your centre pawn before you’ve backed it up. Don’t defend it; push it past.',
    rule: 'If they hit your centre pawn before you’ve backed it up, push past it.',
    moves: [
      D4(),
      { san: 'Nf6', note: 'Knight first.' },
      BF4(),
      { san: 'c5', note: 'They hit your centre pawn before you’ve had time to back it up.' },
      { san: 'd5', note: 'Push past it. Now your pawn cramps them, and their pawn has nothing to hit.', key: true },
      { san: 'd6', note: 'They put a pawn beside yours to stop it going further.' },
      { san: 'Nc3', note: 'Knight out, backing up your pushed pawn.', key: true },
      { san: 'g6', note: 'They get ready to tuck their bishop in the corner.' },
      { san: 'e4', note: 'With your queen’s pawn already pushed, grab more of the middle with your king’s pawn.', key: true },
      { san: 'Bg7', note: 'Their bishop goes in the corner, aiming down the long diagonal.' },
      { san: 'Nf3', note: 'Knight out. Keep an eye on your king’s pawn from here; it needs watching.' },
      { san: 'O-O', note: 'They castle.' },
      {
        san: 'a4',
        note: 'Edge pawn on the queen’s side, two squares. It stops them pushing their pawns on that side to kick your knight.',
        key: true,
      },
    ],
  },
  {
    id: 'chigorin',
    level: 'intermediate',
    group: 'Black’s knight comes out in front of their side pawn',
    name: 'The early knight and pin',
    aka: 'London System: 2...Nc6 with ...Bg4',
    summary: 'Black brings a knight out early and pins your knight with their bishop. Block the pin, then ask the bishop a question.',
    rule: 'Bishop pinning your knight? Block with your own bishop, then ask it a question with the edge pawn.',
    moves: [
      D4(),
      D5,
      BF4(),
      { san: 'Nc6', note: 'Their knight comes out in front of their side pawn. It wants to help push the pawn in front of their king.' },
      E3(),
      { san: 'Nf6', note: 'Another knight out.' },
      { san: 'Nf3', note: 'Knight out. It also stops the pawn in front of their king coming two squares.', key: true },
      { san: 'Bg4', note: 'Their bishop pins your knight to your queen.', arrows: ['r:g4d1'] },
      { san: 'Be2', note: 'Put your bishop in between. The pin’s gone and your knight is free again.', key: true },
      { san: 'e6', note: 'They free their other bishop.' },
      { san: 'h3', note: 'Ask the bishop a question: step back or swap?', key: true },
      { san: 'Bh5', note: 'It steps back, still eyeing your knight.' },
      { san: 'c3', note: 'Pawn triangle. Everything’s solid.', key: true },
      { san: 'Bd6', note: 'They offer a bishop swap.' },
      {
        san: 'Nbd2',
        note: 'Knight out behind your pawns. If they swap bishops now, take back with the pawn in front of your king; it covers the middle.',
        key: true,
      },
    ],
  },
  {
    id: 'englund',
    level: 'intermediate',
    group: 'Black gives you a pawn straight away',
    name: 'The Englund trap',
    aka: 'Englund Gambit: 1.d4 e5',
    summary: 'Black gives you a pawn on move one. It isn’t much good, but it hides a nasty checkmate trap. Learn the safe way through.',
    rule: 'Against the Englund: take the pawn, develop, and when their queen grabs your side pawn, bring the knight out. Never the bishop.',
    moves: [
      D4(),
      { san: 'e5', note: 'The Englund Gambit. They just give you a pawn. It’s not very good, but it hides a trap.' },
      { san: 'dxe5', note: 'Take the pawn. Free stuff.', key: true },
      { san: 'Nc6', note: 'Knight out, attacking your extra pawn.' },
      { san: 'Nf3', note: 'Guard it with your knight.', key: true },
      { san: 'Qe7', note: 'Their queen attacks the pawn too, and sets up the trick.' },
      { san: 'Bf4', note: 'Bishop out, guarding the pawn again. Your London habit works here, but now be careful.', key: true },
      { san: 'Qb4+', note: 'Check! And their queen also hits the pawn in front of your queen’s knight.', arrows: ['r:b4b2'] },
      { san: 'Bd2', note: 'Block the check with your bishop.', key: true },
      {
        san: 'Qxb2',
        note: 'Queen grabs the pawn. Here’s the trap: if your bishop steps forward to hit the queen, they get a checkmate. Don’t do it.',
      },
      { san: 'Nc3', note: 'Knight out instead. It guards the important squares, and you’re still a pawn up. This is the safe move.', key: true },
      { san: 'Bb4', note: 'Their bishop pins your knight.' },
      { san: 'Rb1', note: 'Rook attacks the queen.', key: true },
      { san: 'Qa3', note: 'Queen runs.' },
      {
        san: 'Nd5',
        note: 'Knight jumps forward, hitting their bishop and the pawn in front of their queen’s bishop. You’re clearly better.',
        key: true,
        arrows: ['r:d5c7', 'r:d5b4'],
      },
    ],
  },

  // ------------------------------------------------------------- advanced
  {
    id: 'jobava',
    level: 'advanced',
    system: 'Jobava',
    group: 'You bring the knight out early',
    name: 'The Jobava London',
    aka: 'Jobava London: 1.d4 d5 2.Nc3 Nf6 3.Bf4',
    summary: 'A sharper London: your queen’s knight comes out in front of your side pawn, ready to jump forward and hit their weak spot.',
    rule: 'In the Jobava, watch the pawn in front of their queen’s bishop: your knight and bishop together can win it.',
    moves: [
      D4(),
      D5,
      { san: 'Nc3', note: 'The Jobava twist: knight out in front of your side pawn before the bishop. More aggressive.', key: true },
      { san: 'Nf6', note: 'Knight out.' },
      BF4('Bishop to its London square.'),
      {
        san: 'e6',
        note: 'They free their bishop. But the pawn in front of their queen’s bishop is now guarded only by their queen.',
        arrows: ['y:f4c7'],
      },
      {
        san: 'Nb5',
        note: 'Knight jumps forward and hits that pawn, with your bishop helping. If they ignore it, the knight takes with check and forks king and rook.',
        key: true,
        arrows: ['r:b5c7', 'r:f4c7'],
      },
      { san: 'Na6', note: 'They guard it with a knight from the edge.' },
      E3('Now finish your setup: pawn in front of your king, one square.'),
      { san: 'Be7', note: 'Bishop ready to castle.' },
      { san: 'Nf3', note: 'Knight out.' },
      { san: 'O-O', note: 'They castle.' },
      {
        san: 'h3',
        note: 'Little edge pawn move: a hiding square for your bishop. Your forward knight has done its job; it drops back when they kick it.',
        key: true,
      },
    ],
  },
  {
    id: 'kid2',
    level: 'advanced',
    group: 'Fianchetto with the central pawn break',
    name: 'The fianchetto pawn break',
    aka: 'London System against the King’s Indian: ...d6, ...Nbd7, ...Qe8',
    summary:
      'Against the fianchetto, Black builds up to push the pawn in front of their king two squares. Have your bishop’s escape ready and play on the other side.',
    rule: 'When they build up that central pawn push, give your bishop a hiding square and start play on the queen’s side.',
    moves: [
      D4(),
      { san: 'Nf6', note: 'Knight first.' },
      BF4(),
      { san: 'g6', note: 'Fianchetto coming.' },
      E3(),
      { san: 'Bg7', note: 'Bishop in the corner.' },
      { san: 'Nf3', note: 'Knight out.' },
      { san: 'd6', note: 'They prepare to push the pawn in front of their king.' },
      { san: 'h3', note: 'Hiding square for your bishop before it gets chased.', key: true },
      { san: 'O-O', note: 'They castle.' },
      { san: 'Be2', note: 'Quiet bishop so you can castle.', key: true },
      { san: 'Nbd7', note: 'Knight backs up the pawn push.' },
      { san: 'O-O', note: 'Castle.', key: true },
      { san: 'Qe8', note: 'Their queen steps up behind that pawn. The push is coming.' },
      {
        san: 'c4',
        note: 'Push the pawn in front of your queen’s bishop two squares. You fight for the middle from the side and start play on the queen’s side.',
        key: true,
      },
    ],
  },
  {
    id: 'attack',
    level: 'advanced',
    group: 'Going after their king',
    name: 'The London attack',
    aka: 'London System: Ne5 and Qf3 plan',
    summary: 'Once your setup’s done, here’s the classic attacking plan: knight into the middle, queen over to the king’s side.',
    rule: 'Knight into the middle, queen over to the king’s side, bishop aimed at the king.',
    moves: [
      D4(),
      D5,
      BF4(),
      { san: 'Nf6', note: 'Knight out.' },
      E3(),
      { san: 'e6', note: 'They free their bishop.' },
      { san: 'Nf3', note: 'Knight out.' },
      { san: 'c5', note: 'They hit your centre.' },
      { san: 'c3', note: 'Pawn triangle.', key: true },
      { san: 'Nc6', note: 'Knight out.' },
      { san: 'Nbd2', note: 'Other knight out, behind your pawns.' },
      { san: 'Bd6', note: 'Bishop swap offer.' },
      { san: 'Bg3', note: 'Step back and keep your bishop.', key: true },
      { san: 'O-O', note: 'They castle.' },
      { san: 'Bd3', note: 'Bishop aimed at their king.', key: true, arrows: ['y:d3h7'] },
      { san: 'b6', note: 'They prepare to put their other bishop on the long diagonal. Their king’s side is a bit thin.' },
      { san: 'Ne5', note: 'Knight jumps into the middle. It’s strong there and eyes the squares around their king.', key: true },
      { san: 'Bb7', note: 'Their bishop takes the long diagonal.' },
      {
        san: 'Qf3',
        note: 'Queen swings over to the king’s side. Next she can go even closer and team up with your bishop against their king.',
        key: true,
        arrows: ['y:f3h5', 'y:d3h7'],
      },
    ],
  },
];

export const findLine = (id: string) => LONDON_LINES.find((l) => l.id === id);

/** Lines for a level and the ones below it (an advanced player still drills the basics). */
export function linesUpTo(level: LondonLevel): LondonLine[] {
  const order: LondonLevel[] = ['beginner', 'intermediate', 'advanced'];
  const max = order.indexOf(level);
  return LONDON_LINES.filter((l) => order.indexOf(l.level) <= max);
}
