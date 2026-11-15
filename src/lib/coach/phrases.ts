// The talking coach's phrase book. Three characters, each with many ways of
// saying the same thing, so the coach doesn't repeat itself: lines are drawn
// from a shuffled bag and every line in a bag is used before any comes round
// again (see talk.ts). The specific part of what it says - why a move is
// played, what a mistake allows - comes from the lessons and the engine and
// goes in {detail} / {idea}, so most of what you hear is about your move.
//
// House rules for every line here: plain English, no chess notation and no
// square names (the board shows those with arrows), and short enough to say
// in one breath.
import type { CoachPersona } from '../../state/settings';
export { PERSONAS, type PersonaInfo } from './personas';

export type Moment =
  | 'greet'
  | 'walkStart'
  | 'walkYours'
  | 'walkTheirs'
  | 'walkEnd'
  | 'tryStart'
  | 'right'
  | 'rightKey'
  | 'wrong'
  | 'wrongAgain'
  | 'lineClean'
  | 'lineMessy'
  | 'drillStart'
  | 'streak'
  | 'playStart'
  | 'onPlan'
  | 'leftPlan'
  | 'theyLeftBook'
  | 'blunderWarn'
  | 'takeback'
  | 'playedAnyway'
  | 'theySlipped'
  | 'punished'
  | 'missedPunish'
  | 'greatMove'
  | 'hanging'
  | 'cct'
  | 'mateThere'
  | 'win'
  | 'loss'
  | 'draw'
  | 'hint'
  | 'trapStart'
  | 'trapRight'
  | 'trapWrong'
  | 'trapDone';

type Book = Partial<Record<Moment, string[]>>;

