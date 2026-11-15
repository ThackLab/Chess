// `#/london/play`: a full game from the London against a bot, with the
// talking coach watching. Black plays real London lines while the game is in
// the course, then the human-like bot takes over. The coach says when you
// leave the London setup and what the London move was, stops you before a
// blunder (take it back or play on), tells you when the bot slips and lets
// you find the punishment, and nudges you about threats - more at
// Beginner, less at Advanced.
import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Flag, Lightbulb, RotateCcw, Undo2, X } from 'lucide-react';
import { Chess } from 'chess.js';
import type { DrawShape } from 'chessground/draw';
import type { Key } from 'chessground/types';
import { Board } from '../components/Board';
import { CoachBubble } from '../components/CoachBubble';
import { Segmented, Toggle } from '../components/Widgets';
import { LONDON_LINES } from '../lib/london/lines';
import { buildTree, nodeAt, repliesFor } from '../lib/london/tree';
import { say, show, hush } from '../lib/coach/talk';
import { checkMove, evaluatePosition, stopCoach } from '../lib/coach/blunderCheck';
import { describeMove, plainChance, plainSlipHint, plainWarning, threatenedPiece } from '../lib/coach/plain';
import { sacrificeAmount } from '../lib/chess/tactics';
import { expectedFor } from '../lib/review/winprob';
import type { PositionEval } from '../lib/review/types';
import { chooseBotMove } from '../lib/bots/brain';
import { customBot } from '../lib/bots/bots';
import { getBotEngine } from '../lib/engine/manager';
import { getOpeningBook, loadOpeningBook } from '../lib/chess/openings';
import { START_FEN, legalDests, playUci } from '../lib/chess/utils';
import { treeFromMoves, writePgn } from '../lib/chess/pgn';
import { newId, saveGame, type GameResult } from '../lib/storage/db';
import { navigate } from '../lib/router';
import { playSound, soundForSan } from '../lib/sound';
import { ruleResult } from '../state/game';
import { useSettings } from '../state/settings';
import { LEVEL_NAME, useLondon, type LondonLevel } from '../state/london';
import { toShapes } from './London';

const ELOS = [250, 400, 600, 900, 1200, 1500, 1800];
/** How far into the game the coach still holds you to the London setup. */
const PLAN_PLIES = 20;
/** A jump in your expected score this big after the bot's move means it slipped. */
const SLIP = 0.22;

interface Pending {
  uci: string;
  text: string;
  arrows: string[];
}

interface Chance {
  pos: PositionEval;
  best: string;
}

