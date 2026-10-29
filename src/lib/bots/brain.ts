// Bot move selection. Below 1500 Elo we model what a player at that level
// notices. People don't lose to weaker players because they calculate less
// well on every move; they lose because they don't see things: the threat to
// their own knight, the move that leaves a piece hanging, the fork two moves
// away. So each turn the bot only considers the moves it noticed (captures,
// threats to its own pieces, checks, mates, recaptures, a few ordinary moves
// and, from about 500 up, sometimes the engine's best move), with noticing
// chances that rise with the rating.
//
// What even a 100-rated player does see is a piece they can simply take: an
// obvious free piece is spotted 80% of the time at 100 and nearly always by
// 1450 (a piece that just landed in front of them is easier to see, a long
// diagonal or backwards capture harder). Their weakness is everything else:
// they often don't notice their own piece is attacked, often move without
// checking the reply, love giving check and bring the queen out early, and
// never find a tactic deeper than the move in front of them.
//
// The bot judges the moves it considered with a shallow look (it sees what
// can be taken straight back), plus some of Stockfish's deep evaluation at
// higher ratings. When clearly winning it only sometimes plays the engine's
// move (below 700, only in a nearly empty endgame), so low-rated bots don't
// convert like machines. From 1500 up we use Stockfish's UCI_Elo limiter.
import { Chess, type Color, type Move, type Square } from 'chess.js';
import type { Engine } from '../engine/engine';
import { scoreToCp, type Score } from '../engine/uci';
import type { OpeningBook } from '../chess/openings';
import { PIECE_VALUE, moveToUci, other } from '../chess/utils';
import { hangingPieces } from '../chess/tactics';
import type { BotProfile } from './bots';

export interface StrengthParams {
  mode: 'human' | 'limited' | 'full';
  /** Depth of the deep search (what is really going on). */
  depth: number;
  multipv: number;
  /** Chances of noticing, per turn (human mode). */
  notice: {
    /** That an enemy piece can be won (an average capture; see captureSalience). */
    capture: number;
    /** That one of its own pieces is attacked. */
    threat: number;
    /** A recapture after the opponent just captured. */
    recapture: number;
    /** A given checking move. */
    check: number;
    /** The engine's best move. */
    best: number;
    /** A given ordinary move. */
    quiet: number;
    /** That a move mates. */
    mate: number;
  };
  /** Chance a considered move is judged without looking at the reply. */
  blind: number;
  /** Weight of the deep evaluation against the shallow look (0..1). */
  insight: number;
  /** Judgement noise in centipawns. */
  noise: number;
  /** Chance of playing the engine's move when clearly winning. */
  convert: number;
  /** How much the bot likes giving check (centipawns). */
  checkLove: number;
  /** How much it likes moving the queen in the first few moves (centipawns). */
  queenRush: number;
  movetime: number;
  /** How many plies the bot may follow its opening book. */
  bookPlies: number;
}

export const STOCKFISH_MIN_ELO = 1500;
export const STOCKFISH_MAX_ELO = 3190;

/**
 * The UCI_Elo that plays at a given app rating. Stockfish's scale is
 * calibrated against engines at long time controls; at the app's speed its
 * low settings play weaker than labelled (head-to-head, the 1450 human-model
 * bot beat UCI_Elo 1500 and 1600 about 70% of the time), so the low end is
 * lifted, fading out by 2300.
 */
export function stockfishEloFor(elo: number): number {
  return Math.min(STOCKFISH_MAX_ELO, Math.round(elo + 230 * Math.max(0, (2300 - elo) / 800)));
}

/**
 * Human-model settings at anchor ratings, interpolated in between. Tuned with
 * src/test/botAudit.test.ts (how often each level takes a free piece, mates in
 * one, finds a real tactic, saves its own piece and blunders) and
 * botCalibrate/botLadder.
 */
const ANCHORS: number[][] = [
  // elo  take  threat recap check best  quiet mate  blind  insight noise convert checkLove queenRush
  [100, 0.84, 0.35, 0.8, 0.55, 0, 0.3, 0.5, 0.3, 0, 90, 0.03, 35, 30],
  [250, 0.88, 0.5, 0.85, 0.5, 0.02, 0.3, 0.58, 0.2, 0, 80, 0.06, 28, 20],
  [500, 0.9, 0.7, 0.88, 0.5, 0.05, 0.33, 0.7, 0.07, 0.03, 65, 0.15, 15, 5],
  [850, 0.92, 0.78, 0.92, 0.6, 0.06, 0.38, 0.82, 0.05, 0.06, 55, 0.35, 5, 0],
  [1150, 0.95, 0.87, 0.95, 0.7, 0.38, 0.42, 0.92, 0.025, 0.28, 48, 0.6, 0, 0],
  [1450, 0.97, 0.93, 0.97, 0.82, 0.65, 0.45, 0.97, 0.012, 0.45, 40, 0.78, 0, 0],
];