const MATE: Book = {
  greet: [
    'G’day {name}. Let’s get this London into your fingers.',
    'Righto {name}, ready when you are.',
    'Back for more, {name}? Good on ya.',
    'Oi {name}. Let’s make the London your bread and butter.',
    'How ya going, {name}? Let’s knock out a few lines.',
    'There you are. Let’s get stuck in, {name}.',
    'Too easy, {name}. Pick something and we’ll crack on.',
    'Good to see ya, {name}. The London won’t learn itself.',
  ],
  walkStart: [
    'This one’s {line}. {idea}',
    'Righto, {line}. {idea}',
    'Next up, {line}. {idea}',
    'Let’s have a squiz at {line}. {idea}',
    '{line}. Here’s the gist: {idea}',
    'Okay, {line}. Quick version: {idea}',
    'This line’s called {line}. {idea}',
    'Here’s {line}. {idea}',
  ],
  walkYours: ['', '', '', 'Your move here. ', 'Now you. ', 'Over to us. ', 'Our turn. ', 'Here’s what we do. '],
  walkTheirs: ['', '', '', 'They reply. ', 'Their go. ', 'Here’s their answer. ', 'They come back with this. ', 'Now them. '],
  walkEnd: [
    'That’s the line. Now you have a crack at it.',
    'And that’s the setup sorted. Your turn to play it.',
    'Done. Reckon you can play that yourself? Let’s find out.',
    'That’s all there is to it. Have a go now.',
    'Sweet, that’s the whole line. Give it a run yourself.',
    'There ya go. Same moves again, but you’re driving.',
  ],
  tryStart: [
    'Your go. Play the London moves and I’ll yell if you stray.',
    'Righto, you’re driving. I’ll play their side.',
    'Off you go. Same line, your hands.',
    'Show us what you remember.',
    'Let’s see it. I’ll play their moves.',
    'Over to you, mate.',
  ],
  right: [
    'Yep.',
    'Good.',
    'That’s it.',
    'Spot on.',
    'Too easy.',
    'Bang on.',
    'Yep, that one.',
    'Correct.',
    'Mint.',
    'Nice.',
    'Right move.',
    'That’ll do.',
  ],
  rightKey: [
    'Yep. {idea}',
    'Spot on. {idea}',
    'That’s the one. {idea}',
    'Good stuff. {idea}',
    'Bang on. {idea}',
    'Nailed it. {idea}',
    'Exactly right. {idea}',
    'Yep, and here’s why: {idea}',
    'Ripper. {idea}',
    'Nice. {idea}',
  ],
  wrong: [
    'Nah, not that one. {detail}',
    'Close, but no. {detail}',
    'Hold up. {detail}',
    'Not quite, mate. {detail}',
    'Whoa, back it up. {detail}',
    'Nope. {detail}',
    'Not in our setup. {detail}',
    'Ah, not that. {detail}',
    'Try again. {detail}',
    'Easy tiger. {detail}',
  ],
  wrongAgain: [
    'I’ve put the arrow on it. {detail}',
    'Follow the arrow. {detail}',
    'Here, I’ll show ya. {detail}',
    'No stress, arrow’s up. {detail}',
    'Let me point it out. {detail}',
  ],
  lineClean: [
    'Clean as a whistle. That line’s yours.',
    'Not one slip. Too easy.',
    'Perfect run, mate.',
    'Flawless. I’ll bring that one back in a few days to check it stuck.',
    'Didn’t put a foot wrong.',
    'Ripper. Every move spot on.',
    'That’s how you do it.',
    'Textbook. On to the next.',
  ],
  lineMessy: [
    'Got there in the end. That one comes back soon.',
    'Bit wobbly, but you finished it. We’ll run it again soon.',
    'Not bad. A couple of slips, so it’ll come round again shortly.',
    'Done, but I’ll be testing you on that one again.',
    'Getting there. Practice makes permanent.',
    'Few mistakes. No worries, that’s what practice is for.',
  ],
  drillStart: [
    'Drill time. I’ll throw different setups at ya.',
    'Righto, random lines. Keep your wits about ya.',
    'Let’s test ya. I’ll mix it up.',
    'Pop quiz. You play the London, I’ll play whatever Black fancies.',
    'Drill mode. No arrows unless you stuff up.',
  ],
  streak: [
    '{n} in a row. You’re on fire.',
    'That’s {n} straight. Keep it rolling.',
    '{n} on the trot, mate.',
    '{n} clean lines in a row. Too easy.',
    'Streak’s at {n}. Don’t choke now.',
  ],
  playStart: [
    'Real game now. You’re White, play your London. I’ll watch your back.',
    'Let’s play. London setup, and I’ll sing out if you’re about to drop something.',
    'Game on. Set up your London and we’ll see what they do.',
    'Righto, full game. Get your setup out and keep an eye on their threats.',
    'Your opponent’s ready. London moves first, then we’ll hunt.',
  ],
  onPlan: ['Setup’s coming along nicely.', 'Good, all to plan.', 'Textbook London so far.', 'That’s the setup, keep going.', 'Nice, right on plan.'],
  leftPlan: [
    'That works, but it’s not our London. {detail}',
    'Bit off the plan there. {detail}',
    'Not the London move, mate. {detail}',
    'You’ve wandered off script. {detail}',
    'Fine, but here’s what the London does. {detail}',
  ],
  theyLeftBook: [
    'They’ve gone off script. Same plan as always: get your pieces out and castle.',
    'New move from them. Don’t panic, finish your setup.',
    'They’re freelancing now. Stick to your setup and watch for threats.',
    'Off the map now. Ask yourself what their last move attacks.',
    'Unusual from them. Check if anything’s hanging, then carry on.',
  ],
  blunderWarn: [
    'Whoa, hang on. {detail}',
    'Stop right there, mate. {detail}',
    'Careful! {detail}',
    'Hold your horses. {detail}',
    'Oi, look out. {detail}',
    'Hang on a sec. {detail}',
    'Wait up. {detail}',
    'Easy! {detail}',
  ],
  takeback: [
    'Good call. Have another look.',
    'Smart. Take your time.',
    'Righto, try again.',
    'No dramas, have another go.',
    'Better safe than sorry.',
  ],
  playedAnyway: [
    'Your call, mate. Let’s see.',
    'Brave. Or mad. We’ll find out.',
    'Fair enough, you’re the boss.',
    'Righto, backing yourself. Love it.',
  ],
  theySlipped: [
    'Ooh, they’ve just slipped up. Have a good look.',
    'Hello! Something’s on here. Find it.',
    'They’ve made a mistake. What can you grab?',
    'That was a blunder from them. Hunt it down.',
    'Look closely, mate. They’ve left something.',
    'Big chance here. Checks, captures, threats.',
  ],
  punished: [
    'Got ’em. Lovely punishment.',
    'That’s exactly how you make them pay.',
    'Bang. Thanks very much.',
    'Saw it and took it. Love it.',
    'Too easy. They’ll regret that.',
    'Punished. Beautiful.',
  ],
  missedPunish: [
    'You let ’em off there. {detail}',
    'Missed a chance, mate. {detail}',
    'There was something better. {detail}',
    'They got away with one. {detail}',
  ],
  greatMove: [
    'Now that’s a cracking move.',
    'Ooh, love that. Only move, and you found it.',
    'Mate, that’s a proper player’s move.',
    'Great move. I didn’t think you’d see that.',
    'That’s the move a strong player plays. Top stuff.',
    'Ripper of a move.',
  ],
  hanging: [
    'Heads up, something of yours is under attack.',
    'Check your pieces. One of them’s in trouble.',
    'Before you move: what did their last move attack?',
    'Something’s loose on your side. Find it.',
    'Careful, they’re threatening something.',
  ],
  cct: [
    'Checks, captures, threats. Theirs first, then yours.',
    'Quick scan before you move. Anything hanging?',
    'What did their last move just do? Ask before you move.',
    'Look for checks and captures, both sides.',
    'Slow down. Anything loose on the board?',
    'Their threats first, then your chances.',
  ],
  mateThere: [
    'There’s a checkmate on the board, mate. Find it.',
    'Their king’s in trouble. Can you finish it?',
    'Look at every check. One of them is mate.',
    'Game-ending move available. Have a look.',
  ],
  win: [
    'Get in! Good win, {name}.',
    'And that’s game. Well played, mate.',
    'Too easy. Nice win.',
    'Winner winner. Good job.',
    'You beauty! Game over.',
  ],
  loss: [
    'Ah, tough one. We’ll have a look at where it turned.',
    'Not your day. Shake it off, go again.',
    'Can’t win ’em all. Next one’s yours.',
    'That one got away. Let’s learn from it.',
  ],
  draw: ['Draw. Fair result.', 'Honours even.', 'Neither of ya could crack it. Draw.'],
  hint: ['Here’s a hint. {detail}', 'Little clue for ya. {detail}', 'Think about this. {detail}', 'Have a look here. {detail}'],
  trapStart: [
    'Trap time. {idea}',
    'Here’s a nasty one. {idea}',
    'This trap catches heaps of people. {idea}',
    'Righto, find the killer move. {idea}',
    'Let’s see if you can spot it. {idea}',
  ],
  trapRight: ['Got it! {idea}', 'That’s the one. {idea}', 'Boom. {idea}', 'Nailed it. {idea}', 'Exactly. {idea}'],
  trapWrong: ['Nah, they get away with that. {detail}', 'Not quite. {detail}', 'Close, but no cigar. {detail}', 'That lets them off. {detail}'],
  trapDone: ['That’s the trap. Remember it.', 'Lovely. Watch for that in your games.', 'Too easy. Next one.', 'File that one away, mate.'],
};

