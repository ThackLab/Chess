import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Gauge, Microscope, Play, RotateCcw, SkipForward, X } from 'lucide-react';
import { Chess } from 'chess.js';
import type { DrawShape } from 'chessground/draw';
import type { Key } from 'chessground/types';
import { Board, type PromotionPiece } from '../components/Board';
import { ClassIcon, boardBadge } from '../components/ClassIcon';
import { MoveList, MoveStrip } from '../components/MoveList';
import { AiCoachChat } from '../components/AiCoachChat';
import { EvalBar, EvalGraph, PlayerBar, ScoreChip, Segmented, type GraphPoint } from '../components/Widgets';
import { getAnalysisEngine } from '../lib/engine/manager';
import { formatLine, legalDests, moveToUci, playUci } from '../lib/chess/utils';
import { navigate } from '../lib/router';
import { playSound, soundForSan } from '../lib/sound';
import { evalScore } from '../lib/review/classify';
import { gameLessons, moveLesson, type GameLessons } from '../lib/review/lessons';
import { hintsFor, refutationText } from '../lib/review/hints';
import { LESSON_FOR_THEME, findLesson } from '../lib/learn/curriculum';
import { bestIdeaSentence, standing } from '../lib/review/explain';
import { captionMove, momentVariations, type Variation } from '../lib/coach/story';
import { CLASS_META, CLASS_ORDER, type Classification, type GameReview, type Phase, type ReviewedMove } from '../lib/review/types';
import { expectedFor, scoreToExpected } from '../lib/review/winprob';
import { getGame, getReview, onDbChange, saveGame, savePuzzles, saveReview, type GameRecord } from '../lib/storage/db';
import { summariseGame } from '../lib/review/review';
import { puzzlesFrom, useReviewer } from '../state/reviewer';
import { findBot, monogram } from '../lib/bots/bots';
import { AvatarFace, BotFace } from '../components/Avatar';
import { debriefIntro } from '../lib/coach/debrief';
import { useCoach } from '../state/coach';
import { useSettings } from '../state/settings';
import type { Score } from '../lib/engine/uci';
import { CountUp, Moves, Rich, San } from '../components/Rich';
import { RepertoireNote } from './Openings';

const SUMMARY_CLASSES: Classification[] = CLASS_ORDER.filter((c) => c !== 'forced');
const BAD: Classification[] = ['inaccuracy', 'mistake', 'miss', 'blunder'];

type RetryState = {
  state: 'try' | 'correct' | 'wrong' | 'revealed';
  tried?: string;
  /** Why the tried move fails, from the engine's reply. */
  refutation?: string | null;
  checking?: boolean;
  attempts: number;
  hints?: number;
};
type Guided = { plies: number[]; idx: number; results: Record<number, 'first' | 'later' | 'revealed'>; done: boolean };

/**
 * "Show me" at one of your moves: watch the lines (what happened, the better
 * move, other ideas) one tap at a time, then play the better line yourself,
 * then try anything and see what the engine answers.
 */
interface Shop {
  ply: number;
  vars: Variation[];
  v: number;
  idx: number;
  mode: 'watch' | 'yourturn' | 'tinker';
  turn: { moves: string[]; misses: number; done: boolean; note?: string };
  tinker: { moves: string[]; notes: string[]; thinking: boolean };
}

function useGameAndReview(gameId: string) {
  const [game, setGame] = useState<GameRecord | null | undefined>(undefined);
  const [review, setReview] = useState<GameReview | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [g, r] = await Promise.all([getGame(gameId), getReview(gameId)]);
      if (!alive) return;
      setGame(g ?? null);
      setReview(r ?? null);
    };
    void load();
    const off = onDbChange(load);
    return () => {
      alive = false;
      off();
    };
  }, [gameId]);
  return { game, review };
}

/** "4... Bxf3" with the move in notation style (never uppercased with the label around it). */
function MoveName({ m }: { m: ReviewedMove }) {
  return (
    <>
      {Math.floor(m.ply / 2) + 1}
      {m.color === 'w' ? '.' : '...'} <San san={m.san} />
    </>
  );
}

/** The coach comment without its closing "Best was ..." sentence, for when the best move gets its own section. */
const withoutBest = (comment: string) => comment.replace(/\s*Best was [^]*$/, '');

function PhaseBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="faint">–</span>;
  const cls: Classification =
    value >= 90 ? 'best' : value >= 80 ? 'excellent' : value >= 70 ? 'good' : value >= 60 ? 'inaccuracy' : value >= 50 ? 'mistake' : 'blunder';
  return <ClassIcon cls={cls} size={24} title={`${value.toFixed(0)}% accuracy`} />;
}

function sanOf(fen: string, moves: string[]): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of moves) {
    const mv = playUci(c, u);
    if (!mv) break;
    out.push(mv.san);
  }
  return out;
}

function recaptureAt(moves: ReviewedMove[], i: number): string | undefined {
  const prev = i > 0 ? moves[i - 1] : undefined;
  return prev && prev.san.includes('x') ? prev.uci.slice(2, 4) : undefined;
}

/** Ply index (within the line) that a token of a formatted line belongs to. */
function tokenPly(tokens: string[], i: number): number {
  let sans = 0;
  for (let k = 0; k < i; k++) if (!/^\d+\.+$/.test(tokens[k])) sans++;
  return sans;
}

/** Performance estimates from a handful of moves are noise, so only show them for real games. */
function ratingText(review: GameReview, c: 'w' | 'b', isBot: boolean) {
  // A bot's strength is its rating; a guess from one game would only confuse.
  if (isBot) return '–';
  const s = c === 'w' ? review.white : review.black;
  const n = s.ratedMoves ?? review.moves.filter((m) => m.color === c && m.classification !== 'book').length;
  return n >= 8 ? s.estimatedRating : '–';
}

