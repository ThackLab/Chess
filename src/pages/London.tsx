// The London course with the talking coach: learn each line with the coach
// talking you through it, play it back yourself, drill random lines, and
// solve the traps. Playing a full game with the coach is in LondonPlay.tsx.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Dumbbell, Lightbulb, Pause, Play, RotateCcw, Swords, Target, X } from 'lucide-react';
import { Chess } from 'chess.js';
import type { DrawShape } from 'chessground/draw';
import type { Key } from 'chessground/types';
import { Board } from '../components/Board';
import { CoachBubble } from '../components/CoachBubble';
import { ListRow, PageHead, SectionTitle } from '../components/ui';
import { Segmented, Toggle } from '../components/Widgets';
import { LONDON_LINES, findLine, linesUpTo, type LondonLine } from '../lib/london/lines';
import { LONDON_TRAPS, findTrap, type LondonTrap } from '../lib/london/traps';
import { playLine } from '../lib/london/tree';
import { PERSONAS } from '../lib/coach/phrases';
import { hush, say, show, useTalk } from '../lib/coach/talk';
import { voiceSupported } from '../lib/coach/voice';
import { describeMove } from '../lib/coach/plain';
import { legalDests, playUci } from '../lib/chess/utils';
import { navigate } from '../lib/router';
import { playSound, soundForSan } from '../lib/sound';
import { useSettings, type CoachChat, type CoachPersona } from '../state/settings';
import { LEVELS, LEVEL_NAME, isLearnt, nextReviewText, useLondon, type LondonLevel } from '../state/london';

const BRUSH: Record<string, string> = { r: 'red', b: 'blue', y: 'yellow', g: 'green' };

/** Arrows in the lessons' format ("e2e4", "r:e2e4") as board shapes. */
export function toShapes(arrows: string[] = []): DrawShape[] {
  return arrows.map((a) => {
    const [brush, sq] = a.includes(':') ? [BRUSH[a[0]] ?? 'green', a.slice(2)] : ['green', a];
    return { orig: sq.slice(0, 2) as Key, dest: sq.slice(2, 4) as Key, brush };
  });
}

const moveShape = (uci: string, brush: string): DrawShape => ({ orig: uci.slice(0, 2) as Key, dest: uci.slice(2, 4) as Key, brush });

/** Stop the coach talking when a screen closes. */
function useHushOnLeave() {
  useEffect(() => () => hush(), []);
}

/** Roughly how long a line takes to read or say, in ms. */
const sayTime = (text: string) => Math.max(1400, text.length * 62);

/** Lines due now, then new ones, then the rest by due date. */
export function nextLine(lines: LondonLine[], progress: Record<string, { due: number }>, skip?: string): LondonLine | null {
  const now = Date.now();
  const pool = lines.filter((l) => l.id !== skip);
  const due = pool.filter((l) => progress[l.id] && progress[l.id].due <= now).sort((a, b) => progress[a.id].due - progress[b.id].due);
  if (due.length) return due[0];
  const fresh = pool.filter((l) => !progress[l.id]);
  if (fresh.length) return fresh[Math.floor(Math.random() * fresh.length)];
  return pool.sort((a, b) => (progress[a.id]?.due ?? 0) - (progress[b.id]?.due ?? 0))[0] ?? null;
}

export function dueCount(level: LondonLevel, progress: Record<string, { due: number }>): number {
  const now = Date.now();
  return linesUpTo(level).filter((l) => !progress[l.id] || progress[l.id].due <= now).length;
}

// ------------------------------------------------------------------- hub

const CHAT_LABEL: Record<CoachChat, string> = { chatty: 'Chatty', normal: 'Normal', quiet: 'Quiet' };

