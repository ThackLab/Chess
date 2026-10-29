# Grandmasters

A free, private, chess.com-style app that runs entirely in your browser:

- **Play bots from 100 to 3200 Elo.** 19 bots with personalities, or pick any rating from 100 up. The lowest ones play like real beginners: they grab what you leave hanging, but lose track of their own pieces and never see a fork coming. Includes clocks (bullet to classical), hints, takebacks, premoves, draw offers and a training mode with a live eval bar. The Play screen opens on your usual opponent, so one tap starts a game; the strip of bots underneath switches opponent.
- **A full game review after every game (optional, on by default).** Stockfish 18 analyses every position on all your CPU cores (most of them already in the background while you play, so the review is usually ready a few seconds after the game ends), then:
  - gives each player an **accuracy** score (lichess's published formula), a **game rating** estimate and phase-by-phase ratings (opening / middlegame / endgame);
  - classifies every move as **Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Miss or Blunder**, using chess.com's expected-points thresholds;
  - explains each move in plain English. The coach replays the engine lines and spots hanging pieces, forks and double attacks, pins, skewers, discovered attacks, mate threats and material swings, e.g. *"This allows Qg5, which makes a double attack on the knight on e5 and the pawn on g2"*;
  - draws the best-move and refutation arrows, and marks classifications on the board;
  - lets you **Retry** any mistake, replay the best line or the follow-up, and jump straight to the next mistake;
  - **Learn from this game:** a guided lesson that walks you through your costliest moments. For each one you find the better move yourself, with a two-step hint (the idea, then the piece). If you pick a wrong move, it shows the reply that punishes it. Afterwards it explains what went wrong in the game, why the better move works, and the general rule behind it;
  - **Lessons from this game:** groups your mistakes into recurring themes (hanging pieces, forks, back-rank weakness, missed recaptures, early queen moves, king safety, endgame technique and more), ranked by how many points they cost you, plus what you did well;
  - writes a game summary;
  - optionally lets you **ask an AI coach** follow-up questions in plain English (Claude, with your own Anthropic API key).
- **A graded course.** Five levels, from Beginner to Advanced, each a short run of interactive lessons (explanations with diagrams, worked examples you step through, positions to solve, quizzes, and endgames played out against Stockfish):
  - **1 Beginner:** piece values, loose pieces, saving your pieces, checks-captures-threats, back-rank mate;
  - **2 Novice:** forks, pins, skewers, opening principles, mate with the queen;
  - **3 Intermediate:** discovered attacks and double check, removing the defender, setting up forks, smothered mate, mate with the rook;
  - **4 Club player:** overloading, deflection and interference, passed pawns, mating nets, the opposition;
  - **5 Advanced:** attacking the king (the Greek gift and sacrifices on h2/h7), calculating forcing lines to the end.

  Every tactics lesson opens with the pattern in four parts: what it is, what to look for, how to set it up and how to stop it. Spot-it drills follow, where you tap the fork square, the pinned piece or the overloaded defender, before you solve positions.

  Lessons unlock in order. Each one ends with a practice set drawn from the puzzle bank at that level, and is graded: one star for finishing, two for 70%, three for 90% (first-try answers count; hints and retries cost points). Each level closes with a 10-puzzle exam with no hints: 8 right passes (9–10 is an A, 8 a B) and unlocks the next level, and every retake has new puzzles. A short placement test lets stronger players start further up. The You page keeps a report card per level and skill bars per tactic.
- **Strategy and endgame courses**, open from the start:
  - **Strategy:** improving your worst piece, outposts, weak pawns (isolated, backward, doubled), rooks on open files and the seventh rank, good and bad bishops, pawn breaks (hit the base of the chain, play where your pawns point), and what to trade;
  - **Endgames:** mate with queen and rook, the opposition, the square of the pawn and the Réti manoeuvre, passed pawns, the outside passed pawn, rooks behind passed pawns, the Lucena position (build a bridge) and the Philidor defence. The endings are drills against Stockfish: win it, or hold the draw for a set number of moves. A move that throws the result away ends the drill with a hint.
- **Opening repertoire trainer.** Pick your openings (Italian, Ruy Lopez, Scotch, Queen's Gambit and London for White; 1...e5, Sicilian, French, Caro-Kann and Scandinavian against 1.e4; Queen's Gambit Declined, Slav and King's Indian against 1.d4) and drill them line by line: you play your side's moves, the app plays the replies, and a wrong move shows the right one. Lines come back with spaced repetition, sooner after a mistake. Each game review says where the game left your repertoire, and whether you or your opponent went off the line.
- **Puzzles.** About 1,200 puzzles, rated by how often the human-like bots solve them: classic collections (Reinfeld's *Win at Chess*, combinations from the *Encyclopedia of Chess Middlegames*, mate problems, positions from Lichess games) and puzzles mined from engine games, each with its source shown. A rated mode whose rating adapts as you solve, themed sets (free pieces, mates in 1–3, forks, pins, skewers, discovered attacks, removing the defender, sacrifices, combinations, promotion...) with your accuracy on each, and **Puzzle Rush**: 3 minutes, 3 lives, each puzzle a little harder than the last. Every puzzle has a single winning solution checked by Stockfish, two-step hints and an explanation; a wrong move shows the reply that refutes it. Once a puzzle is done, **See the idea** redraws the starting position with the key move and arrows to what it attacks. Puzzle ratings come from the bots, not from human solvers, so they are on their own scale; the Puzzles page says so.
- **A plan for today.** The home screen builds a short daily plan from what you need most: the mistakes due for review, puzzles on your weakest theme, the next lesson, openings that are due, and a game. Each item ticks off as you do it.
- **Insights.** Across your reviewed games: where your points go by phase, which patterns cost you most (with the lesson for each), how often you convert winning positions and come back from losing ones, time trouble, your openings, and this month against last.
- **Coach during games (optional).** In untimed games against a bot, the coach checks each move before the bot replies. If it loses a lot, it warns you and says what it allows (the same explanations as the game review), and you can take it back or play it anyway. It also points out when the bot slips. Coached games are not rated.
- **Play anyone online, live.** Create a challenge (1 minute to 15+10, or no clock), send the invite link or the 10-character code, and play in real time with clocks, draw offers, resign, abort and rematch. Your friend can play in the Android app or in any browser, iPhone included; a green dot shows when the other player is there. A reload, a dropped connection or the app going to sleep doesn't lose the game: it carries on from where it was. The home screen and the Play a friend screen show when it's your move, and finished games go into your library for review.
- **Your profile.** Pick your name and an avatar from 16 chess personalities, each with its own look and line and 1,024 variations: The Berserker, The Fortress, The Gambiteer, The Professor, The Engine, The Blitz Demon, The Zen Master, The Trickster, The Grinder, The Park Hustler, The Romantic, The Prodigy, The Wildcard, The Gremlin, The Classicist and The Arcade Boss. Friends see it in invites, the friends list, live games and nearby. The art is drawn on your device; nothing is downloaded.
- **Friends, nearby and anywhere.** In the Android app, **Find people nearby** uses Bluetooth to list other Grandmasters players close to you; one tap adds them, and they get a pop-up to add you back. Anyone (iPhone and browsers included) can also add friends with a link or a friend code. Tap **Invite** next to a friend and they get a pop-up on whatever screen they're on: **Play** takes you both straight into a live game, **Not now** tells you they can't. An invite also waits 15 minutes for a friend whose app is closed, and shows up when they open it.
- **Play a friend.** Pass and play on one device (with clocks and an auto-flipping board if you like), or play by link: each move is sent as a link that holds the whole game, and your friend answers with a link back. No account and no server. Finished games go into your library for review.
- **Learn from your mistakes.** Every blunder, mistake and miss you make becomes a practice puzzle, scheduled with spaced repetition until you've learned it. Each puzzle has hints and the lesson it teaches. The home screen and the Learn page recommend the lesson that matches the mistakes in your recent games, and each game review links to the relevant lesson.
- **Built for phones, with eleven themes.** The home screen works like a chess app should: a puzzle card, your ratings, your friends and your game history, with a big green Play button. Club is the default theme (dark greys, the green board, chunky green buttons); the others are Hearth (warm espresso and amber, a wooden board), Noir (black, with colour only for right and wrong), Graphite, Walnut, Ocean, Royal, Rose, Paper, High contrast and Visual aid. Each theme sets its own colours, fonts, board and pieces, and you can mix: 14 boards, 12 piece sets, text size, colour-blind safe colours for right and wrong, square names drawn on every square, reduced motion, and figurines or letters in move notation. Visual aid uses a font made for low vision (Atkinson Hyperlegible), bigger text and square names on the board. Moves in the text are set as chips with piece figurines, key words in an accent, numbers count up. Everything is one tap away in the ☰ side menu: play, puzzles, lessons, openings, your mistakes, your games and settings. On the board screens (games, reviews, lessons, puzzles) the board fills the width of the screen, with no navigation bar and no page scrolling, so the board never moves; the controls sit in a thumb bar at the bottom.
- **Analysis board.** Variation tree, 1–5 engine lines with arrows, threat view, PGN import (variations, comments and NAGs are kept), FEN import, position editor, PGN export, and one-click full review of the main line.
- **Review your chess.com and lichess games for free.** Import recent games by username, or paste or upload any PGN, including multi-game files.
- Game library, rating graph, opening stats, backup and restore, with a reminder to back up once you have games worth keeping. Installs as a PWA and keeps working offline once loaded.

## Get it

- **Android:** download `grandmasters.apk` from the [latest release](https://github.com/ThackLab/Chess/releases/latest), open it and allow installing from that app when Android asks. Android warns about any app that isn't from the Play Store; that's expected.
- **iPhone, iPad or a computer:** open https://thacklab.github.io/Chess/ (on iPhone, in Safari: **Share → Add to Home Screen**).

## Privacy and safety

Everything the app is made of is in this repository. The APK on the Releases page and the website are built from it by GitHub Actions, never by hand, and every build's log is public under the repository's **Actions** tab.

- **No account, no ads, no analytics, no tracking.** There is no server of ours. Games, reviews, puzzles and settings stay on the device (the browser's IndexedDB and local storage), and Settings has a button to wipe them.
- **Android permissions** (see `android/AndroidManifest.xml`): `INTERNET`, `VIBRATE`, and Bluetooth for finding people nearby. No contacts, camera, microphone or files; Android shows them under *Settings → Apps → Grandmasters → Permissions*.
  - *Bluetooth* ("Nearby devices": `BLUETOOTH_SCAN`, declared `neverForLocation`, and `BLUETOOTH_ADVERTISE`) is only asked for when you tap **Find people nearby**, and only used while that screen is open. It sends out your friend code and your name, nothing else, and nothing ever connects over Bluetooth (`android/src/com/thacklab/grandmasters/Nearby.java`).
  - On Android 11 and older, Android only lets apps scan for Bluetooth devices with the *location* permission, so those phones ask for it instead. The app never reads your location; the permission doesn't exist for the app on Android 12 and later (`maxSdkVersion="30"`).
- **What goes over the network, and only when you start it:**
  - *Live games:* the name you type and your moves, through public MQTT relays (`broker.emqx.io`, `broker.hivemq.com`, `test.mosquitto.org`), encrypted with a key made from the game code (see below). The relays, like any server you connect to, see your IP address.
  - *Friends:* once you've opened the Friends card, the app listens on your own inbox on the same relays while it's open, encrypted the same way with a key made from your friend code. Invites, "added you" and "can't play" messages go through it, carrying your name and friend code. The friends list itself stays on your device.
  - *Importing games:* your chess.com or lichess username goes to `api.chess.com` or `lichess.org` to fetch your public games.
  - *AI coach:* off by default; with your own Anthropic API key it sends the game you ask about to Anthropic. The key stays on your device.
  - *Games by link:* the whole game travels inside the link you send; nothing else is involved.
  - *The app itself:* loading the website fetches it from GitHub Pages. The Android app needs no download at all to run.
- **Checking the APK:** each release's notes give the commit it was built from, a link to its build log, and the APK's SHA-256 fingerprint (also attached as `grandmasters.apk.sha256`). Compare it with the file you downloaded (`sha256sum grandmasters.apk`, or any SHA-256 app), or build the APK yourself from the code (below). The APK is signed with uber-apk-signer's public debug key, so the signature alone doesn't say who built it; the fingerprint and the build log do.


**How live games work.** There is no game server: moves go through free public MQTT brokers (EMQX, HiveMQ and Mosquitto's test broker, all at once, so a game survives one of them being down). Every message holds the whole game with a version number and is encrypted (AES-GCM) with a key made from the game code, under a topic that is a hash of the code, so the brokers only see noise. Each device checks every state it receives: the moves must be legal and follow on from the moves it already has, and only the opponent's moves are accepted. The latest state is kept on the broker, so whoever reconnects gets it straight away. `src/lib/online/mqtt.ts` is a small MQTT-over-WebSocket client, `src/lib/online/relay.ts` the encryption and brokers, and `src/state/online.ts` the game rules (`src/state/online.test.ts` tests them). Friends and invites work the same way, through an inbox per friend code (`src/state/people.ts`).

## Run it

```bash
git clone https://github.com/ThackLab/Chess
cd chess
npm install
npm run dev        # http://localhost:5173
```

`npm run build` produces a static site in `dist/` that you can host anywhere. `npm run preview` serves that build locally.

The dev and preview servers send cross-origin-isolation headers, so the analysis board uses the multi-threaded engine. On hosts that can't send those headers (e.g. GitHub Pages), it falls back to the single-threaded engine automatically. Game reviews always run several engines in parallel.

### Android app (APK)

```bash
cd chess
./android/build-apk.sh      # -> android/build/grandmasters.apk
```

This needs only a JDK (17+), Node and curl; you don't need the Android SDK or Gradle. The script downloads a few pinned build tools (checksums in `android/tools.sha256`): the Android API jar, Google's d8 compiler, the aapt2 packaged inside Apktool, and uber-apk-signer. The app is a small WebView wrapper (`android/src/.../MainActivity.java`) that serves the web build straight from the APK, so it works fully offline. It adds a native bridge for saving files to *Downloads* and for the clipboard.

To install it, copy the APK to your phone, open it, and allow "install unknown apps" for your browser or file manager when Android asks.

By default the APK is signed with a public debug key, which is fine for your own phone and lets newer builds install over older ones. To use your own key, set `KEYSTORE`, `KS_PASS`, `KEY_ALIAS` and `KEY_PASS`.

### iPhone and iPad

There is no App Store build: on iOS the app runs as a web app. Open the deployed site (see below; for this repo https://thacklab.github.io/Chess/) in **Safari**, tap **Share → Add to Home Screen**, and open it from the new icon. It then runs full screen and works offline. Games, reviews and puzzle progress are kept on the device; iOS keeps a home-screen app's storage, but may clear a site's storage that is only used in a Safari tab and not opened for a few weeks.

### Releases and the website

- **Android releases:** `.github/workflows/release.yml` publishes a release whenever the `version` in `package.json` has none yet: bump it and push to `main` (or run the workflow from the **Actions** tab). It tests the code, builds the APK from that commit and publishes it as a GitHub Release tagged `v<version>`, with its SHA-256 and a link to the build log.
- **The website:** `.github/workflows/pages.yml` tests and builds the app on every PR and deploys it to https://thacklab.github.io/Chess/ on every push to `main`. On a fork, turn it on first under *Settings → Pages → Build and deployment* by setting the source to **GitHub Actions**.

## How the bots work

- **Under 1500 Elo:** the bots model what a player at that level *notices*. Weaker players rarely lose because they calculate a little worse on every move. They lose because they don't see things: the threat to their own knight, the move that leaves a piece hanging, the fork two moves away. So each turn the bot only considers the moves it noticed:
  - **What even beginners see:** a piece they can simply take. An obvious free piece is spotted 84% of the time at 100 and nearly always by 1450. A piece that has just landed in front of the bot, or one a pawn can take, is spotted more often; a long diagonal shot, a knight's capture or a capture backwards less.
  - **What they don't:** threats to their own pieces (noticed 35% of the time at 100, 50% at 250, 78% at 850, 93% at 1450), anything deeper than the move in front of them, and often the reply to their own move: now and then they judge a move without looking at it (30% of the time at 100, 5% at 850, about 1% at 1450). That's where their hung pieces come from. A mate in one is spotted half the time at 100 and nearly always at 1450.
  - **How they look at a move:** low down, the way a beginner checks one: what it takes, and whether the opponent can take something straight back. That blends into Stockfish's shallow search between 700 and 1450. (Stockfish's shallow search keeps searching after a check, which is how the earlier low-rated bots found forks hidden behind checks.) From about 500 up the bot sometimes also considers Stockfish's best move, and judges with more of its deep evaluation as the rating rises.
  - **Taste:** low-rated bots love giving check and bringing the queen out early; both fade out by about 850.
  - **Finishing games:** when clearly winning, it sometimes plays the engine's move (78% of the time at 1450). Below 700 that only happens in a nearly empty endgame, so beginners don't suddenly play like engines.
  - The settings are a table of anchor ratings in `src/lib/bots/brain.ts`, interpolated in between.
  - **Measuring:** `BOT_AUDIT="100,250,500,850,1150,1450;150" npx vitest run src/test/botAudit.test.ts --silent=false` puts each level in positions from the puzzle bank and reports how often it takes a free piece, mates in one, finds a real tactic (fork, pin, skewer, discovery, mate in two, where nothing is simply hanging), saves its own hanging piece, and blunders in the positions where a player blundered. Currently:

    | Level | Takes a free piece | Mate in one | Finds a real tactic | Saves its own piece | Blunders |
    |------:|---:|---:|---:|---:|---:|
    | 100   | 77% | 52% | 11% | 41% | 63% |
    | 250   | 79% | 55% |  9% | 48% | 58% |
    | 500   | 85% | 71% | 15% | 64% | 36% |
    | 850   | 92% | 91% | 52% | 81% | 32% |
    | 1150  | 97% | 99% | 83% | 94% |  8% |
    | 1450  | 100% | 99% | 94% | 96% |  5% |

    Before this model the 100 bot took a free piece only 49% of the time but found a real tactic 24% of the time (250: 54% and 31%, 500: 66% and 55%): the wrong way round for a beginner.

    `BOT_LADDER="250:100,500:250,850:500,1150:850;12" npx vitest run src/test/botLadder.test.ts --silent=false` plays head-to-head matches and reports the implied rating gap. Over 12–16 games each: 250 beats 100 18/24 (implied gap ~190, labelled 150), 500 beats 250 10/12 (280 vs 250), 850 beats 500 14/16 (338 vs 350) and 1150 beats 850 14/16 (338 vs 300). `BOT_CAL`, `BOT_SEE` and `BOT_DUEL` (in `src/test/`) measure blunder rates in self-play, the older hanging-piece test and each side's big mistakes.
- **1500–3190:** Stockfish's `UCI_LimitStrength` / `UCI_Elo`. Its scale is calibrated against engines at long time controls, and at the app's speed its low settings play weaker than labelled, so the app passes a slightly higher `UCI_Elo` at the low end (+230 at 1500, fading out by 2300; see `stockfishEloFor`). With that, the 1450 human-model bot scores 44% against 1500 and 38% against 1600 over 16 games.
- **3200:** full-strength Stockfish.
- Bots open from an opening book of 3,300+ named lines, so their openings vary from game to game.

Bot-vs-bot matches can be run with `BOT_MATCH="1000,1300,10" npx vitest run src/test/botMatch.test.ts --silent=false`.

## How the review works

1. Every position is analysed at a fixed depth (Fast 12 / Standard 16 / Deep 20) with three engine lines. A consistency pass re-analyses deeper any position whose evaluation contradicts its neighbour's. To make this fast without lowering the depth:
   - **While you play**, a separate single-threaded engine analyses the game's positions at the review depth, newest first, and stores them in an IndexedDB cache (`src/state/liveAnalysis.ts`, `src/lib/review/evalCache.ts`). The review only searches the positions it doesn't find there. It can be turned off in Settings ("Analyse while you play").
   - Building the review from the evaluations (classification, coach text, tactics detection) takes a fraction of a second: the static exchange evaluator works on a plain board array instead of chess.js move generation.
   - `REVIEW_SPEED="<games>" npx vitest run src/test/reviewSpeed.test.ts --silent=false` plays bot games, simulates the background analysis, and compares the review from that cache, a review from scratch and a second review from scratch with a review 4 plies deeper. On 4 bot games (213 moves), the review from the cache took 0.7s in all against 61s from scratch, and matched the deeper review just as well: 39 moves classified differently from it, the same as from scratch (a second review from scratch: 41). The background analysis needed 0.8s a move on one thread, so it keeps up with normal play.
2. Evaluations are converted to expected points with lichess's logistic model. Each move's loss decides its class: ≤0.02 Excellent, ≤0.05 Good, ≤0.10 Inaccuracy, ≤0.20 Mistake, otherwise Blunder. The engine's own move is Best.
3. The special classes:
   - **Brilliant:** a sound sacrifice of at least two points that is the best move, in a position that wasn't already completely winning.
   - **Great:** the only move that keeps the evaluation, or one that punishes an opponent's mistake.
   - **Miss:** failing to cash in on a mistake or tactic without actually spoiling the position.
   - **Book:** follows the lichess opening database.
4. The coach text comes from static tactics detection (legal-move SEE, forks, pins, skewers, discovered attacks, mate threats) combined with the material balance along the engine's lines.

`REVIEW_DEMO=1 npx vitest run src/test/reviewDemo.test.ts --silent=false` prints a full review of Morphy's Opera Game in the terminal.

## The course and the puzzles

- **Levels** are defined in `src/lib/learn/levels.ts` (lessons, exam themes and rating band per level, the unlocking rules and grading), and the strategy and endgame courses in `src/lib/learn/courses.ts`. The lessons live in `src/lib/learn/curriculum.ts`, `lessons2.ts`, `strategy.ts` and `endgames.ts`. `npm test` checks that every position and move is legal and that the courses hang together (every lesson belongs to a level or a course, every link points at a real lesson). `CURRICULUM=1 npx vitest run src/test/curriculum.test.ts --silent=false` also checks the lessons against Stockfish: a puzzle's key move has to be the engine's best and clearly better than any alternative; a quiz's right answers have to be within half a pawn of the best move and its wrong answers clearly worse than the right ones; a drill has to start from a won position (or, to hold, a drawn one).
- **Opening repertoires** (`public/repertoires.json`) are built offline: `REPERTOIRE=1 npx vitest run src/test/repertoireBuild.test.ts --silent=false`. From each opening's starting moves, your side plays one move in every position: the most popular book move among those Stockfish rates within a quarter of a pawn of the best (system openings like the London follow their usual set-up when it is about as good). The other side plays its main book replies, wide near the start and narrower later, with Stockfish's main replies added where the book is thin, and past the book both sides play Stockfish's moves, so every line runs 12 moves past the starting moves.
- **Puzzles** (`public/puzzles.json`) are mined offline from engine games: `PUZZLE_GEN="<games>,<workers>" npx vitest run src/test/puzzleGen.test.ts --silent=false`. Each game is played by a deliberately sloppy engine (it picks among its top moves, more loosely in some games than others). At every position, each plausible mistake - one of the engine's top 12 moves that throws away 2.5+ pawns - is tried as a puzzle start. It becomes a puzzle only if the reply is the single move that wins, and the line continues for as long as the solver's move stays unique. Puzzles are tagged by tactic (fork, pin, skewer, discovered attack, double check, removing the defender, back-rank or smothered mate, sacrifice, promotion and so on). Plain captures of a hanging piece are by far the commonest find, so most of them are skipped.
- **Classic puzzles** come from the files in `data/sources` (see its README): `PUZZLE_IMPORT="<workers>" npx vitest run src/test/puzzleImport.test.ts --silent=false` checks every position with Stockfish and keeps it only if the book move is the engine's best, it is clearly better than the second-best move, and it wins (forced mate, or at least two points of material). Mates use the engine's mating line; other puzzles continue for as long as the solver's move stays unique. The result goes to `data/puzzles-real.json`.
- **Puzzle ratings** come from the bots: `PUZZLE_RATE="<workers>" npx vitest run src/test/puzzleRate.test.ts --silent=false` lets the human-like bots from 300 to 1900 try every puzzle twice, and rates it where a bot solves it about half the time (a logistic fit, with a heuristic estimate as a weak prior). The level exams and practice sets draw from these ratings. `PUZZLE_BANK=1 npx vitest run src/test/puzzleBank.test.ts` builds `public/puzzles.json` from the imported and mined puzzles. `PUZZLE_DIR=<dir>` points the import, mining and rating runs at another folder, so long runs don't touch `data/`.
- `PROBE=fens.json npx vitest run src/test/probe.test.ts --silent=false` prints Stockfish's top lines for a list of positions, which helps when writing new lessons.

## Development

```bash
npm test           # unit tests (engine, PGN, tactics, classification)
npm run typecheck
npm run format
```

Project layout:

| Path | What |
| --- | --- |
| `src/lib/engine` | UCI protocol, the promise-based `Engine` wrapper, the worker pool |
| `src/lib/review` | win probability, accuracy, classification, coach explanations, the review pipeline |
| `src/lib/chess` | PGN tree parser/writer, tactics detection, opening book |
| `src/lib/bots` | bot roster and move selection |
| `src/lib/learn` | levels, courses and grading, the lessons, repertoires, puzzle tagging and loading, today's plan, training recommendations |
| `src/lib/coach` | the in-game blunder check, and the optional Claude-powered coach |
| `src/pages` | Home (play and today's plan), Puzzles, PuzzleSession, Rush, Learn, Lesson, Exam, Openings, Insights, Friend, You, Appearance, Play (options), Game, Review, Analysis, Games, Practice, Import, Settings |
| `scripts/prepare.mjs` | copies the Stockfish WASM into `public/engine` (runs automatically before dev/build/test) |
| `scripts/build-openings.mjs` | rebuilds `public/openings.json` from `data/openings/*.tsv` |

## Credits and licences

- [Stockfish 18](https://stockfishchess.org/) via [stockfish.js](https://github.com/nmrugg/stockfish.js), GPLv3
- [chessground](https://github.com/lichess-org/chessground), GPLv3, including the cburnett piece set
- [chess.js](https://github.com/jhlywa/chess.js), BSD-2
- lichess [chess-openings](https://github.com/lichess-org/chess-openings), CC0
- Puzzle positions from the [sunfish](https://github.com/thomasahle/sunfish) test files (*Win at Chess*, Lichess game positions, mate problems), GPLv3, and the [Arasan](https://github.com/jdart1/arasan-chess) *Encyclopedia of Chess Middlegames* test suite, MIT
- [lucide](https://lucide.dev/) icons, ISC
- Avatars drawn with [DiceBear](https://www.dicebear.com/) (MIT), in these styles (`src/lib/avatars.ts` says which personality uses which): Adventurer and Lorelei by Lisa Wischofsky (CC BY 4.0, CC0), Avataaars, Bottts and Open Peeps by Pablo Stanley (free for personal and commercial use; Open Peeps CC0), Big Ears by The Visual Team, Big Smile by Ashley Seo, Croodles by vijay verma, Dylan by Natalia Spivak, Fun Emoji by Davis Uche, Micah by Micah Lanier, Miniavs by Webpixels and Personas by Draftbit (all CC BY 4.0), Notionists by Zoish (CC0) and Pixel Art by DiceBear (CC0). The profile page credits each one too
- Fonts via [Fontsource](https://fontsource.org/), all OFL: [Inter](https://rsms.me/inter/), Instrument Serif, Fraunces, Newsreader, JetBrains Mono, and Atkinson Hyperlegible Next (Braille Institute)
- Piece sets from [lichess](https://github.com/lichess-org/lila/tree/master/public/piece), each under its own licence (GPL, MIT, Apache 2.0, CC BY 4.0 or CC0); authors in `public/pieces/README.md` and on the Appearance page

Because it bundles GPLv3 components, this app is distributed under GPL-3.0-or-later.