export function ReviewPage({ gameId, debrief }: { gameId: string; debrief?: boolean }) {
  const { game, review } = useGameAndReview(gameId);
  const job = useReviewer((s) => s.jobs[gameId]);
  const [cur, setCur] = useState(-1);
  const [flipped, setFlipped] = useState(false);
  const [showBest, setShowBest] = useState(true);
  const [line, setLine] = useState<{ base: string; moves: string[]; idx: number } | null>(null);
  const [retry, setRetry] = useState<RetryState | null>(null);
  const [guided, setGuided] = useState<Guided | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  useEffect(() => {
    if (shop?.mode === 'watch' && shop.idx)
      bodyRef.current?.querySelector('.shop-steps li.now')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [shop?.idx, shop?.mode, shop?.v]);
  const [focus, setFocus] = useState<'w' | 'b' | null>(null);
  /** Debrief mode (from the coach): a short talk first, then the key moments. */
  const [intro, setIntro] = useState(!!debrief);
  const markDebriefed = useCoach((s) => s.markDebriefed);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (review === null && game) void useReviewer.getState().start(gameId);
  }, [review, game, gameId]);

  useEffect(() => {
    if (game?.userColor) {
      setFocus(game.userColor);
      setFlipped(game.userColor === 'b');
    }
  }, [game?.userColor]);

  const moves = useMemo(() => review?.moves ?? [], [review]);
  useEffect(() => {
    if (intro && moves.length) setCur(moves.length - 1);
  }, [intro, moves.length]);
  const m: ReviewedMove | undefined = cur >= 0 ? moves[cur] : undefined;

  const lessons: GameLessons | null = useMemo(() => {
    if (!review || !game) return null;
    const tc = game.timeControl?.match(/^(\d+(?:\.\d+)?)\+/);
    return gameLessons(review, {
      userColor: focus ?? game.userColor,
      result: game.result,
      clocks: game.clocks,
      initialMs: tc ? +tc[1] * 60_000 : undefined,
    });
  }, [review, game, focus]);

  /** Moves to a ply, leaving any variation / retry. The panel text starts from the top. */
  const go = useCallback(
    (i: number) => {
      setCur(Math.max(-1, Math.min(moves.length - 1, i)));
      setLine(null);
      setRetry(null);
      bodyRef.current?.scrollTo({ top: 0 });
    },
    [moves.length],
  );

  const openShop = (ply: number): Shop | null => {
    if (!review) return null;
    const vars = momentVariations(review, ply, review.moves[ply].color);
    if (!vars.length) return null;
    return { ply, vars, v: 0, idx: 0, mode: 'watch', turn: { moves: [], misses: 0, done: false }, tinker: { moves: [], notes: [], thinking: false } };
  };
  const showMe = (ply: number) => {
    const next = openShop(ply);
    if (!next) return;
    setCur(ply);
    setLine(null);
    setRetry(null);
    setShop(next);
    bodyRef.current?.scrollTo({ top: 0 });
  };

  const startGuided = () => {
    if (!lessons?.practice.length) return;
    const plies = lessons.practice;
    setGuided({ plies, idx: 0, results: {}, done: false });
    setCur(plies[0]);
    setLine(null);
    if (debrief) {
      setRetry(null);
      setShop(openShop(plies[0]));
    } else setRetry({ state: 'try', attempts: 0 });
    bodyRef.current?.scrollTo({ top: 0 });
  };

  const guidedStep = (idx: number) => {
    if (!guided) return;
    if (idx >= guided.plies.length) {
      setGuided({ ...guided, done: true });
      if (debrief) markDebriefed(gameId);
      setCur(-1);
      setRetry(null);
      setShop(null);
      setLine(null);
      return;
    }
    setGuided({ ...guided, idx });
    setCur(guided.plies[idx]);
    setLine(null);
    if (debrief) {
      setRetry(null);
      setShop(openShop(guided.plies[idx]));
    } else setRetry({ state: 'try', attempts: 0 });
    bodyRef.current?.scrollTo({ top: 0 });
  };

  const exitGuided = () => {
    setGuided(null);
    setRetry(null);
    setShop(null);
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (shop?.mode === 'watch' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const n = shop.vars[shop.v].story.steps.length;
        setShop({ ...shop, idx: Math.max(0, Math.min(n, shop.idx + (e.key === 'ArrowRight' ? 1 : -1))) });
      } else if (e.key === 'ArrowRight') {
        if (line) setLine((l) => (l ? { ...l, idx: Math.min(l.moves.length, l.idx + 1) } : l));
        else if (!guided) go(cur + 1);
      } else if (e.key === 'ArrowLeft') {
        if (line) setLine((l) => (l ? { ...l, idx: Math.max(0, l.idx - 1) } : l));
        else if (!guided) go(cur - 1);
      } else if (e.key === 'f') setFlipped((f) => !f);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [line, guided, cur, go, shop]);

  const points: GraphPoint[] = useMemo(() => {
    if (review)
      return review.positions.map((p, i) => ({ value: scoreToExpected(evalScore(p)), cls: i > 0 ? review.moves[i - 1]?.classification : undefined }));
    if (job?.partial) {
      let last = 0.5;
      return job.partial.map((p) => {
        if (p) last = scoreToExpected(evalScore(p));
        return { value: last };
      });
    }
    return [];
  }, [review, job?.partial]);

  // ---------------------------------------------------------------- board state
  const board = useMemo(() => {
    if (!game) return null;
    if (shop && review) {
      const base = review.moves[shop.ply].fenBefore;
      const you = review.moves[shop.ply].color;
      const played =
        shop.mode === 'watch'
          ? shop.vars[shop.v].story.steps.slice(0, shop.idx).map((x) => x.uci)
          : shop.mode === 'yourturn'
            ? shop.turn.moves
            : shop.tinker.moves;
      const c = new Chess(base);
      let lastMove: [string, string] | undefined =
        shop.ply > 0 ? [moves[shop.ply - 1].uci.slice(0, 2), moves[shop.ply - 1].uci.slice(2, 4)] : undefined;
      for (const u of played) {
        playUci(c, u);
        lastMove = [u.slice(0, 2), u.slice(2, 4)];
      }
      const movable =
        c.turn() === you && !c.isGameOver() && ((shop.mode === 'yourturn' && !shop.turn.done) || (shop.mode === 'tinker' && !shop.tinker.thinking));
      return { fen: c.fen(), lastMove, check: c.inCheck(), dests: movable ? legalDests(c) : undefined, movable };
    }
    if (retry && m) {
      const c = new Chess(m.fenBefore);
      let fen = m.fenBefore;
      let lastMove: [string, string] | undefined = cur > 0 ? [moves[cur - 1].uci.slice(0, 2), moves[cur - 1].uci.slice(2, 4)] : undefined;
      const shown = retry.state === 'revealed' ? m.bestMove : retry.state !== 'try' ? retry.tried : undefined;
      if (shown) {
        playUci(c, shown);
        fen = c.fen();
        lastMove = [shown.slice(0, 2), shown.slice(2, 4)];
      }
      return { fen, lastMove, check: c.inCheck(), dests: retry.state === 'try' ? legalDests(c) : undefined, movable: retry.state === 'try' };
    }
    if (line) {
      const c = new Chess(line.base);
      // Before the line's first move, show the move that led to its starting position.
      const led = m && line.base === m.fenAfter ? m.uci : m && line.base === m.fenBefore && cur > 0 ? moves[cur - 1].uci : undefined;
      let lastMove: [string, string] | undefined = led ? [led.slice(0, 2), led.slice(2, 4)] : undefined;
      for (const u of line.moves.slice(0, line.idx)) {
        playUci(c, u);
        lastMove = [u.slice(0, 2), u.slice(2, 4)];
      }
      return { fen: c.fen(), lastMove, check: c.inCheck(), movable: false };
    }
    const fen = m ? m.fenAfter : game.startFen;
    const c = new Chess(fen);
    return { fen, lastMove: m ? ([m.uci.slice(0, 2), m.uci.slice(2, 4)] as [string, string]) : undefined, check: c.inCheck(), movable: false };
  }, [game, m, cur, moves, line, retry, shop, review]);

  const shapes = useMemo<DrawShape[]>(() => {
    if (shop) {
      if (shop.mode === 'watch') {
        const st = shop.vars[shop.v].story.steps[shop.idx - 1];
        return st ? [{ orig: st.uci.slice(0, 2) as Key, dest: st.uci.slice(2, 4) as Key, brush: st.mine ? 'green' : 'red' }] : [];
      }
      if (shop.mode === 'yourturn' && shop.turn.misses >= 2 && !shop.turn.done) {
        const want = shop.vars.find((x) => x.key === 'best')?.story.steps[shop.turn.moves.length]?.uci;
        return want ? [{ orig: want.slice(0, 2) as Key, dest: want.slice(2, 4) as Key, brush: 'blue' }] : [];
      }
      const last = shop.mode === 'tinker' ? shop.tinker.moves.at(-1) : undefined;
      return last && shop.tinker.moves.length % 2 === 0 ? [{ orig: last.slice(0, 2) as Key, dest: last.slice(2, 4) as Key, brush: 'red' }] : [];
    }
    if (!m || line) return [];
    if (retry) {
      // While solving, show nothing; once solved, mark the winning move.
      if ((retry.state === 'correct' || retry.state === 'revealed') && m.bestMove)
        return [{ orig: m.bestMove.slice(0, 2) as Key, dest: m.bestMove.slice(2, 4) as Key, brush: 'green' }];
      return [];
    }
    const out: DrawShape[] = [{ orig: m.uci.slice(2, 4) as Key, customSvg: { html: boardBadge(m.classification) } }];
    if (showBest && m.bestMove && m.bestMove !== m.uci && !['book', 'forced', 'best', 'brilliant', 'great'].includes(m.classification)) {
      out.push({ orig: m.bestMove.slice(0, 2) as Key, dest: m.bestMove.slice(2, 4) as Key, brush: 'green' });
    }
    if (showBest && ['mistake', 'blunder'].includes(m.classification) && review) {
      const reply = review.positions[cur + 1]?.lines[0]?.pv[0];
      if (reply) out.push({ orig: reply.slice(0, 2) as Key, dest: reply.slice(2, 4) as Key, brush: 'red', modifiers: { lineWidth: 8 } });
    }
    return out;
  }, [m, showBest, retry, line, review, cur, shop]);

  const hints = useMemo(() => {
    if (!m?.bestMove || !m.bestSan) return null;
    return hintsFor(m.fenBefore, m.bestMove, m.bestSan, { recaptureSquare: recaptureAt(moves, cur), line: m.bestLine });
  }, [m, cur, moves]);

  const highlights = useMemo(() => {
    if (shop?.mode === 'watch') {
      const st = shop.vars[shop.v].story.steps[shop.idx - 1];
      const h = new Map<string, string>();
      for (const sq of st?.squares ?? []) if (sq !== st.uci.slice(2, 4)) h.set(sq, 'hl-key');
      return h.size ? h : undefined;
    }
    if (shop) return undefined;
    if (m && retry && retry.state === 'try' && (retry.hints ?? 0) >= 2 && hints) return new Map([[hints.square, 'hl-key']]);
    if (!m || retry || line) return undefined;
    const h = new Map<string, string>();
    for (const sq of m.squares ?? []) if (sq !== m.uci.slice(2, 4)) h.set(sq, 'hl-key');
    return h.size ? h : undefined;
  }, [m, retry, line, hints, shop]);

  const currentScore: Score | undefined = useMemo(() => {
    if (!review || line || retry || shop) return undefined;
    return evalScore(review.positions[cur + 1]);
  }, [review, cur, line, retry, shop]);

  // ---------------------------------------------------------------- show me: your turn and tinker
  const onShopMove = async (from: string, to: string, promotion?: PromotionPiece) => {
    if (!shop || !review) return;
    const base = review.moves[shop.ply].fenBefore;
    const you = review.moves[shop.ply].color;
    if (shop.mode === 'yourturn') {
      const c = new Chess(base);
      for (const u of shop.turn.moves) playUci(c, u);
      const mv = playUci(c, from + to + (promotion ?? ''));
      if (!mv) return;
      const uci = moveToUci(mv);
      const line = shop.vars.find((x) => x.key === 'best')?.story.steps.map((x) => x.uci) ?? [];
      const want = line[shop.turn.moves.length];
      if (uci !== want) {
        playSound('illegal');
        setShop({
          ...shop,
          turn: {
            ...shop.turn,
            misses: shop.turn.misses + 1,
            note: shop.turn.misses >= 1 ? 'Follow the blue arrow.' : 'Not that one. Think back to the line you just watched.',
          },
        });
        return;
      }
      playSound(soundForSan(mv.san));
      const movesNow = [...shop.turn.moves, uci];
      const reply = line[movesNow.length];
      // Done after your third move of the line, or when the line runs out.
      const yours = movesNow.filter((_, i) => i % 2 === 0).length;
      const done = !reply || yours >= 3 || !line[movesNow.length + 1];
      const finished = (ms: string[]) => {
        setShop((cur) => (cur ? { ...cur, turn: { moves: ms, misses: cur.turn.misses, done: true, note: undefined } } : cur));
        if (guided && guided.results[shop.ply] === undefined)
          setGuided((g) => (g ? { ...g, results: { ...g.results, [shop.ply]: shop.turn.misses ? 'later' : 'first' } } : g));
      };
      setShop({ ...shop, turn: { ...shop.turn, moves: movesNow, note: undefined } });
      if (reply) {
        setTimeout(() => {
          playSound('move');
          const ms = [...movesNow, reply];
          if (done) finished(ms);
          else setShop((cur) => (cur ? { ...cur, turn: { ...cur.turn, moves: ms } } : cur));
        }, 500);
      } else finished(movesNow);
      return;
    }
    if (shop.mode === 'tinker') {
      const c = new Chess(base);
      for (const u of shop.tinker.moves) playUci(c, u);
      const fen = c.fen();
      const mv = playUci(c, from + to + (promotion ?? ''));
      if (!mv) return;
      const uci = moveToUci(mv);
      playSound(soundForSan(mv.san));
      const mine = captionMove(fen, uci, you).caption;
      const movesNow = [...shop.tinker.moves, uci];
      if (c.isGameOver()) {
        setShop({ ...shop, tinker: { moves: movesNow, notes: [...shop.tinker.notes, mine], thinking: false } });
        return;
      }
      setShop({ ...shop, tinker: { moves: movesNow, notes: [...shop.tinker.notes, mine], thinking: true } });
      const res = await getAnalysisEngine().analyse({ fen: base, moves: movesNow, limits: { depth: 12, movetime: 1500 }, multipv: 1 });
      const reply = res.bestmove;
      const score = res.lines[0]?.score;
      if (!reply) return setShop((cur) => (cur ? { ...cur, tinker: { ...cur.tinker, thinking: false } } : cur));
      const theirs = captionMove(c.fen(), reply, you).caption;
      const how = score ? ` Now you're ${standing(expectedFor(score, you))}.` : '';
      playSound('move');
      setShop((cur) =>
        cur ? { ...cur, tinker: { moves: [...movesNow, reply], notes: [...cur.tinker.notes, `${theirs}${how}`], thinking: false } } : cur,
      );
    }
  };

  // ---------------------------------------------------------------- retry
  const onRetryMove = async (from: string, to: string, promotion?: PromotionPiece) => {
    if (!m || !review || !retry) return;
    const c = new Chess(m.fenBefore);
    const mv = playUci(c, from + to + (promotion ?? ''));
    if (!mv) return;
    const uci = moveToUci(mv);
    playSound(soundForSan(mv.san));
    const before = review.positions[cur];
    const bestEp = expectedFor(evalScore(before), m.color);
    const known = before.lines.find((l) => l.pv[0] === uci);
    let ep: number | null = known ? expectedFor(known.score, m.color) : null;
    let reply = known?.pv[1];
    setRetry({ ...retry, tried: uci, state: 'try', checking: ep === null });
    if (ep === null) {
      const res = await getAnalysisEngine().analyse({ fen: c.fen(), limits: { depth: Math.min(review.depth, 16), movetime: 4000 } });
      ep = res.lines[0] ? expectedFor(res.lines[0].score, m.color) : 0;
      reply = res.lines[0]?.pv[0];
    }
    const ok = uci === m.bestMove || bestEp - ep <= 0.02 || c.isCheckmate();
    playSound(ok ? 'correct' : 'wrong');
    setRetry({
      tried: uci,
      state: ok ? 'correct' : 'wrong',
      refutation: ok ? null : refutationText(c.fen(), reply, ep),
      attempts: retry.attempts + 1,
      hints: retry.hints,
    });
    if (ok && guided && guided.results[cur] === undefined)
      setGuided({ ...guided, results: { ...guided.results, [cur]: retry.attempts === 0 ? 'first' : 'later' } });
  };

  const reveal = () => {
    setRetry({ state: 'revealed', attempts: retry?.attempts ?? 0 });
    if (guided && guided.results[cur] === undefined) setGuided({ ...guided, results: { ...guided.results, [cur]: 'revealed' } });
  };

  const claimSide = async (c: 'w' | 'b') => {
    if (!game) return;
    await saveGame({ ...game, userColor: c, white: { ...game.white, isUser: c === 'w' }, black: { ...game.black, isUser: c === 'b' } });
    if (review) {
      await saveReview(gameId, { ...review, summary: summariseGame(review, c, { result: game.result, termination: game.termination }) });
      await savePuzzles(puzzlesFrom(review, gameId, c));
    }
    setFocus(c);
    setFlipped(c === 'b');
  };

  if (game === undefined) return <div className="page muted">Loading…</div>;
  if (game === null)
    return (
      <div className="page empty">
        <h2>Game not found</h2>
        <button className="btn" onClick={() => navigate('/games')}>
          Back to games
        </button>
      </div>
    );

  const orientation = flipped ? 'black' : 'white';
  const top = orientation === 'white' ? 'b' : 'w';
  const bottom = top === 'w' ? 'b' : 'w';
  const info = (c: 'w' | 'b') => (c === 'w' ? game.white : game.black);
  const me = useSettings.getState();
  const summary = (c: 'w' | 'b') => (review ? (c === 'w' ? review.white : review.black) : null);
  const bar = (c: 'w' | 'b') => {
    const p = info(c);
    const s = summary(c);
    return (
      <PlayerBar
        avatar={
          p.isUser ? (
            <AvatarFace av={me.avatar} photo={me.photo} name={p.name || 'You'} />
          ) : p.botId && findBot(p.botId) ? (
            <BotFace bot={findBot(p.botId)!} />
          ) : (
            monogram(p.name || (c === 'w' ? 'White' : 'Black'))
          )
        }
        tint={undefined}
        name={p.name}
        elo={p.elo}
        fen={board?.fen ?? game.startFen}
        startFen={game.startFen}
        color={c}
        clock={
          s ? (
            <div className={`acc-box small ${c === 'b' ? 'dark' : ''}`} title="Accuracy">
              <CountUp value={s.accuracy} decimals={1} />
            </div>
          ) : undefined
        }
      />
    );
  };

  const running = job?.status === 'running';
  const progress = job ? job.done / Math.max(1, job.total) : 0;
  const retryable = !!m && BAD.includes(m.classification) && !!m.bestMove;
  const lesson = review && m ? moveLesson(review, cur) : null;
  const nextMistake = (() => {
    for (let i = cur + 1; i < moves.length; i++) if (BAD.includes(moves[i].classification) && (!focus || moves[i].color === focus)) return i;
    return null;
  })();
  const sideName = m ? (m.color === 'w' ? 'White' : 'Black') : '';

  const bestLineFor = (x: ReviewedMove) => (review ? review.positions[x.ply].lines[0]?.pv.slice(0, 10) : undefined);
  const showLine = (base: string, uciMoves: string[] | undefined) => uciMoves?.length && setLine({ base, moves: uciMoves, idx: 1 });

  // ---------------------------------------------------------------- panel content
  let panel: React.ReactNode = null;
  const side = focus ?? game.userColor;
  if (review && intro && !guided && lessons && side) {
    const talk = debriefIntro({ game, review, color: side }, lessons);
    const finish = () => {
      markDebriefed(gameId);
      navigate('/coach');
    };
    panel = (
      <div className="coach-card debrief-intro">
        <span className="coach-step">Your coach</span>
        <h3 className="coach-title">{talk.ending}</h3>
        {talk.good && (
          <p className="coach-text">
            <Rich text={talk.good} />
          </p>
        )}
        {talk.turn && (
          <p className="coach-text">
            <Rich text={talk.turn} />
          </p>
        )}
        <p className="coach-text">
          {talk.moments
            ? `Let's go through the ${talk.moments === 1 ? 'moment' : `${talk.moments} moments`} that mattered most. For each one I'll show you what happened, then the better move and a couple of other ideas, one tap at a time. Then you play it yourself, and you can try anything you like.`
            : 'Nothing big went wrong in this one. Well played.'}
        </p>
        <div className="row">
          {talk.moments ? (
            <button
              className="btn primary"
              onClick={() => {
                setIntro(false);
                startGuided();
              }}
            >
              Let's go <ChevronRight size={16} />
            </button>
          ) : (
            <button className="btn primary" onClick={finish}>
              Done
            </button>
          )}
          <button className="btn ghost" onClick={() => (setIntro(false), go(-1))}>
            See the full review
          </button>
        </div>
      </div>
    );
  } else if (review && shop) {
    const sm = review.moves[shop.ply];
    const v = shop.vars[shop.v];
    const steps = v?.story.steps ?? [];
    const why = moveLesson(review, shop.ply);
    const tabs: { label: string; on: boolean; go: () => void }[] = [
      ...shop.vars.map((x, i) => ({
        label: x.key === 'alt' ? `Try ${x.san}` : x.label,
        on: shop.mode === 'watch' && shop.v === i,
        go: () => setShop({ ...shop, mode: 'watch', v: i, idx: 0 }),
      })),
      {
        label: 'Your turn',
        on: shop.mode === 'yourturn',
        go: () => setShop({ ...shop, mode: 'yourturn', turn: { moves: [], misses: 0, done: false } }),
      },
      {
        label: 'Tinker',
        on: shop.mode === 'tinker',
        go: () => setShop({ ...shop, mode: 'tinker', tinker: { moves: [], notes: [], thinking: false } }),
      },
    ];
    const nextTab = tabs.findIndex((t) => t.on) + 1;
    const step = guided ? `Moment ${guided.idx + 1} of ${guided.plies.length} · ` : '';
    panel = (
      <div className="coach-card shop">
        <span className="coach-step">
          {step}
          <MoveName m={sm} />
        </span>
        <div className="shop-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.label} role="tab" aria-selected={t.on} className={t.on ? 'on' : ''} onClick={t.go}>
              {t.label}
            </button>
          ))}
        </div>

        {shop.mode === 'watch' && v && (
          <>
            <h3 className="coach-title">
              {v.label}: <San san={v.san} chip />
              {v.verdict && <span className="shop-verdict"> {v.verdict}</span>}
            </h3>
            {shop.idx === 0 && (
              <p className="coach-text faint">
                {v.key === 'played'
                  ? 'This is the position before your move. Tap ▶ to play it, then see what they do.'
                  : 'Same position. Tap ▶ to play this move and follow it through.'}
              </p>
            )}
            <div className="shop-controls">
              <button
                className="btn small"
                onClick={() => setShop({ ...shop, idx: Math.max(0, shop.idx - 1) })}
                disabled={shop.idx === 0}
                aria-label="Back a move"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="faint">
                {shop.idx} of {steps.length}
              </span>
              {shop.idx < steps.length ? (
                <button className="btn small primary" onClick={() => setShop({ ...shop, idx: shop.idx + 1 })} aria-label="Next move">
                  <ChevronRight size={18} />
                </button>
              ) : (
                tabs[nextTab] && (
                  <button className="btn small primary" onClick={tabs[nextTab].go}>
                    {tabs[nextTab].label} <ChevronRight size={14} />
                  </button>
                )
              )}
            </div>
            <ol className="shop-steps">
              {steps.slice(0, shop.idx).map((x, i) => (
                <li key={i} className={`${x.mine ? 'mine' : 'theirs'} ${i === shop.idx - 1 ? 'now' : ''}`}>
                  <San san={x.san} chip /> <Rich text={x.caption} />
                </li>
              ))}
            </ol>
            {shop.idx === steps.length && (
              <div className="shop-end">
                <p className="shop-outcome">{v.story.outcome}</p>
                {v.key === 'played' && why && (
                  <p className="coach-text">
                    <b>Why it matters:</b> {why.info.rule}
                  </p>
                )}
                {v.key === 'best' && (
                  <p className="coach-text">
                    <Rich text={bestIdeaSentence(review.positions[shop.ply], sm.color, sm.epBefore, recaptureAt(moves, shop.ply))} />
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {shop.mode === 'yourturn' && (
          <>
            <h3 className="coach-title">Your turn: play it yourself</h3>
            <p className="coach-text">
              Same position. Play the better line you just watched, starting with{' '}
              <San san={shop.vars.find((x) => x.key === 'best')?.san ?? ''} chip />. I'll play their replies.
            </p>
            {shop.turn.note && <p className="coach-text shop-note">{shop.turn.note}</p>}
            {shop.turn.done ? (
              <>
                <p className="shop-outcome good">That's it. You've played it with your own hands now.</p>
                <div className="row">
                  <button className="btn small" onClick={() => setShop({ ...shop, turn: { moves: [], misses: shop.turn.misses, done: false } })}>
                    <RotateCcw size={14} /> Again
                  </button>
                  <button className="btn small primary" onClick={tabs[tabs.length - 1].go}>
                    Tinker <ChevronRight size={14} />
                  </button>
                </div>
              </>
            ) : (
              <button className="btn small" onClick={() => setShop({ ...shop, turn: { moves: [], misses: shop.turn.misses, done: false } })}>
                <RotateCcw size={14} /> Start again
              </button>
            )}
          </>
        )}

        {shop.mode === 'tinker' && (
          <>
            <h3 className="coach-title">Tinker</h3>
            <p className="coach-text">Try any move you like. I'll answer the way a strong player would and tell you what each move does.</p>
            <ol className="shop-steps">
              {shop.tinker.notes.map((n, i) => (
                <li key={i} className={i % 2 === 0 ? 'mine' : 'theirs'}>
                  <Rich text={n} />
                </li>
              ))}
            </ol>
            {shop.tinker.thinking && <p className="coach-text faint">Thinking…</p>}
            <div className="row">
              <button
                className="btn small"
                disabled={!shop.tinker.moves.length || shop.tinker.thinking}
                onClick={() => {
                  const back = shop.tinker.moves.length % 2 === 0 ? 2 : 1;
                  setShop({
                    ...shop,
                    tinker: { moves: shop.tinker.moves.slice(0, -back), notes: shop.tinker.notes.slice(0, -back), thinking: false },
                  });
                }}
              >
                Undo
              </button>
              <button
                className="btn small"
                disabled={shop.tinker.thinking}
                onClick={() => setShop({ ...shop, tinker: { moves: [], notes: [], thinking: false } })}
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </>
        )}

        <div className="row shop-foot">
          {guided ? (
            <button className="btn primary" onClick={() => guidedStep(guided.idx + 1)}>
              {guided.idx + 1 < guided.plies.length ? 'Next moment' : 'Finish'} <ChevronRight size={14} />
            </button>
          ) : (
            <button className="btn" onClick={() => setShop(null)}>
              Close
            </button>
          )}
        </div>
      </div>
    );
  } else if (review && guided && guided.done) {
    const solved = Object.values(guided.results).filter((r) => r === 'first').length;
    panel = (
      <div className="lesson-done">
        <h2>Lesson complete</h2>
        <p className="muted">
          You found the better move first time in <b>{solved}</b> of <b>{guided.plies.length}</b> positions. They are saved in Practice, so they will
          come back until the ideas stick.
        </p>
        {debrief && lessons?.lessons[0] && (
          <div className="debrief-habit">
            <div className="coach-label">Take this into your next game</div>
            <b>
              {lessons.lessons[0].icon} {lessons.lessons[0].title}
            </b>
            <p className="coach-text">{lessons.lessons[0].rule}</p>
          </div>
        )}
        {lessons && <LessonList lessons={lessons} moves={moves} onJump={(p) => (exitGuided(), go(p))} />}
        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
          {debrief && (
            <button className="btn primary" onClick={() => navigate('/coach')}>
              Back to your coach
            </button>
          )}
          <button className={`btn ${debrief ? '' : 'primary'}`} onClick={exitGuided}>
            Back to the review
          </button>
          <button className="btn" onClick={() => navigate('/practice')}>
            Practice now
          </button>
        </div>
      </div>
    );
  } else if (review && m && retry) {
    const step = guided ? `Lesson ${guided.idx + 1} of ${guided.plies.length} · ` : '';
    panel = (
      <div className="coach-card">
        <div className="coach-top">
          <span className="coach-step">
            {step}
            <MoveName m={m} />
          </span>
        </div>
        {retry.state === 'try' && (
          <>
            <h3 className="coach-title">{retry.checking ? 'Checking your move…' : `Find a better move for ${sideName}`}</h3>
            <p className="coach-text">
              In the game, {sideName} played <San san={m.san} chip /> <ClassIcon cls={m.classification} size={16} />. What would you play instead?
              Make your move on the board.
            </p>
            {retry.attempts > 0 && <p className="coach-text faint">Not that one – try again.</p>}
            {hints && (retry.hints ?? 0) >= 1 && <p className="coach-hint">{hints.idea}</p>}
            {hints && (retry.hints ?? 0) >= 2 && <p className="coach-hint">{hints.piece}</p>}
            <div className="row">
              {hints && (retry.hints ?? 0) < 2 && (
                <button className="btn small" onClick={() => setRetry({ ...retry, hints: (retry.hints ?? 0) + 1 })}>
                  {(retry.hints ?? 0) === 0 ? 'Hint' : 'Another hint'}
                </button>
              )}
              <button className="btn small" onClick={reveal}>
                Show the answer
              </button>
            </div>
          </>
        )}
        {retry.state === 'wrong' && (
          <>
            <h3 className="coach-title" style={{ color: CLASS_META.mistake.color }}>
              Not quite
            </h3>
            <p className="coach-text">
              <Rich
                text={`${retry.refutation ? `${retry.refutation} ` : 'That move still lets the advantage slip. '}Look again: checks, captures and threats first.`}
              />
            </p>
            <div className="row">
              <button className="btn small primary" onClick={() => setRetry({ state: 'try', attempts: retry.attempts, hints: retry.hints })}>
                Try again
              </button>
              <button className="btn small" onClick={reveal}>
                Show the answer
              </button>
            </div>
          </>
        )}
        {(retry.state === 'correct' || retry.state === 'revealed') && (
          <>
            <h3 className="coach-title" style={{ color: retry.state === 'correct' ? CLASS_META.best.color : undefined }}>
              {retry.state === 'correct' ? (
                `Correct${retry.tried && retry.tried !== m.bestMove ? ' - that works too' : ''}!`
              ) : (
                <>
                  The move was <San san={m.bestSan ?? ''} />
                </>
              )}
            </h3>
            <div className="coach-section">
              <div className="coach-label">What happened in the game</div>
              <p className="coach-text">
                <San san={m.san} chip /> {CLASS_META[m.classification].verdict}.{' '}
                <Rich text={m.bestLine.length ? withoutBest(m.comment) : m.comment} />
              </p>
            </div>
            {m.bestLine.length > 0 && (
              <div className="coach-section">
                <div className="coach-label">
                  Why <San san={m.bestSan ?? ''} /> is better
                </div>
                <p className="coach-text">
                  <Rich text={bestIdeaSentence(review.positions[cur], m.color, m.epBefore, recaptureAt(moves, cur))} />
                </p>
                <p className="coach-line moves-line">
                  <Moves line={formatLine(m.fenBefore, m.bestLine.slice(0, 8))} />
                </p>
              </div>
            )}
            {lesson && <LessonBox title={lesson.info.title} rule={lesson.info.rule} theme={lesson.theme} />}
            <div className="row">
              <button className="btn small" onClick={() => showLine(m.fenBefore, bestLineFor(m))}>
                <Play size={14} /> Play the line
              </button>
              {guided ? (
                <button className="btn small primary" onClick={() => guidedStep(guided.idx + 1)}>
                  {guided.idx + 1 < guided.plies.length ? 'Next moment' : 'Finish'} <ChevronRight size={14} />
                </button>
              ) : (
                <button className="btn small" onClick={() => setRetry(null)}>
                  Done
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  } else if (review && m) {
    panel = (
      <div className="coach-card">
        <div className="coach-top">
          <span className="coach-step">
            <MoveName m={m} />
          </span>
          <ScoreChip score={m.scoreAfter} />
        </div>
        <h3 className="coach-title" style={{ color: CLASS_META[m.classification].color }}>
          <ClassIcon cls={m.classification} size={22} /> {m.headline}
        </h3>
        <p className="coach-text">
          <Rich text={m.comment} />
        </p>
        {m.bestSan && m.bestMove !== m.uci && !['book', 'forced'].includes(m.classification) && (
          <p className="coach-line moves-line">
            <span className="line-label">Best</span> <Moves line={formatLine(m.fenBefore, m.bestLine.slice(0, 8))} />
          </p>
        )}
        {lesson && <LessonBox title={lesson.info.title} rule={lesson.info.rule} theme={lesson.theme} />}
        <div className="row" style={{ marginTop: 4 }}>
          {!['book', 'forced'].includes(m.classification) && (
            <button className="btn small primary" onClick={() => showMe(cur)}>
              <Play size={14} /> Show me
            </button>
          )}
          {retryable && (
            <button className="btn small primary" onClick={() => setRetry({ state: 'try', attempts: 0 })}>
              <RotateCcw size={14} /> Retry
            </button>
          )}
          {m.bestMove && m.bestMove !== m.uci && !['book', 'forced'].includes(m.classification) && (
            <button className="btn small" onClick={() => (line ? setLine(null) : showLine(m.fenBefore, bestLineFor(m)))}>
              {line ? (
                'Back to game'
              ) : (
                <>
                  <Play size={14} /> Best line
                </>
              )}
            </button>
          )}
          {review.positions[cur + 1]?.lines[0]?.pv.length ? (
            <button
              className="btn small"
              onClick={() => (line ? setLine(null) : showLine(m.fenAfter, review.positions[cur + 1].lines[0].pv.slice(0, 10)))}
            >
              {line ? (
                'Back to game'
              ) : (
                <>
                  <Play size={14} /> Follow-up
                </>
              )}
            </button>
          ) : null}
          <label className="toggle" style={{ fontSize: '0.82rem', marginLeft: 'auto' }}>
            <input type="checkbox" checked={showBest} onChange={(e) => setShowBest(e.target.checked)} /> Arrows
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="game-layout focus-screen review-screen">
      <div className="board-column with-evalbar">
        {bar(top)}
        <div className="board-row">
          <EvalBar score={currentScore} flipped={orientation === 'black'} />
          {board && (
            <Board
              fen={board.fen}
              orientation={orientation}
              lastMove={board.lastMove}
              check={board.check}
              shapes={shapes}
              highlights={highlights}
              movableColor={board.movable && m ? (m.color === 'w' ? 'white' : 'black') : undefined}
              dests={board.dests}
              onMove={shop ? onShopMove : onRetryMove}
              viewOnly={!board.movable}
            />
          )}
        </div>
        {bar(bottom)}
      </div>

      <div className="side-panel review-panel">
        <div className="panel-head only-desktop">
          <b style={{ fontSize: '1.1rem' }}>Game Review</b>
          <span className="spacer" />
          {review && (
            <span className="faint" style={{ fontSize: '0.8rem' }}>
              depth {review.depth}
            </span>
          )}
          <button className="icon-btn" title="Flip board (f)" onClick={() => setFlipped((f) => !f)}>
            ⇅
          </button>
        </div>

        <div className="panel-body" ref={bodyRef}>
          {running && (
            <div style={{ marginBottom: 14 }}>
              <div className="row" style={{ marginBottom: 6 }}>
                <span className="muted">Stockfish is reviewing the game…</span>
                <span className="spacer" />
                <b>{Math.round(progress * 100)}%</b>
              </div>
              <div className="progress">
                <div style={{ width: `${progress * 100}%` }} />
              </div>
              <button className="btn small ghost" style={{ marginTop: 6 }} onClick={() => useReviewer.getState().cancel(gameId)}>
                Cancel
              </button>
            </div>
          )}
          {job?.status === 'error' && <div className="error-box">Review failed: {job.error}</div>}
          {review === null && !job && <div className="muted">Preparing review…</div>}

          {line && (
            <div className="line-card">
              <button className="icon-btn" onClick={() => setLine({ ...line, idx: Math.max(0, line.idx - 1) })} aria-label="Back">
                <ChevronLeft size={18} />
              </button>
              <div className="moves" style={{ flex: 1, fontSize: '0.88rem' }}>
                {formatLine(line.base, sanOf(line.base, line.moves))
                  .split(' ')
                  .map((t, i, arr) => (
                    <span key={i} style={{ opacity: tokenPly(arr, i) < line.idx ? 1 : 0.4 }}>
                      {/^\d+\./.test(t) ? <span className="mv-no">{t}</span> : <San san={t} />}{' '}
                    </span>
                  ))}
              </div>
              <button className="icon-btn" onClick={() => setLine({ ...line, idx: Math.min(line.moves.length, line.idx + 1) })} aria-label="Forward">
                <ChevronRight size={18} />
              </button>
              <button className="btn ghost small" onClick={() => setLine(null)}>
                Close
              </button>
            </div>
          )}

          {panel}

          {review && cur === -1 && !guided && !intro && (
            <>
              {!game.userColor && (
                <div className="row card" style={{ marginBottom: 12, padding: 10, background: 'var(--panel-2)' }}>
                  <span className="muted" style={{ fontSize: '0.88rem' }}>
                    Which side were you? (personalises the lessons and adds your mistakes to Practice)
                  </span>
                  <button className="btn small" onClick={() => void claimSide('w')}>
                    White
                  </button>
                  <button className="btn small" onClick={() => void claimSide('b')}>
                    Black
                  </button>
                </div>
              )}
              <Overview review={review} game={game} focus={focus} setFocus={setFocus} onJump={go} lessons={lessons} onLearn={startGuided} />
            </>
          )}

          {points.length > 1 && !guided && !intro && (
            <div style={{ marginTop: 14 }}>
              <EvalGraph points={points} current={cur + 1} onSelect={(i) => review && go(i - 1)} height={70} />
            </div>
          )}

          {review && !guided && (
            <div style={{ marginTop: 12 }} className="only-desktop">
              <MoveList
                sans={moves.map((x) => x.san)}
                startFen={game.startFen}
                current={cur}
                onSelect={go}
                classes={moves.map((x) => x.classification)}
              />
            </div>
          )}

          {review && !guided && !intro && (
            <div style={{ marginTop: 14 }}>
              <AiCoachChat key={gameId} game={game} review={review} ply={cur} />
            </div>
          )}
        </div>

        {review && !guided && (
          <MoveStrip
            sans={moves.map((x) => x.san)}
            startFen={game.startFen}
            current={cur}
            onSelect={go}
            classes={moves.map((x) => x.classification)}
          />
        )}

        <div className="play-controls">
          {guided ? (
            <>
              <button className="ctl" onClick={exitGuided}>
                <span className="ctl-ico">
                  <X size={20} />
                </span>
                <span className="ctl-label">Exit lesson</span>
              </button>
              <button className="ctl" onClick={() => guidedStep(guided.idx - 1)} disabled={guided.idx === 0 || guided.done}>
                <span className="ctl-ico">
                  <ChevronLeft size={20} />
                </span>
                <span className="ctl-label">Previous</span>
              </button>
              <button className="ctl" onClick={() => guidedStep(guided.idx + 1)} disabled={guided.done}>
                <span className="ctl-ico">
                  <ChevronRight size={20} />
                </span>
                <span className="ctl-label">Skip</span>
              </button>
              <button className="ctl" onClick={() => setFlipped((f) => !f)}>
                <span className="ctl-ico">
                  <ArrowUpDown size={20} />
                </span>
                <span className="ctl-label">Flip</span>
              </button>
            </>
          ) : (
            <>
              <button className="ctl only-mobile" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/games'))}>
                <span className="ctl-ico">
                  <X size={20} />
                </span>
                <span className="ctl-label">Close</span>
              </button>
              <button className="ctl" onClick={() => go(cur - 1)} disabled={!review || cur < 0}>
                <span className="ctl-ico">
                  <ChevronLeft size={20} />
                </span>
              </button>
              <button className="ctl wide" onClick={() => go(cur + 1)} disabled={!review || cur >= moves.length - 1}>
                <span className="ctl-ico">
                  <ChevronRight size={20} />
                </span>
                <span className="ctl-label">{cur === -1 ? 'Start' : 'Next'}</span>
              </button>
              <button className="ctl" onClick={() => nextMistake !== null && go(nextMistake)} disabled={nextMistake === null}>
                <span className="ctl-ico">
                  <SkipForward size={20} />
                </span>
                <span className="ctl-label">Mistake</span>
              </button>
              <button className="ctl" onClick={() => setFlipped((f) => !f)}>
                <span className="ctl-ico">
                  <ArrowUpDown size={20} />
                </span>
                <span className="ctl-label">Flip</span>
              </button>
              <button className="ctl" onClick={() => navigate(`/analysis?game=${gameId}${cur >= 0 ? `&ply=${cur + 1}` : ''}`)}>
                <span className="ctl-ico">
                  <Microscope size={20} />
                </span>
                <span className="ctl-label">Analyse</span>
              </button>
              {review && !running && review.depth < 20 && (
                <button
                  className="ctl only-desktop"
                  onClick={() => void useReviewer.getState().start(gameId, { depth: 20, force: true })}
                  title="Run a deeper review"
                >
                  <span className="ctl-ico">
                    <Gauge size={20} />
                  </span>
                  <span className="ctl-label">Deeper</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Link to the course lesson that teaches a review theme. */
function CourseLink({ theme }: { theme: string }) {
  const course = findLesson(LESSON_FOR_THEME[theme] ?? '');
  if (!course) return null;
  return (
    <a className="course-link" href={`#/learn/${course.id}`}>
      Take the “{course.title}” lesson ›
    </a>
  );
}

function LessonBox({ title, rule, theme }: { title: string; rule: string; theme?: string }) {
  return (
    <div className="lesson-box">
      <div className="lesson-head">
        <span>
          <span className="coach-label">Lesson</span>
          <b>{title}</b>
        </span>
      </div>
      <p>{rule}</p>
      {theme && <CourseLink theme={theme} />}
    </div>
  );
}

function LessonList({ lessons, moves, onJump }: { lessons: GameLessons; moves: ReviewedMove[]; onJump: (ply: number) => void }) {
  if (!lessons.lessons.length && !lessons.strengths.length) return null;
  return (
    <div className="lesson-list">
      {lessons.lessons.map((l) => (
        <div key={l.theme} className="lesson-item">
          <div className="lesson-head">
            <b>{l.title}</b>
          </div>
          <p className="muted">{l.detail}</p>
          <p>{l.rule}</p>
          <CourseLink theme={l.theme} />
          {l.plies.length > 0 && (
            <div className="row" style={{ gap: 6 }}>
              {l.plies.slice(0, 6).map((p) => (
                <button key={p} className="chip" onClick={() => onJump(p)}>
                  {moves[p] && <ClassIcon cls={moves[p].classification} size={14} />} {moves[p] ? <MoveName m={moves[p]} /> : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {lessons.strengths.length > 0 && (
        <div className="lesson-item good">
          <div className="lesson-head">
            <b>What you did well</b>
          </div>
          {lessons.strengths.map((s) => (
            <p key={s}>{s}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Overview({
  review,
  game,
  focus,
  setFocus,
  onJump,
  lessons,
  onLearn,
}: {
  review: GameReview;
  game: GameRecord;
  focus: 'w' | 'b' | null;
  setFocus: (c: 'w' | 'b' | null) => void;
  onJump: (i: number) => void;
  lessons: GameLessons | null;
  onLearn: () => void;
}) {
  const phases: Phase[] = ['opening', 'middlegame', 'endgame'];
  return (
    <div>
      {lessons && lessons.practice.length > 0 && (
        <button className="btn primary learn-btn" onClick={onLearn}>
          Learn from this game
          <span>
            Find the better move in your {lessons.practice.length} key moment{lessons.practice.length > 1 ? 's' : ''}
          </span>
        </button>
      )}
      <div className="coach-card" style={{ marginTop: 12 }}>
        <div className="coach-top">
          <span className="coach-step">Coach’s summary</span>
          {review.opening && (
            <span className="faint" style={{ fontSize: '0.78rem' }}>
              {review.opening.eco}
            </span>
          )}
        </div>
        <p className="coach-text">
          <Rich text={review.summary.replace(/ Coach's tips:.*$/, '')} />
        </p>
        {review.opening && <p className="coach-line">{review.opening.name}</p>}
        <RepertoireNote moves={game.moves} sans={game.sans} you={game.userColor} />
      </div>

      {lessons && (lessons.lessons.length > 0 || lessons.strengths.length > 0) && (
        <>
          <h3 style={{ margin: '16px 0 8px' }}>Lessons from this game</h3>
          <LessonList lessons={lessons} moves={review.moves} onJump={onJump} />
        </>
      )}

      <table className="summary-table" style={{ marginTop: 14 }}>
        <tbody>
          <tr>
            <td className="n" style={{ fontWeight: 600 }}>
              {game.white.name}
            </td>
            <td />
            <td className="n" style={{ fontWeight: 600 }}>
              {game.black.name}
            </td>
          </tr>
          <tr>
            <td className="n">
              <span className="acc-box">
                <CountUp value={review.white.accuracy} decimals={1} />
              </span>
            </td>
            <td className="label muted">Accuracy</td>
            <td className="n">
              <span className="acc-box dark">
                <CountUp value={review.black.accuracy} decimals={1} />
              </span>
            </td>
          </tr>
          <tr>
            <td className="n" style={{ fontSize: '1.1rem' }}>
              {ratingText(review, 'w', !!game.white.botId)}
            </td>
            <td
              className="label muted"
              title="How strong the play was in this game alone. One game can look much stronger or weaker than a player's real rating."
            >
              This game ≈
            </td>
            <td className="n" style={{ fontSize: '1.1rem' }}>
              {ratingText(review, 'b', !!game.black.botId)}
            </td>
          </tr>
          {SUMMARY_CLASSES.map((c) => (
            <tr key={c}>
              <td className="n" style={{ color: CLASS_META[c].color }}>
                {review.white.counts[c]}
              </td>
              <td className="label">
                <ClassIcon cls={c} size={20} />
                <span style={{ minWidth: 80 }}>{CLASS_META[c].label}</span>
              </td>
              <td className="n" style={{ color: CLASS_META[c].color }}>
                {review.black.counts[c]}
              </td>
            </tr>
          ))}
          {phases.map((ph) => (
            <tr key={ph}>
              <td className="n">
                <PhaseBadge value={review.white.phases[ph]} />
              </td>
              <td className="label muted" style={{ textTransform: 'capitalize' }}>
                {ph}
              </td>
              <td className="n">
                <PhaseBadge value={review.black.phases[ph]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="row" style={{ marginTop: 14 }}>
        <h3 style={{ margin: 0 }}>Key moments</h3>
        <span className="spacer" />
        <Segmented
          value={focus ?? 'all'}
          onChange={(v) => setFocus(v === 'all' ? null : (v as 'w' | 'b'))}
          options={[
            { value: 'all', label: 'Both' },
            { value: 'w', label: 'White' },
            { value: 'b', label: 'Black' },
          ]}
        />
      </div>
      <div style={{ marginTop: 6 }}>
        {review.keyMoments
          .map((i) => review.moves[i])
          .filter((x) => !focus || x.color === focus)
          .map((x) => (
            <div key={x.ply} className="key-moment" onClick={() => onJump(x.ply)}>
              <ClassIcon cls={x.classification} size={20} />
              <b style={{ minWidth: 70 }}>
                <MoveName m={x} />
              </b>
              <span className="muted" style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {x.headline}
              </span>
            </div>
          ))}
        {!review.keyMoments.length && <div className="faint">No big swings – a clean game.</div>}
      </div>
    </div>
  );
}