const PROFESSOR: Book = {
  greet: [
    'Hello {name}. Shall we continue with the London?',
    'Good to see you, {name}. Let’s pick up where we left off.',
    'Welcome back, {name}. A little practice every day goes a long way.',
    'Ah, {name}. Ready for some study?',
    'Hello again, {name}. Let’s build some sound habits.',
    'Good day, {name}. Choose a line and we’ll begin.',
  ],
  walkStart: [
    'This is {line}. {idea}',
    'Let us look at {line}. {idea}',
    'Our next line is {line}. {idea}',
    'Now, {line}. The key idea: {idea}',
    'Consider {line}. {idea}',
    '{line}. In short: {idea}',
  ],
  walkYours: ['', '', '', 'Our move. ', 'Now White plays. ', 'Here we continue. ', 'Our reply. '],
  walkTheirs: ['', '', '', 'Black answers. ', 'Black continues. ', 'Here Black plays. ', 'Black’s reply. '],
  walkEnd: [
    'That completes the line. Now play it yourself.',
    'There we are. Let’s see if you can reproduce it.',
    'That is the full line. Your turn.',
    'Good. Now try it from memory.',
    'That is the setup. Now you play White.',
  ],
  tryStart: [
    'Your turn. I will play Black’s moves.',
    'Play White’s moves from memory, please.',
    'Now you lead. I will correct you if needed.',
    'Off you go. Take your time over each move.',
    'Show me what you remember.',
  ],
  right: ['Correct.', 'Good.', 'Yes.', 'Quite right.', 'Well played.', 'Precisely.', 'That’s right.', 'Indeed.', 'Very good.', 'Exactly.'],
  rightKey: [
    'Correct. {idea}',
    'Good. {idea}',
    'Yes, and the reason: {idea}',
    'Quite right. {idea}',
    'Well found. {idea}',
    'Precisely. {idea}',
    'Exactly. {idea}',
    'Very good. {idea}',
  ],
  wrong: [
    'Not quite. {detail}',
    'Let’s reconsider. {detail}',
    'That isn’t our move here. {detail}',
    'A reasonable idea, but no. {detail}',
    'Not this time. {detail}',
    'Think again. {detail}',
    'Hmm, not that one. {detail}',
    'Close, but not correct. {detail}',
  ],
  wrongAgain: [
    'Follow the arrow. {detail}',
    'I’ve marked the move for you. {detail}',
    'Let me show you. {detail}',
    'The arrow shows the way. {detail}',
  ],
  lineClean: [
    'A flawless run. Well done.',
    'Perfect. That line is learnt.',
    'Not a single error. Excellent.',
    'Very good indeed. I’ll test that one again in a few days.',
    'Faultless. Let’s move on.',
    'Excellent work. Every move correct.',
  ],
  lineMessy: [
    'Finished, with a few errors. We will revisit it soon.',
    'You made it through. It will come back shortly for review.',
    'Some slips there. Repetition will fix them.',
    'Completed. Let’s review it again soon.',
    'Good effort. A little more practice and it will stick.',
  ],
  drillStart: [
    'Drill time. I will choose the lines at random.',
    'Let’s test your memory with mixed lines.',
    'Random lines now. Concentrate on each move.',
    'A drill. You play the London; I will vary Black’s replies.',
  ],
  streak: [
    '{n} in a row. Impressive.',
    'That makes {n} consecutive lines.',
    '{n} without an error. Excellent focus.',
    'A streak of {n}. Keep concentrating.',
  ],
  playStart: [
    'A full game now. Build your London setup, and I will warn you of any danger.',
    'Let’s play a game. Set up your pieces first, then look for chances.',
    'Game time. Play the London and watch your opponent’s threats.',
    'Now a real game. Remember: their threats first, then your plans.',
  ],
  onPlan: ['Good, the setup is taking shape.', 'All according to plan.', 'A very healthy London.', 'Exactly as we studied.'],
  leftPlan: [
    'Playable, but not the London. {detail}',
    'That leaves our usual setup. {detail}',
    'The London would play differently here. {detail}',
    'An alternative, but consider this. {detail}',
  ],
  theyLeftBook: [
    'Black has left the known lines. Continue with your setup.',
    'An unusual move. First ask what it threatens.',
    'We are on our own now. Complete development and castle.',
    'New territory. Check for threats, then follow the plan.',
  ],
  blunderWarn: [
    'Wait. {detail}',
    'Careful here. {detail}',
    'Please reconsider. {detail}',
    'One moment. {detail}',
    'Let’s pause. {detail}',
    'Hold on. {detail}',
  ],
  takeback: ['Good. Look again carefully.', 'Wise decision. Take your time.', 'Very sensible. Try again.', 'Good. Reconsider the position.'],
  playedAnyway: ['As you wish. Let’s see what happens.', 'Very well. We will learn either way.', 'Your decision. Let’s continue.'],
  theySlipped: [
    'Your opponent has made an error. Look carefully.',
    'There is an opportunity here. Can you find it?',
    'That was a mistake by Black. What does it allow?',
    'Look closely. Something has been left unprotected.',
    'A chance has appeared. Checks, captures and threats.',
  ],
  punished: [
    'Well spotted. You punished the mistake.',
    'Exactly. That is how errors are exploited.',
    'Very good. You took your chance.',
    'Precisely. Black pays for that.',
  ],
  missedPunish: [
    'There was a stronger move. {detail}',
    'Black escaped there. {detail}',
    'A missed opportunity. {detail}',
    'Something better was available. {detail}',
  ],
  greatMove: [
    'An excellent move. The only one that works.',
    'Very strong. A move beyond your rating.',
    'Superb. That is a master’s move.',
    'Excellent. You found the difficult move.',
  ],
  hanging: [
    'Take care: one of your pieces is under attack.',
    'Before moving, look at what Black threatens.',
    'One of your pieces needs attention.',
    'Black’s last move created a threat. Find it.',
  ],
  cct: [
    'Remember: checks, captures and threats. Theirs, then yours.',
    'Before each move, ask what your opponent’s last move does.',
    'A careful scan, please. Is anything left unprotected?',
    'Look for forcing moves on both sides.',
  ],
  mateThere: [
    'There is a checkmate available. Can you find it?',
    'Black’s king is vulnerable. Look at every check.',
    'A decisive move is available.',
  ],
  win: ['Well played, {name}. A fine win.', 'Excellent. The game is yours.', 'A well-earned victory.', 'Very good. You won convincingly.'],
  loss: ['A difficult game. We will learn from it.', 'Not this time. Let’s study what went wrong.', 'A loss is a lesson. Shall we try again?'],
  draw: ['A draw. A fair result.', 'The game is drawn.', 'Neither side could break through.'],
  hint: ['A hint. {detail}', 'Consider this. {detail}', 'Look here. {detail}', 'Think about the following. {detail}'],
  trapStart: ['A trap. {idea}', 'This position contains a trick. {idea}', 'Find the winning move. {idea}', 'A classic trap. {idea}'],
  trapRight: ['Correct. {idea}', 'Well found. {idea}', 'Precisely. {idea}', 'Excellent. {idea}'],
  trapWrong: ['Not quite. {detail}', 'Black escapes after that. {detail}', 'That isn’t the winning move. {detail}'],
  trapDone: ['That is the trap. Remember the pattern.', 'Well done. Watch for this in your games.', 'Excellent. On to the next.'],
};