function anchored(elo: number, col: number): number {
  const e = Math.max(ANCHORS[0][0], Math.min(ANCHORS[ANCHORS.length - 1][0], elo));
  let i = 0;
  while (i < ANCHORS.length - 2 && e > ANCHORS[i + 1][0]) i++;
  const [a, b] = [ANCHORS[i], ANCHORS[i + 1]];
  const t = (e - a[0]) / (b[0] - a[0]);
  return a[col] + (b[col] - a[col]) * t;
}

export function strengthFor(elo: number): StrengthParams {
  const bookPlies = Math.round(Math.max(2, Math.min(24, (elo - 100) / 110)));
  const none = {
    notice: { capture: 1, threat: 1, recapture: 1, check: 1, best: 1, quiet: 1, mate: 1 },
    blind: 0,
    insight: 1,
    noise: 0,
    convert: 1,
    checkLove: 0,
    queenRush: 0,
  };
  if (elo >= 3150) return { mode: 'full', depth: 0, multipv: 1, ...none, movetime: 1500, bookPlies: 16 };
  if (elo >= STOCKFISH_MIN_ELO) {
    const t = (elo - STOCKFISH_MIN_ELO) / (STOCKFISH_MAX_ELO - STOCKFISH_MIN_ELO);
    return { mode: 'limited', depth: 0, multipv: 1, ...none, movetime: Math.round(300 + 900 * t), bookPlies };
  }
  const e = Math.max(100, elo);
  return {
    mode: 'human',
    depth: e < 700 ? 8 : 10,
    multipv: e < 700 ? 12 : 16,
    notice: {
      capture: anchored(e, 1),
      threat: anchored(e, 2),
      recapture: anchored(e, 3),
      check: anchored(e, 4),
      best: anchored(e, 5),
      quiet: anchored(e, 6),
      mate: anchored(e, 7),
    },
    blind: anchored(e, 8),
    insight: anchored(e, 9),
    noise: anchored(e, 10),
    convert: anchored(e, 11),
    checkLove: anchored(e, 12),
    queenRush: anchored(e, 13),
    movetime: 0,
    bookPlies,
  };
}

export interface BotMoveContext {
  startFen: string;
  /** Moves played so far (UCI). */
  moves: string[];
  bot: BotProfile;
  book?: OpeningBook | null;
  rng?: () => number;
}

export interface BotMove {
  uci: string;
  san: string;
  source: 'book' | 'engine';
  /** Engine evaluation from White's perspective (when known). */
  score?: Score;
}

/**
 * How easy a capture is to miss, as a multiple of an average capture's chance
 * of being missed. A piece that has just landed in front of you, or one a
 * pawn can take, is hard to miss; a long diagonal shot, a knight's capture or
 * a capture backwards is easier to overlook.
 */
export function captureSalience(m: Move, justArrived: string | undefined, me: Color): number {
  let f = 1;
  if (m.to === justArrived) f *= 0.5;
  if (m.piece === 'p' || m.piece === 'k') f *= 0.7;
  const df = Math.abs(m.from.charCodeAt(0) - m.to.charCodeAt(0));
  const dr = +m.to[1] - +m.from[1];
  const dist = Math.max(df, Math.abs(dr));
  if (m.piece === 'n') f *= 1.2;
  else if (dist >= 4) f *= 1.6;
  else if (dist === 3) f *= 1.25;
  if ((me === 'w' ? dr : -dr) < 0) f *= 1.4;
  return f;
}

/** Standard normal sample (Box-Muller). */
function gaussian(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

function pickWeighted<T>(items: { item: T; w: number }[], rng: () => number): T {
  const total = items.reduce((a, b) => a + b.w, 0);
  let r = rng() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.item;
  }
  return items[items.length - 1].item;
}

function bookMove(ctx: BotMoveContext, chess: Chess, params: StrengthParams, rng: () => number): string | null {
  const ply = ctx.moves.length;
  if (ply >= params.bookPlies) return null;
  const legal = new Set(chess.moves({ verbose: true }).map(moveToUci));
  const rep = ctx.bot.repertoire;
  if (rep) {
    if (ply === 0 && rep.white?.length) return rep.white[Math.floor(rng() * rep.white.length)];
    if (ply === 1 && rep.black) {
      const options = rep.black[ctx.moves[0]];
      const ok = options?.filter((u) => legal.has(u));
      if (ok?.length) return ok[Math.floor(rng() * ok.length)];
    }
  }
  if (!ctx.book) return null;
  const options = ctx.book.weightedMovesFrom(chess.fen()).filter((o) => legal.has(o.uci));
  if (!options.length) return null;
  // Flatten popularity slightly so bots don't always play the same mainline.
  return pickWeighted(
    options.map((o) => ({ item: o.uci, w: Math.pow(o.weight, 0.85) })),
    rng,
  );
}