/** `#/london`: the London course. */
export function LondonHome() {
  const { level, setLevel, lines: progress, traps, games, botElo, bestStreak } = useLondon();
  const settings = useSettings();
  useHushOnLeave();
  useEffect(() => {
    if (!useTalk.getState().bubble) show({ moment: 'greet', priority: 1 });
  }, []);

  const mine = linesUpTo(level);
  const learnt = mine.filter((l) => isLearnt(progress[l.id])).length;
  const due = dueCount(level, progress);
  const trapsSolved = LONDON_TRAPS.filter((t) => traps[t.id]?.solved).length;
  const canSpeak = voiceSupported();
  const hasKey = !!settings.aiCoachKey;

  const pickPersona = (p: CoachPersona) => {
    settings.set({ coachPersona: p });
    void say({ moment: 'greet', priority: 2, bookOnly: true });
  };

  return (
    <div className="page narrow london">
      <PageHead title="London coach" back="/learn" />

      <section className="london-hero">
        <CoachBubble idle="Pick a line and I’ll talk you through it." />
        <div className="lh-level">
          <span className="coach-step">Your level</span>
          <Segmented<LondonLevel> value={level} options={LEVELS.map((l) => ({ value: l, label: LEVEL_NAME[l] }))} onChange={setLevel} />
          <p className="faint">
            {learnt}/{mine.length} lines learnt{bestStreak ? ` · best streak ${bestStreak}` : ''}
          </p>
        </div>
      </section>

      <div className="list" style={{ marginTop: 14 }}>
        <ListRow
          icon={<Dumbbell size={20} />}
          title="Drill"
          sub={due ? `${due} line${due === 1 ? '' : 's'} to practise · random Black replies` : 'All caught up · practise anyway'}
          href="/london/drill"
        />
        <ListRow
          icon={<Swords size={20} />}
          title="Play the coach"
          sub={`A full game from the London vs a ${botElo[level]} bot, with the coach watching${games.played ? ` · ${games.won}/${games.played} won` : ''}`}
          href="/london/play"
        />
        <ListRow
          icon={<Target size={20} />}
          title="Traps"
          sub={`${trapsSolved}/${LONDON_TRAPS.length} solved · win stuff in the opening`}
          href="/london/traps"
        />
      </div>

      {LEVELS.map((lv) => {
        const ls = LONDON_LINES.filter((l) => l.level === lv);
        const above = LEVELS.indexOf(lv) > LEVELS.indexOf(level);
        return (
          <section key={lv} className={above ? 'london-above' : ''}>
            <SectionTitle>{LEVEL_NAME[lv]} lines</SectionTitle>
            <div className="list">
              {ls.map((l) => {
                const p = progress[l.id];
                return (
                  <ListRow
                    key={l.id}
                    icon={isLearnt(p) ? <Check size={18} /> : <span className="london-dot" />}
                    iconClass={isLearnt(p) ? 'good' : ''}
                    title={l.name}
                    sub={
                      <>
                        {l.group}
                        {p ? <span className="faint"> · {p.due <= Date.now() ? 'due now' : `back ${nextReviewText(p)}`}</span> : null}
                      </>
                    }
                    href={`/london/line/${l.id}`}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      <SectionTitle>Your coach</SectionTitle>
      <div className="persona-row">
        {(Object.keys(PERSONAS) as CoachPersona[]).map((id) => {
          const p = PERSONAS[id];
          return (
            <button key={id} className={`persona-card ${settings.coachPersona === id ? 'on' : ''}`} onClick={() => pickPersona(id)} type="button">
              <img src={new URL(`avatars/${p.avatar}.webp`, document.baseURI).href} alt="" width={40} height={40} />
              <b>{p.name}</b>
              <span>{p.blurb}</span>
            </button>
          );
        })}
      </div>

      <div className="card london-settings">
        {canSpeak ? (
          <Toggle checked={settings.coachVoice} onChange={(v) => settings.set({ coachVoice: v })} label={<span>Talk out loud</span>} />
        ) : (
          <p className="faint">This browser can’t speak, so the coach shows its words only.</p>
        )}
        {canSpeak && settings.coachVoice && (
          <label className="range-row">
            <span>Speed</span>
            <input
              type="range"
              min={0.7}
              max={1.4}
              step={0.05}
              value={settings.coachRate}
              onChange={(e) => settings.set({ coachRate: +e.target.value })}
              aria-label="How fast the coach talks"
            />
          </label>
        )}
        <div className="range-row">
          <span>How much it talks</span>
          <Segmented<CoachChat>
            value={settings.coachChat}
            options={(['chatty', 'normal', 'quiet'] as CoachChat[]).map((c) => ({ value: c, label: CHAT_LABEL[c] }))}
            onChange={(v) => settings.set({ coachChat: v })}
          />
        </div>
        {hasKey ? (
          <Toggle
            checked={settings.coachAiLines}
            onChange={(v) => settings.set({ coachAiLines: v })}
            label={<span>Fresh lines: Claude writes what the coach says each time (uses your Anthropic key, a few cents a game)</span>}
          />
        ) : (
          <p className="faint">
            Want the coach to never say the same thing twice? Add an Anthropic API key in{' '}
            <a href="#/settings" className="link">
              Settings
            </a>{' '}
            and it writes fresh lines with Claude.
          </p>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ lesson

/** `#/london/line/<id>`: the coach talks you through a line, then you play it. */
export function LondonLesson({ id, startMode }: { id: string; startMode?: string | null }) {
  const line = findLine(id);
  const [mode, setMode] = useState<'walk' | 'try'>(startMode === 'try' ? 'try' : 'walk');
  const [round, setRound] = useState(0);
  useHushOnLeave();
  if (!line) {
    return (
      <div className="page empty">
        <h2>Line not found</h2>
        <button className="btn primary" onClick={() => navigate('/london')}>
          Back to the London coach
        </button>
      </div>
    );
  }
  const others = linesUpTo(useLondon.getState().level);
  const next = () => {
    const n = nextLine(others, useLondon.getState().lines, line.id);
    if (n) navigate(`/london/line/${n.id}`, { replace: true });
  };
  return mode === 'walk' ? (
    <LineWalker key={`w${line.id}${round}`} line={line} onTry={() => setMode('try')} />
  ) : (
    <LineTrainer
      key={`t${line.id}${round}`}
      line={line}
      title={line.name}
      onAgain={() => setRound((r) => r + 1)}
      onNext={next}
      onWatch={() => {
        setMode('walk');
        setRound((r) => r + 1);
      }}
    />
  );
}

function LineWalker({ line, onTry }: { line: LondonLine; onTry: () => void }) {
  const played = useMemo(() => playLine(line), [line]);
  const [ply, setPly] = useState(-1);
  const [auto, setAuto] = useState(false);
  const speaking = useTalk((s) => s.speaking);
  const thinking = useTalk((s) => s.thinking);
  const saidAt = useRef(0);
  const lastText = useRef('');
  const end = line.moves.length;
  const shown = Math.max(0, ply);
  const fen = played.fens[shown];

  const go = (to: number) => {
    to = Math.max(0, Math.min(end, to));
    setPly(to);
    saidAt.current = Date.now();
    if (to === 0) {
      lastText.current = line.summary;
      void say({ moment: 'walkStart', line: line.name, idea: line.summary, priority: 2 });
      return;
    }
    const i = to - 1;
    const m = line.moves[i];
    playSound(soundForSan(m.san));
    lastText.current = m.note;
    const facts = describeMove(played.fens[i], played.uci[i], 'w');
    void say({ moment: i % 2 === 0 ? 'walkYours' : 'walkTheirs', idea: m.note, facts, line: line.name, priority: 2 }).then(() => {
      if (to === end) setAuto(false);
    });
  };

  // Autoplay: the next move once the coach has finished talking (or you've had time to read).
  useEffect(() => {
    if (!auto || speaking || thinking || ply >= end) return;
    const wait = Math.max(0, saidAt.current + sayTime(lastText.current) * 0.5 - Date.now()) + 700;
    const t = setTimeout(() => go(ply + 1), ply < 0 ? 0 : wait);
    return () => clearTimeout(t);
  }, [auto, speaking, thinking, ply]); // eslint-disable-line react-hooks/exhaustive-deps

  const last = shown > 0 ? played.uci[shown - 1] : undefined;
  const move = shown > 0 ? line.moves[shown - 1] : undefined;
  const shapes = useMemo(
    () => (last ? [moveShape(last, (shown - 1) % 2 === 0 ? 'green' : 'blue'), ...toShapes(move?.arrows)] : []),
    [last, move, shown],
  );
  const chess = useMemo(() => new Chess(fen), [fen]);
  const finished = ply >= end;

  return (
    <div className="game-layout focus-screen lesson-screen london-screen">
      <div className="board-column">
        <div className="player-bar lesson-top">
          <button className="icon-btn" onClick={() => navigate('/london')} aria-label="Close">
            <X size={22} />
          </button>
          <b>{line.name}</b>
          <span className="spacer" />
          <span className="faint">
            {Math.ceil(shown / 2)}/{Math.ceil(end / 2)}
          </span>
        </div>
        <div className="board-row">
          <Board
            fen={fen}
            orientation="white"
            viewOnly
            lastMove={last ? [last.slice(0, 2), last.slice(2, 4)] : undefined}
            check={chess.inCheck()}
            shapes={shapes}
          />
        </div>
      </div>
      <div className="side-panel">
        <div className="panel-body">
          <CoachBubble idle={`${line.summary} Tap play and I’ll talk you through it.`} />
          {finished && (
            <div className="london-rule">
              <span className="coach-step">Remember</span>
              <p className="coach-text">{line.rule}</p>
            </div>
          )}
        </div>
        <div className="play-controls">
          <button className="ctl" onClick={() => go(ply - 1)} disabled={ply <= 0} aria-label="Back a move">
            <span className="ctl-ico">
              <ChevronLeft size={22} />
            </span>
            <span className="ctl-label">Back</span>
          </button>
          {finished ? (
            <button
              className="ctl wide go"
              onClick={() => {
                void say({ moment: 'tryStart', priority: 1, bookOnly: true });
                onTry();
              }}
            >
              <span className="ctl-ico">
                <Play size={20} />
              </span>
              <span className="ctl-label">Your turn</span>
            </button>
          ) : (
            <button className={`ctl wide ${auto ? '' : 'go'}`} onClick={() => setAuto((a) => !a)}>
              <span className="ctl-ico">{auto ? <Pause size={20} /> : <Play size={20} />}</span>
              <span className="ctl-label">{auto ? 'Pause' : ply < 0 ? 'Play' : 'Autoplay'}</span>
            </button>
          )}
          <button className="ctl" onClick={() => go(ply + 1)} disabled={finished} aria-label="Next move">
            <span className="ctl-ico">
              <ChevronRight size={22} />
            </span>
            <span className="ctl-label">Next</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * You play a line's White moves; the coach plays Black's, says something
 * when you get it right, and explains when you don't.
 */
function LineTrainer({
  line,
  title,
  drill,
  onAgain,
  onNext,
  onWatch,
}: {
  line: LondonLine;
  title: string;
  drill?: boolean;
  onAgain: () => void;
  onNext: () => void;
  onWatch?: () => void;
}) {
  const played = useMemo(() => playLine(line), [line]);
  const grade = useLondon((s) => s.grade);
  const [ply, setPly] = useState(0);
  const [misses, setMisses] = useState(0);
  const [anyMiss, setAnyMiss] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [finished, setFinished] = useState<null | { clean: boolean; when: string }>(null);
  const [resetKey, setResetKey] = useState(0);
  const end = line.moves.length;
  const fen = played.fens[ply];
  const chess = useMemo(() => new Chess(fen), [fen]);
  const yourTurn = !finished && ply < end && ply % 2 === 0;

  // Black's moves play themselves.
  useEffect(() => {
    if (finished || ply >= end || ply % 2 === 0) return;
    const t = setTimeout(() => {
      const m = line.moves[ply];
      playSound(soundForSan(m.san));
      void say({ moment: 'walkTheirs', idea: m.note, priority: 0, bookOnly: true });
      setPly((p) => p + 1);
    }, 550);
    return () => clearTimeout(t);
  }, [ply, finished, end, line]);

  const finish = (clean: boolean) => {
    const res = grade(line.id, clean);
    setFinished({ clean, when: nextReviewText(res) });
    const streak = useLondon.getState().streak;
    if (clean && drill && streak >= 3) void say({ moment: 'streak', n: streak, priority: 1 });
    else void say({ moment: clean ? 'lineClean' : 'lineMessy', priority: 1, bookOnly: true });
  };

  const onMove = (from: string, to: string, promotion?: string) => {
    if (!yourTurn) return;
    const want = played.uci[ply];
    const uci = from + to + (promotion ?? '');
    const m = line.moves[ply];
    if (uci === want || (uci.slice(0, 4) === want.slice(0, 4) && !want[4])) {
      playSound(soundForSan(m.san));
      setPly(ply + 1);
      setMisses(0);
      setShowMove(false);
      if (ply + 1 >= end) finish(!anyMiss);
      else if (m.key) void say({ moment: 'rightKey', idea: m.note, priority: 1, facts: describeMove(fen, want, 'w') });
      else void say({ moment: 'right', priority: 0, bookOnly: true });
      return;
    }
    playSound('wrong');
    setAnyMiss(true);
    setResetKey((k) => k + 1);
    const c = new Chess(fen);
    const tried = playUci(c, uci);
    const facts = `The student tried: ${tried ? describeMove(fen, uci, 'w') : 'an illegal move'}. The London move here: ${describeMove(fen, want, 'w')}.`;
    if (misses === 0) void say({ moment: 'wrong', detail: m.note, priority: 2, facts });
    else {
      setShowMove(true);
      void say({ moment: 'wrongAgain', detail: m.note, priority: 2, facts });
    }
    setMisses((n) => n + 1);
  };

  const hint = () => {
    setShowMove(true);
    setAnyMiss(true);
    void say({ moment: 'hint', detail: line.moves[ply].note, priority: 2 });
  };

  const last = ply > 0 ? played.uci[ply - 1] : undefined;
  const shapes = useMemo(() => {
    const s: DrawShape[] = [];
    if (showMove && yourTurn) s.push(moveShape(played.uci[ply], 'green'));
    return s;
    // resetKey: a wrong move gets a fresh shapes array, which snaps the piece back.
  }, [showMove, yourTurn, played, ply, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="game-layout focus-screen lesson-screen london-screen">
      <div className="board-column">
        <div className="player-bar lesson-top">
          <button className="icon-btn" onClick={() => navigate('/london')} aria-label="Close">
            <X size={22} />
          </button>
          <b>{finished || !drill ? title : 'Drill'}</b>
          <span className="spacer" />
          <span className="faint">
            {Math.ceil(ply / 2)}/{Math.ceil(end / 2)}
          </span>
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
            onMove={onMove}
            viewOnly={!yourTurn}
          />
        </div>
      </div>
      <div className="side-panel">
        <div className="panel-body">
          <CoachBubble idle={drill ? 'Play the London. I’ll throw different replies at you.' : 'Your turn. Play White’s moves from memory.'} />
          {finished && (
            <div className={`london-result ${finished.clean ? 'good' : ''}`}>
              <span className="coach-step">{drill ? `That was ${line.name}` : finished.clean ? 'Clean run' : 'Done'}</span>
              <p className="coach-text">
                {line.rule} <span className="faint">Comes back {finished.when}.</span>
              </p>
            </div>
          )}
        </div>
        <div className="play-controls">
          {finished ? (
            <>
              <button className="ctl" onClick={onAgain}>
                <span className="ctl-ico">
                  <RotateCcw size={20} />
                </span>
                <span className="ctl-label">Again</span>
              </button>
              {onWatch && (
                <button className="ctl" onClick={onWatch}>
                  <span className="ctl-ico">
                    <Play size={20} />
                  </span>
                  <span className="ctl-label">Watch</span>
                </button>
              )}
              <button className="ctl wide go" onClick={onNext}>
                <span className="ctl-ico">
                  <ChevronRight size={22} />
                </span>
                <span className="ctl-label">Next line</span>
              </button>
            </>
          ) : (
            <>
              {onWatch && (
                <button className="ctl" onClick={onWatch}>
                  <span className="ctl-ico">
                    <Play size={20} />
                  </span>
                  <span className="ctl-label">Watch</span>
                </button>
              )}
              <button className="ctl wide" onClick={hint} disabled={!yourTurn || showMove}>
                <span className="ctl-ico">
                  <Lightbulb size={20} />
                </span>
                <span className="ctl-label">Show me</span>
              </button>
              <button className="ctl" onClick={onNext}>
                <span className="ctl-ico">
                  <ChevronRight size={22} />
                </span>
                <span className="ctl-label">Skip</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- drill

/** `#/london/drill`: random lines at your level, due ones first. */
export function LondonDrill() {
  const level = useLondon((s) => s.level);
  const pool = useMemo(() => linesUpTo(level), [level]);
  const [line, setLine] = useState<LondonLine | null>(() => nextLine(pool, useLondon.getState().lines));
  const [round, setRound] = useState(0);
  const first = useRef(true);
  useHushOnLeave();
  useEffect(() => {
    if (!line) return;
    if (first.current) {
      first.current = false;
      show({ moment: 'drillStart', priority: 1 });
    }
    if (line.system)
      void say({ moment: 'tryStart', detail: `This one’s the ${line.system}: knight out before the bishop.`, priority: 2, bookOnly: true });
  }, [line]);
  if (!line) return null;
  return (
    <LineTrainer
      key={`${line.id}${round}`}
      line={line}
      title={line.name}
      drill
      onAgain={() => setRound((r) => r + 1)}
      onNext={() => {
        setLine(nextLine(pool, useLondon.getState().lines, line.id));
        setRound((r) => r + 1);
      }}
    />
  );
}

// ------------------------------------------------------------------- traps

/** `#/london/traps` and `#/london/traps/<id>`. */
export function LondonTraps({ id }: { id?: string }) {
  const traps = useLondon((s) => s.traps);
  const level = useLondon((s) => s.level);
  useHushOnLeave();
  const trap = id ? findTrap(id) : undefined;
  if (trap) return <TrapPuzzle key={trap.id} trap={trap} />;
  return (
    <div className="page narrow london">
      <PageHead title="London traps" back="/london" />
      <p className="muted" style={{ marginTop: -8 }}>
        Positions straight out of London games where there’s one move that wins. Learn them once and you’ll spot them for ever.
      </p>
      {LEVELS.map((lv) => (
        <section key={lv} className={LEVELS.indexOf(lv) > LEVELS.indexOf(level) ? 'london-above' : ''}>
          <SectionTitle>{LEVEL_NAME[lv]}</SectionTitle>
          <div className="list">
            {LONDON_TRAPS.filter((t) => t.level === lv).map((t) => (
              <ListRow
                key={t.id}
                icon={traps[t.id]?.solved ? <Check size={18} /> : <Target size={18} />}
                iconClass={traps[t.id]?.solved ? 'good' : ''}
                title={t.title}
                sub={t.line ? `From ${findLine(t.line)?.name.toLowerCase()}` : 'Opening trick'}
                href={`/london/traps/${t.id}`}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TrapPuzzle({ trap }: { trap: LondonTrap }) {
  const trapResult = useLondon((s) => s.trapResult);
  const start = useMemo(() => {
    const c = new Chess();
    const moves: string[] = [];
    for (const san of trap.moves.split(' ')) {
      const m = c.move(san);
      moves.push(m.from + m.to + (m.promotion ?? ''));
    }
    return { fen: c.fen(), last: moves[moves.length - 1] };
  }, [trap]);
  const solution = useMemo(() => {
    const c = new Chess(start.fen);
    return trap.solution.map((san) => {
      const m = c.move(san);
      return m.from + m.to + (m.promotion ?? '');
    });
  }, [trap, start]);
  const alts = useMemo(
    () =>
      (trap.alts ?? []).map((san) => {
        const m = new Chess(start.fen).move(san);
        return m.from + m.to + (m.promotion ?? '');
      }),
    [trap, start],
  );
  const [step, setStep] = useState(0);
  const [tries, setTries] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const said = useRef(false);

  useEffect(() => {
    if (said.current) return;
    said.current = true;
    show({ moment: 'trapStart', idea: trap.intro, priority: 2 });
  }, [trap]);

  const fen = useMemo(() => {
    const c = new Chess(start.fen);
    for (const u of solution.slice(0, step)) playUci(c, u);
    return c.fen();
  }, [start, solution, step]);
  const chess = useMemo(() => new Chess(fen), [fen]);
  const yourTurn = !solved && step % 2 === 0;

  // Their reply in a longer solution plays itself.
  useEffect(() => {
    if (solved || step % 2 === 0 || step >= solution.length) return;
    const t = setTimeout(() => {
      const c = new Chess(fen);
      const m = playUci(c, solution[step]);
      if (m) playSound(soundForSan(m.san));
      setStep((s) => s + 1);
    }, 500);
    return () => clearTimeout(t);
  }, [step, solved, solution, fen]);

  const onMove = (from: string, to: string, promotion?: string) => {
    if (!yourTurn) return;
    const uci = from + to + (promotion ?? '');
    const want = solution[step];
    const ok = uci.slice(0, 4) === want.slice(0, 4) || (step === 0 && alts.some((a) => a.slice(0, 4) === uci.slice(0, 4)));
    if (!ok) {
      playSound('wrong');
      setTries((n) => n + 1);
      setResetKey((k) => k + 1);
      if (tries >= 1) setShowMove(true);
      void say({ moment: 'trapWrong', detail: trap.wrong, priority: 2 });
      return;
    }
    const c = new Chess(fen);
    const m = playUci(c, uci);
    if (m) playSound(soundForSan(m.san));
    setShowMove(false);
    // An accepted alternative ends the puzzle there.
    if (step + 1 >= solution.length || uci.slice(0, 4) !== want.slice(0, 4)) {
      setStep(step + 1);
      setSolved(true);
      trapResult(trap.id, tries === 0);
      playSound('correct');
      void say({ moment: 'trapRight', idea: trap.why, priority: 2 });
      return;
    }
    setStep(step + 1);
  };

  const shownFen = solved && step >= 1 ? fen : fen;
  const last = step > 0 ? solution[step - 1] : start.last;
  const shapes = useMemo(() => {
    if (solved) return toShapes(trap.arrows);
    if (showMove && yourTurn) return [moveShape(solution[step], 'green')];
    return [];
  }, [solved, showMove, yourTurn, solution, step, trap, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const idx = LONDON_TRAPS.findIndex((t) => t.id === trap.id);
  const nextTrap = LONDON_TRAPS[(idx + 1) % LONDON_TRAPS.length];

  return (
    <div className="game-layout focus-screen lesson-screen london-screen">
      <div className="board-column">
        <div className="player-bar lesson-top">
          <button className="icon-btn" onClick={() => navigate('/london/traps')} aria-label="Close">
            <X size={22} />
          </button>
          <b>{trap.title}</b>
          <span className="spacer" />
          <span className="faint">{solved ? 'Solved' : 'White to move'}</span>
        </div>
        <div className="board-row">
          <Board
            fen={shownFen}
            orientation="white"
            movableColor={yourTurn ? 'white' : undefined}
            dests={yourTurn ? legalDests(chess) : undefined}
            lastMove={last ? [last.slice(0, 2), last.slice(2, 4)] : undefined}
            check={chess.inCheck()}
            shapes={shapes}
            onMove={onMove}
            viewOnly={!yourTurn}
          />
        </div>
      </div>
      <div className="side-panel">
        <div className="panel-body">
          <CoachBubble idle={trap.intro} />
        </div>
        <div className="play-controls">
          {solved ? (
            <>
              <button
                className="ctl"
                onClick={() => {
                  setStep(0);
                  setSolved(false);
                  setTries(0);
                  setShowMove(false);
                }}
              >
                <span className="ctl-ico">
                  <RotateCcw size={20} />
                </span>
                <span className="ctl-label">Again</span>
              </button>
              <button className="ctl wide go" onClick={() => navigate(`/london/traps/${nextTrap.id}`, { replace: true })}>
                <span className="ctl-ico">
                  <ChevronRight size={22} />
                </span>
                <span className="ctl-label">Next trap</span>
              </button>
            </>
          ) : (
            <>
              <button className="ctl wide" onClick={() => void say({ moment: 'hint', detail: trap.hint, priority: 2 })}>
                <span className="ctl-ico">
                  <Lightbulb size={20} />
                </span>
                <span className="ctl-label">Hint</span>
              </button>
              <button
                className="ctl"
                onClick={() => {
                  setShowMove(true);
                  setTries((n) => n + 1);
                }}
                disabled={!yourTurn || showMove}
              >
                <span className="ctl-ico">
                  <Target size={20} />
                </span>
                <span className="ctl-label">Show me</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