const HYPE: Book = {
  greet: [
    'LET’S GO {name}! London time!',
    '{name}! Back in the gym! Let’s work!',
    'Ayy {name}! Ready to get better?',
    'Here we go, {name}! Pick a line!',
    'Welcome back, champ! Let’s get it!',
    '{name} in the building! Let’s go!',
  ],
  walkStart: [
    'Okay! {line}! {idea}',
    'Here we go: {line}! {idea}',
    'Next up, {line}! {idea}',
    'Love this one! {line}. {idea}',
    'Ooh, {line}! {idea}',
    'Big line: {line}. {idea}',
  ],
  walkYours: ['', '', '', 'Our move! ', 'Boom, us! ', 'Here we go! ', 'Now we strike! '],
  walkTheirs: ['', '', '', 'They hit back! ', 'Their move! ', 'Here comes Black! ', 'They try this! '],
  walkEnd: [
    'That’s the line! Your turn, let’s go!',
    'Done! Now you do it!',
    'Boom, full line! Show me you got it!',
    'That’s it! Now you drive!',
    'Easy! Your turn, champ!',
  ],
  tryStart: ['Your turn! Let’s go!', 'You’re up! Show me!', 'Okay champ, your moves!', 'Let’s see it! Go go go!', 'Your board now! Let’s cook!'],
  right: ['Yes!', 'Boom!', 'Let’s go!', 'Easy!', 'That’s it!', 'Yes sir!', 'Clean!', 'Money!', 'Nice!', 'Perfect!', 'Lovely!'],
  rightKey: [
    'YES! {idea}',
    'Boom! {idea}',
    'That’s it! {idea}',
    'Let’s go! {idea}',
    'Clean! {idea}',
    'Money move! {idea}',
    'Perfect! {idea}',
    'Huge! {idea}',
  ],
  wrong: [
    'Ooh, no no no! {detail}',
    'Not that one! {detail}',
    'Wait wait wait! {detail}',
    'Nope, try again! {detail}',
    'Close! {detail}',
    'Uh oh! {detail}',
    'Shake it off! {detail}',
    'Nah, champ! {detail}',
  ],
  wrongAgain: ['Follow the arrow! {detail}', 'Arrow’s up, let’s go! {detail}', 'I got you! {detail}', 'Here, look! {detail}'],
  lineClean: [
    'PERFECT! Not one mistake!',
    'Flawless! You’re a machine!',
    'Clean sweep! Let’s go!',
    'Ten out of ten!',
    'Unstoppable!',
    'No mistakes! Huge!',
  ],
  lineMessy: [
    'Done! A few bumps, we go again soon!',
    'You finished! We’ll run it back!',
    'Not perfect, but we keep grinding!',
    'Okay! That one’s coming back!',
  ],
  drillStart: ['DRILL TIME! Let’s go!', 'Random lines! Stay sharp!', 'Okay! Mixing it up! Ready?', 'Speed round! Let’s see what you got!'],
  streak: ['{n} IN A ROW!', '{n} straight! You’re cooking!', 'Streak of {n}! Keep going!', '{n} clean! Unreal!'],
  playStart: [
    'GAME TIME! London setup, let’s go!',
    'Real game! Build your setup and hunt!',
    'Let’s play! I’ve got your back!',
    'Okay! Full game! Set up and attack!',
  ],
  onPlan: ['Setup looking crispy!', 'Right on plan!', 'Textbook! Keep going!', 'Love this setup!'],
  leftPlan: ['Ooh, off the plan! {detail}', 'Not our London! {detail}', 'Wait, the London move! {detail}', 'Different idea! {detail}'],
  theyLeftBook: [
    'They’re improvising! Stay calm, finish your setup!',
    'New move! What does it attack?',
    'Off the map! Same plan, let’s go!',
    'Weird move! Check for threats!',
  ],
  blunderWarn: [
    'WAIT! {detail}',
    'Stop stop stop! {detail}',
    'Danger! {detail}',
    'Hold up, champ! {detail}',
    'Whoa whoa! {detail}',
    'Red alert! {detail}',
  ],
  takeback: ['Smart! Look again!', 'Good call! Try again!', 'Love it! Reset!', 'That’s the spirit! Again!'],
  playedAnyway: ['Bold! Let’s see!', 'Living dangerously! Okay!', 'You trust it? Let’s go!'],
  theySlipped: [
    'They messed up! FIND IT!',
    'Opportunity! Look look look!',
    'Something’s hanging! Go get it!',
    'They blundered! Hunt time!',
    'Big chance! Don’t miss it!',
  ],
  punished: ['YES! Punished!', 'BOOM! Thank you very much!', 'They paid for that! Let’s go!', 'Got ’em! Huge!', 'Clinical!'],
  missedPunish: ['Ooh, missed it! {detail}', 'So close! {detail}', 'Next time! {detail}', 'They escaped! {detail}'],
  greatMove: ['WHAT A MOVE!', 'Are you kidding me?! Brilliant!', 'That’s a grandmaster move!', 'Incredible! Only move!', 'Huge brain move!'],
  hanging: ['Look out! Something of yours is attacked!', 'Danger on your side!', 'Check your pieces, champ!', 'Something’s under fire!'],
  cct: ['Checks! Captures! Threats!', 'Scan the board! Both sides!', 'What’s their last move doing?', 'Eyes open! Anything hanging?'],
  mateThere: ['There’s MATE on the board! Find it!', 'Finish them! Look at the checks!', 'Checkmate is RIGHT THERE!'],
  win: ['YOU WON! LET’S GO {name}!', 'Victory! Huge!', 'GG! You crushed it!', 'Winner! Let’s go!'],
  loss: ['Ah, unlucky! Run it back!', 'We go again! Next one!', 'Tough! We learn and we bounce back!'],
  draw: ['Draw! Solid!', 'Split points! Not bad!', 'Even! Run it back!'],
  hint: ['Hint! {detail}', 'Psst! {detail}', 'Clue! {detail}', 'Look here! {detail}'],
  trapStart: ['TRAP TIME! {idea}', 'Find the killer move! {idea}', 'Ooh, sneaky one! {idea}', 'Spot the trick! {idea}'],
  trapRight: ['BOOM! {idea}', 'Got it! {idea}', 'YES! {idea}', 'Nailed it! {idea}'],
  trapWrong: ['Not quite! {detail}', 'They escape! {detail}', 'Close! {detail}'],
  trapDone: ['Trap learnt!', 'Remember that one!', 'Next trap! Let’s go!'],
};

export const PHRASES: Record<CoachPersona, Book> = { mate: MATE, professor: PROFESSOR, hype: HYPE };

/** Every phrase for a moment, falling back to Bazza's if a character has none. */
export function phrasesFor(persona: CoachPersona, moment: Moment): string[] {
  return PHRASES[persona][moment] ?? MATE[moment] ?? [];
}