export async function chooseBotMove(engine: Engine, ctx: BotMoveContext): Promise<BotMove> {
  const rng = ctx.rng ?? Math.random;
  const chess = new Chess(ctx.startFen);
  for (const u of ctx.moves) chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  const legal = chess.moves({ verbose: true });
  if (!legal.length) throw new Error('No legal moves');
  const sanOf = (uci: string) => legal.find((m) => moveToUci(m) === uci)?.san ?? uci;
  const params = strengthFor(ctx.bot.elo);

  if (legal.length === 1) return { uci: moveToUci(legal[0]), san: legal[0].san, source: 'engine' };

  const fromBook = bookMove(ctx, chess, params, rng);
  if (fromBook && legal.some((m) => moveToUci(m) === fromBook)) return { uci: fromBook, san: sanOf(fromBook), source: 'book' };

  const base = { fen: ctx.startFen, moves: ctx.moves };
  if (params.mode !== 'human') {
    const res = await engine.analyse({
      ...base,
      limits: { movetime: params.movetime },
      multipv: 1,
      options: params.mode === 'full' ? { UCI_LimitStrength: false } : { UCI_LimitStrength: true, UCI_Elo: stockfishEloFor(ctx.bot.elo) },
    });
    const uci = res.bestmove ?? moveToUci(legal[0]);
    return { uci, san: sanOf(uci), source: 'engine', score: res.lines[0]?.score };
  }

  // Human-like selection. Simplified positions get a deeper look so that won
  // endgames are eventually converted instead of shuffled forever.
  const pieces = chess
    .board()
    .flat()
    .filter((p) => p && p.type !== 'p' && p.type !== 'k').length;
  const me = chess.turn();
  const sign = me === 'w' ? 1 : -1;
  const cpOf = (sc: Score) => sign * scoreToCp(sc);
  const deepRes = await engine.analyse({
    ...base,
    limits: { depth: params.depth + (pieces <= 4 ? 4 : pieces <= 8 ? 2 : 0) },
    multipv: Math.min(params.multipv, legal.length),
    options: { UCI_LimitStrength: false },
  });
  const deepLines = deepRes.lines.filter((l) => l.pv.length);
  if (!deepLines.length) {
    const uci = deepRes.bestmove ?? moveToUci(legal[0]);
    return { uci, san: sanOf(uci), source: 'engine' };
  }
  const deep = new Map(deepLines.map((l) => [l.pv[0], cpOf(l.score)]));
  const scoreOf = (uci: string) => deepLines.find((l) => l.pv[0] === uci)?.score;
  const bestUci = deepLines[0].pv[0];
  const bestDeep = cpOf(deepLines[0].score);

  // Clearly winning: sometimes the engine's move, so games do get finished. Below
  // 700 only in a nearly empty endgame: otherwise it would play tactics far
  // beyond its level.
  if (bestDeep > 400 && (ctx.bot.elo >= 700 || pieces <= 4) && rng() < params.convert)
    return { uci: bestUci, san: sanOf(bestUci), source: 'engine', score: deepLines[0].score };

  const n = params.notice;
  const noticed = new Set<string>();
  // Moves whose point is a situation the bot either spots or doesn't: they
  // are only considered when it does.
  const situational = new Set<string>();
  const spot = (moves: string[], spotted: boolean) => {
    for (const u of moves) {
      situational.add(u);
      if (spotted) noticed.add(u);
    }
  };
  const last = ctx.moves.at(-1);
  const justArrived = last?.slice(2, 4);
  // Mate in one: seen, or not.
  spot(legal.filter((m) => m.san.endsWith('#')).map(moveToUci), rng() < n.mate);
  // Enemy pieces that can be won: each way of taking one is either spotted or not.
  for (const h of hangingPieces(chess, other(me)))
    for (const m of legal.filter((x) => x.to === h.square)) {
      const miss = Math.min(0.98, (1 - n.capture) * captureSalience(m, justArrived, me));
      spot([moveToUci(m)], rng() >= miss);
    }
  // Own pieces under attack: moving them away, or taking the attacker. A threat
  // the opponent just made is easier to notice than one that has been there.
  for (const h of hangingPieces(chess, me)) {
    const attackers = new Set<string>(chess.attackers(h.square, other(me)));
    const fresh = !!justArrived && attackers.has(justArrived as Square);
    const miss = (1 - n.threat) * (fresh ? 0.8 : 1);
    spot(legal.filter((m) => m.from === h.square || attackers.has(m.to)).map(moveToUci), rng() >= miss);
  }
  // Taking back after the opponent's capture.
  if (last && ctx.moves.length) {
    const prev = new Chess(ctx.startFen);
    for (const u of ctx.moves.slice(0, -1)) prev.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    if (prev.get(last.slice(2, 4) as Square) && rng() < n.recapture) for (const m of legal) if (m.to === last.slice(2, 4)) noticed.add(moveToUci(m));
  }
  if (rng() < n.best) noticed.add(bestUci);
  for (const m of legal) {
    const uci = moveToUci(m);
    if (situational.has(uci)) continue;
    const p = m.san.includes('+') || m.san.includes('#') ? n.check : m.isKingsideCastle() || m.isQueensideCastle() ? 0.6 : n.quiet;
    if (rng() < p) noticed.add(uci);
  }
  // Everyone looks at a few moves at least.
  const rest = legal.map(moveToUci).filter((u) => !noticed.has(u) && !situational.has(u));
  while (noticed.size < Math.min(3, legal.length) && rest.length) noticed.add(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
  // When every move belongs to a situation the bot didn't spot, it still has to
  // play something: one of those moves, without seeing why.
  if (!noticed.size) {
    const all = legal.map(moveToUci);
    noticed.add(all[Math.floor(rng() * all.length)]);
  }

  // A shallow look at every considered move (sees what can be taken back at once).
  const sightRes = await engine.analyse({
    ...base,
    limits: { depth: 1 },
    multipv: legal.length,
    options: { UCI_LimitStrength: false },
  });
  const seen = new Map(sightRes.lines.filter((l) => l.pv.length).map((l) => [l.pv[0], cpOf(l.score)]));
  // What an ordinary move here is worth: a move judged without looking at the reply seems about that good.
  const sorted = [...seen.values()].sort((a, b) => a - b);
  const typical = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const floor = Math.min(...deep.values()) - 50;
  const opening = ctx.moves.length < 16;
  // Low down the look is a beginner's: what the move takes, and whether
  // the opponent can take something straight back. (Stockfish's shallow search
  // keeps searching after a check, so it would see the fork behind it.) A
  // quiet move keeps a little of Stockfish's positional sense. It fades out
  // between 700 and 1450.
  const naiveWeight = Math.max(0, Math.min(1, (1450 - ctx.bot.elo) / 750));
  const naiveLook = (m: Move, sf: number): number => {
    const next = new Chess(chess.fen());
    next.move({ from: m.from, to: m.to, promotion: m.promotion });
    if (next.isCheckmate()) return 5000;
    const gain = (m.captured ? 100 * PIECE_VALUE[m.captured] : 0) + (m.promotion ? 800 : 0);
    const loss = Math.max(0, ...hangingPieces(next, me).map((h) => 100 * h.loss));
    const positional = m.captured || m.san.includes('+') ? 0 : Math.max(-40, Math.min(40, sf - typical));
    return typical + gain - loss + positional;
  };
  const clamp = (cp: number) => Math.max(-1500, Math.min(1500, cp));
  let choice = [...noticed][0];
  let top = -Infinity;
  for (const uci of noticed) {
    const m = legal.find((x) => moveToUci(x) === uci)!;
    const sf = seen.get(uci) ?? floor;
    const s = naiveWeight > 0 ? naiveWeight * naiveLook(m, sf) + (1 - naiveWeight) * sf : sf;
    const d = deep.get(uci) ?? Math.min(floor, s);
    // A blind judgement ignores the reply: the move just looks like it grabs whatever it captures.
    const gain = (m.captured ? 100 * PIECE_VALUE[m.captured] : 0) + (m.promotion ? 800 : 0);
    const taste = (m.san.includes('+') ? params.checkLove : 0) + (opening && m.piece === 'q' ? params.queenRush : 0);
    const v =
      (rng() < params.blind ? clamp(typical) - 10 + gain : params.insight * clamp(d) + (1 - params.insight) * clamp(s)) +
      taste +
      params.noise * gaussian(rng);
    if (v > top) {
      top = v;
      choice = uci;
    }
  }
  return { uci: choice, san: sanOf(choice), source: 'engine', score: scoreOf(choice) };
}

/** Whether the bot accepts a draw offer, given the eval from the bot's point of view (cp). */
export function botAcceptsDraw(botCp: number, ply: number, elo: number): boolean {
  if (botCp <= -150) return true;
  if (ply < 40) return false;
  return Math.abs(botCp) <= (elo < 1500 ? 80 : 30);
}

/** Simulated thinking time so bots don't move instantly (ms). */
export function thinkTime(elo: number, ply: number, rng: () => number = Math.random, clockMs?: number): number {
  const opening = ply < 10;
  let base = opening ? 350 + rng() * 500 : 600 + rng() * 1600;
  if (elo >= 2500) base *= 0.8;
  if (clockMs !== undefined) {
    const budget = clockMs / 35;
    base = Math.min(base, budget);
  }
  return Math.max(150, base);
}