export function LondonPlay() {
  const level = useLondon((s) => s.level);
  const elo = useLondon((s) => s.botElo[s.level]);
  const setBotElo = useLondon((s) => s.setBotElo);
  const gameResult = useLondon((s) => s.gameResult);
  const tree = useMemo(() => buildTree(LONDON_LINES), []);
  const [moves, setMoves] = useState<string[]>([]);
  const [warnOn, setWarnOn] = useState(true);
  const [pending, setPending] = useState<Pending | null>(null);
  const [thinking, setThinking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [over, setOver] = useState<{ result: GameResult; text: string; id?: string } | null>(null);
  const [arrows, setArrows] = useState<DrawShape[]>([]);
  const [danger, setDanger] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const chance = useRef<Chance | null>(null);
  const epRef = useRef(0.5);
  const yourMoves = useRef(0);
  const gameId = useRef(0);
  /** The coach has said the bot is off the London lines (once a game). */
  const offBookSaid = useRef(false);

  const bot = useMemo(() => ({ ...customBot(elo), name: `London bot ${elo}` }), [elo]);
  const chess = useMemo(() => {
    const c = new Chess();
    for (const u of moves) playUci(c, u);
    return c;
  }, [moves]);
  const fen = chess.fen();
  const yourTurn = !over && !pending && !checking && chess.turn() === 'w';
  const started = moves.length > 0;

  useEffect(() => {
    void loadOpeningBook();
    show({ moment: 'playStart', priority: 1 });
    return () => {
      hush();
      stopCoach();
    };
  }, []);

  const finish = (result: GameResult, text: string, played: string[]) => {
    const won = result === '1-0';
    const lost = result === '0-1';
    gameResult(won ? 'won' : lost ? 'lost' : 'drawn');
    playSound('end');
    void say({ moment: won ? 'win' : lost ? 'loss' : 'draw', priority: 2, facts: text });
    const g = gameId.current;
    setOver({ result, text });
    void saveFinished(played, result, text, elo).then((id) => {
      if (gameId.current === g) setOver((o) => (o ? { ...o, id } : o));
    });
  };

  const endIfOver = (c: Chess, played: string[]): boolean => {
    const r = ruleResult(c);
    if (!r) return false;
    const text = c.isCheckmate() ? (r.result === '1-0' ? 'You checkmated the bot.' : 'The bot checkmated you.') : 'The game is drawn.';
    finish(r.result, text, played);
    return true;
  };

  /** The bot answers: a London line while the game is in the course, the human-like bot after that. */
  const botMove = async (played: string[]) => {
    const g = gameId.current;
    setThinking(true);
    const node = nodeAt(tree, played);
    let uci = '';
    const started = Date.now();
    const bookMoves = node ? repliesFor(node, level) : [];
    // A weaker bot sometimes wanders off the lines, the way real opponents do.
    const stick = elo < 500 ? 0.8 : elo < 1000 ? 0.88 : 0.95;
    if (bookMoves.length && Math.random() < stick) uci = bookMoves[Math.floor(Math.random() * bookMoves.length)].uci!;
    else {
      const r = await chooseBotMove(getBotEngine(), { startFen: START_FEN, moves: played, bot, book: getOpeningBook() });
      uci = r.uci;
    }
    /** The bot left the course's lines while it still had a book move. */
    const deviated = bookMoves.length > 0 && !node!.next.has(uci);
    await new Promise((res) => setTimeout(res, Math.max(0, 500 + Math.random() * 500 - (Date.now() - started))));
    if (gameId.current !== g) return;
    const c = new Chess();
    for (const u of played) playUci(c, u);
    const before = c.fen();
    const m = playUci(c, uci);
    if (!m) return;
    playSound(soundForSan(m.san));
    const next = [...played, uci];
    setMoves(next);
    setThinking(false);
    if (endIfOver(c, next)) return;
    void afterBot(before, next, deviated);
  };

  /** What the coach says about the bot's move. */
  const afterBot = async (fenBefore: string, played: string[], deviated: boolean) => {
    const g = gameId.current;
    if (deviated && !offBookSaid.current && played.length < PLAN_PLIES) {
      offBookSaid.current = true;
      void say({ moment: 'theyLeftBook', priority: 1, bookOnly: true });
    }
    const pos = await evaluatePosition(START_FEN, played);
    if (!pos || gameId.current !== g) return;
    const ep = expectedFor(pos.lines[0].score, 'w');
    const jump = ep - epRef.current;
    epRef.current = ep;
    const c = new Chess(pos.fen);
    const best = pos.lines[0].pv[0];
    const mateFor = pos.lines[0].score.type === 'mate' && pos.lines[0].score.value > 0 ? pos.lines[0].score.value : 0;
    if (mateFor && mateFor <= 2 && level !== 'advanced') {
      chance.current = { pos, best };
      void say({ moment: 'mateThere', priority: 1, facts: 'There is a forced checkmate for the student.' });
      return;
    }
    if (jump >= SLIP && best) {
      chance.current = { pos, best };
      void say({
        moment: 'theySlipped',
        priority: 2,
        facts: `The opponent just played: ${describeMove(fenBefore, played[played.length - 1], 'w')}. ${plainSlipHint(pos, 'w')}`,
      });
      return;
    }
    chance.current = null;
    const t = threatenedPiece(c.fen(), 'w');
    if (t) {
      setDanger(level === 'beginner' ? t.square : null);
      void say({ moment: 'hanging', priority: level === 'beginner' ? 1 : 0, facts: t.text });
      return;
    }
    setDanger(null);
    if (level === 'beginner' && yourMoves.current > 0 && yourMoves.current % 6 === 0) void say({ moment: 'cct', priority: 0 });
  };

  const commit = (played: string[], c: Chess) => {
    setMoves(played);
    setPending(null);
    setArrows([]);
    setDanger(null);
    if (endIfOver(c, played)) return;
    void botMove(played);
  };

  const onMove = async (from: string, to: string, promotion?: string) => {
    if (!yourTurn) return;
    const uci = from + to + (promotion ?? '');
    const c = new Chess(fen);
    const m = playUci(c, uci);
    if (!m) return;
    playSound(soundForSan(m.san));
    const played = [...moves, uci];
    yourMoves.current++;
    const g = gameId.current;
    // Did you leave the London setup?
    const node = nodeAt(tree, moves);
    const book = node?.next.get(uci);
    let planNote = '';
    let planArrow: DrawShape[] = [];
    if (node && node.next.size && !book && moves.length < PLAN_PLIES) {
      const london = [...node.next.values()][0];
      planNote = london.move?.note ?? '';
      planArrow = [{ orig: london.uci!.slice(0, 2) as Key, dest: london.uci!.slice(2, 4) as Key, brush: 'blue' }];
    }
    // The coach checks the move before the bot answers.
    setMoves(played);
    setChecking(true);
    const v = warnOn ? await checkMove(START_FEN, played, 'w') : null;
    if (gameId.current !== g) return;
    setChecking(false);
    if (v?.warn && v.before && v.after) {
      const w = plainWarning(v.before, v.after, 'w');
      setPending({ uci, text: w.text, arrows: w.arrows });
      setArrows(toShapes(w.arrows));
      playSound('wrong');
      void say({ moment: 'blunderWarn', detail: w.text, priority: 2, facts: `The student played: ${describeMove(fen, uci, 'w')}.` });
      return;
    }
    // Punished a slip, or missed it?
    const ch = chance.current;
    chance.current = null;
    if (ch) {
      if (uci === ch.best || (v && v.ep >= expectedFor(ch.pos.lines[0].score, 'w') - 0.05))
        void say({ moment: 'punished', priority: 1, bookOnly: true });
      else {
        const p = plainChance(ch.pos, 'w');
        void say({ moment: 'missedPunish', detail: p.text, priority: 1 });
        setArrows(toShapes(p.arrows));
        setTimeout(() => setArrows([]), 3500);
      }
    } else if (planNote) {
      void say({ moment: 'leftPlan', detail: planNote, priority: 1, facts: `The student played ${describeMove(fen, uci, 'w')} instead.` });
      setArrows(planArrow);
      setTimeout(() => setArrows([]), 3500);
    } else if (v?.before && v.before.lines[0]?.pv[0] === uci && sacrificeAmount(fen, uci).amount >= 2) {
      void say({
        moment: 'greatMove',
        priority: 1,
        facts: `The student sacrificed material with ${describeMove(fen, uci, 'w')}, and it is the engine's best move.`,
      });
    } else if (book?.move?.key && moves.length < PLAN_PLIES) {
      // Beginners hear why each London move is played; others only when the coach is chatty.
      void say({ moment: 'rightKey', idea: book.move.note, priority: level === 'beginner' ? 1 : 0, bookOnly: true });
    }
    if (v) epRef.current = v.ep;
    commit(played, c);
  };

  const takeBack = () => {
    if (pending) {
      setMoves(moves.slice(0, -1));
      setPending(null);
      setArrows([]);
      setResetKey((k) => k + 1);
      void say({ moment: 'takeback', priority: 1, bookOnly: true });
      return;
    }
    if (thinking || checking || moves.length < 2 || over) return;
    gameId.current++;
    chance.current = null;
    setMoves(moves.slice(0, -2));
    setArrows([]);
    setDanger(null);
    void say({ moment: 'takeback', priority: 0, bookOnly: true });
  };

  const playAnyway = () => {
    if (!pending) return;
    void say({ moment: 'playedAnyway', priority: 1, bookOnly: true });
    const c = new Chess();
    for (const u of moves) playUci(c, u);
    commit(moves, c);
  };

  const hint = async () => {
    const g = gameId.current;
    const pos = chance.current?.pos ?? (await evaluatePosition(START_FEN, moves));
    if (!pos || gameId.current !== g) return;
    const best = pos.lines[0]?.pv[0];
    if (!best) return;
    if (chance.current) void say({ moment: 'hint', detail: plainSlipHint(pos, 'w'), priority: 2 });
    else {
      setArrows([{ orig: best.slice(0, 2) as Key, dest: best.slice(2, 4) as Key, brush: 'green' }]);
      void say({ moment: 'hint', detail: `Try this: ${describeMove(pos.fen, best, 'w')}.`, priority: 2 });
    }
  };

  const resign = () => {
    if (over || !started) return;
    gameId.current++;
    setThinking(false);
    finish('0-1', 'You resigned.', moves);
  };

  const newGame = () => {
    gameId.current++;
    chance.current = null;
    epRef.current = 0.5;
    yourMoves.current = 0;
    offBookSaid.current = false;
    setMoves([]);
    setPending(null);
    setOver(null);
    setArrows([]);
    setDanger(null);
    setThinking(false);
    setChecking(false);
    void say({ moment: 'playStart', priority: 1, bookOnly: true });
  };

  const last = moves.length ? moves[moves.length - 1] : undefined;
  const highlights = useMemo(() => (danger ? new Map([[danger, 'london-danger']]) : undefined), [danger]);
  const shapes = useMemo(() => [...arrows], [arrows, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="game-layout focus-screen lesson-screen london-screen">
      <div className="board-column">
        <div className="player-bar lesson-top">
          <button className="icon-btn" onClick={() => navigate('/london')} aria-label="Close">
            <X size={22} />
          </button>
          <b>
            vs {bot.name} · {LEVEL_NAME[level]}
          </b>
          <span className="spacer" />
          <span className="faint">{thinking ? 'thinking…' : checking ? 'coach is looking…' : yourTurn ? 'your move' : ''}</span>
        </div>
        <div className="board-row">
          <Board
            fen={fen}
            orientation="white"
            movableColor={yourTurn ? 'white' : undefined}
            dests={yourTurn ? legalDests(chess) : undefined}
            lastMove={last ? [last.slice(0, 2), last.slice(2, 4)] : undefined}
            check={chess.inCheck()}
            shapes={shapes}
            highlights={highlights}
            onMove={(f, t, p) => void onMove(f, t, p)}
            viewOnly={!yourTurn}
          />
        </div>
      </div>
      <div className="side-panel">
        <div className="panel-body">
          <CoachBubble idle="Play your London. I’ll watch your back." />
          {pending && (
            <div className="london-warn">
              <span className="coach-step">Take it back?</span>
              <div className="row">
                <button className="btn primary small" onClick={takeBack}>
                  <Undo2 size={16} /> Take it back
                </button>
                <button className="btn small" onClick={playAnyway}>
                  Play it anyway
                </button>
              </div>
            </div>
          )}
          {over && (
            <div className={`london-result ${over.result === '1-0' ? 'good' : ''}`}>
              <span className="coach-step">{over.result === '1-0' ? 'You won' : over.result === '0-1' ? 'You lost' : 'Draw'}</span>
              <p className="coach-text">{over.text}</p>
              {over.id && (
                <button className="btn small" onClick={() => navigate(`/review/${over.id}`)}>
                  <BookOpen size={16} /> Review the game
                </button>
              )}
            </div>
          )}
          {!started && !over && (
            <div className="london-setup">
              <span className="coach-step">Bot strength</span>
              <Segmented<number>
                value={ELOS.includes(elo) ? elo : ELOS[1]}
                options={ELOS.map((e) => ({ value: e, label: String(e) }))}
                onChange={(e) => setBotElo(level as LondonLevel, e)}
              />
              <Toggle checked={warnOn} onChange={setWarnOn} label={<span>Stop me before a blunder</span>} />
              <p className="faint">You’re White. Coached games aren’t rated, but they go in your games list so you can review them.</p>
            </div>
          )}
        </div>
        <div className="play-controls">
          {over ? (
            <button className="ctl wide go" onClick={newGame}>
              <span className="ctl-ico">
                <RotateCcw size={20} />
              </span>
              <span className="ctl-label">New game</span>
            </button>
          ) : (
            <>
              <button className="ctl" onClick={takeBack} disabled={!pending && (moves.length < 2 || thinking || checking)}>
                <span className="ctl-ico">
                  <Undo2 size={20} />
                </span>
                <span className="ctl-label">Take back</span>
              </button>
              <button className="ctl wide" onClick={() => void hint()} disabled={!yourTurn}>
                <span className="ctl-ico">
                  <Lightbulb size={20} />
                </span>
                <span className="ctl-label">Hint</span>
              </button>
              <button className="ctl" onClick={resign} disabled={!started}>
                <span className="ctl-ico">
                  <Flag size={20} />
                </span>
                <span className="ctl-label">Resign</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Saves a finished coached game to your games list, so it can be reviewed. */
async function saveFinished(moves: string[], result: GameResult, termination: string, elo: number): Promise<string> {
  const name = useSettings.getState().playerName || 'You';
  const white = { name, isUser: true };
  const black = { name: `London bot ${elo}`, elo, botId: `custom-${elo}` };
  const d = new Date();
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const tree = treeFromMoves(START_FEN, moves, {
    Event: 'London coach',
    Site: 'Grandmasters',
    Date: date,
    White: white.name,
    Black: black.name,
    BlackElo: String(elo),
    Termination: termination,
  });
  const c = new Chess();
  const sans: string[] = [];
  const fens = [c.fen()];
  for (const u of moves) {
    const m = playUci(c, u);
    if (m) sans.push(m.san);
    fens.push(c.fen());
  }
  const id = newId();
  await saveGame({
    id,
    createdAt: Date.now(),
    source: 'bot',
    white,
    black,
    result,
    termination,
    startFen: START_FEN,
    moves,
    sans,
    pgn: writePgn(tree, { result }),
    timeControl: 'Untimed',
    opening: getOpeningBook()?.classify(fens)?.name,
    userColor: 'w',
    date,
  });
  return id;
}
