// `#/coach`: your coach. It watches your games (here, and on chess.com once
// it knows your username), reviews them, and has a debrief ready for each:
// a few key moments to try again, then one habit to take into the next game.
import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHead, SectionTitle } from '../components/ui';
import { BotFace } from '../components/Avatar';
import { findBot } from '../lib/bots/bots';
import { focusHabit, habitTrend, lessonsFor, type Habit } from '../lib/coach/debrief';
import { navigate } from '../lib/router';
import type { GameRecord } from '../lib/storage/db';
import { useCoach } from '../state/coach';
import { useReviewer } from '../state/reviewer';
import { useReviewedGames } from '../state/reviewedGames';
import { ResultChip, useGames, when } from './Games';

const opponentOf = (g: GameRecord) => (g.userColor === 'w' ? g.black : g.white);

export function CoachPage() {
  const coach = useCoach();
  const games = useGames();
  const reviewed = useReviewedGames();
  const jobs = useReviewer((s) => s.jobs);
  const [name, setName] = useState(coach.chesscom);

  const byId = useMemo(() => new Map((reviewed ?? []).map((r) => [r.game.id, r])), [reviewed]);
  const mine = (games ?? []).filter((g) => g.userColor && g.moves.length >= 6);
  const waiting = mine.filter((g) => g.createdAt >= coach.since && !coach.debriefed[g.id]).slice(0, 8);
  const done = mine
    .filter((g) => coach.debriefed[g.id])
    .sort((a, b) => coach.debriefed[b.id] - coach.debriefed[a.id])
    .slice(0, 4);
  const habit = useMemo(() => (reviewed?.length ? focusHabit(reviewed) : null), [reviewed]);

  const watch = async () => {
    coach.setChessCom(name);
    if (name.trim()) await useCoach.getState().sync(true);
  };

  return (
    <div className="page narrow coach-page">
      <PageHead title="Your coach" />
      <p className="coach-lead">
        Your coach watches your games, reviews each one, and goes over it with you: the few moments that mattered, as positions to try again, then one
        habit to take into your next game.
      </p>

      <section className="card-box coach-watch">
        {coach.chesscom ? (
          <>
            <div className="cw-row">
              <span className="cw-dot" aria-hidden />
              <span className="cw-body">
                <b>Watching {coach.chesscom} on chess.com</b>
                <span>
                  {coach.syncing
                    ? 'Looking for new games…'
                    : coach.lastError
                      ? `Couldn't reach chess.com: ${coach.lastError}`
                      : coach.lastSync
                        ? `Checked ${when(coach.lastSync)}${coach.lastNew ? `: ${coach.lastNew} new game${coach.lastNew > 1 ? 's' : ''}` : ''}. New games come in whenever you open the app.`
                        : 'New games come in whenever you open the app.'}
                </span>
              </span>
              <button className="btn small" onClick={() => void coach.sync(true)} disabled={coach.syncing} aria-label="Check now">
                <RefreshCw size={16} className={coach.syncing ? 'spin' : ''} />
              </button>
            </div>
            <button className="link-btn" onClick={() => coach.setChessCom('')}>
              Stop watching chess.com
            </button>
          </>
        ) : (
          <>
            <b>Play on chess.com?</b>
            <p className="faint">Give your username and your coach will pick up your games there too. Games you play here are always covered.</p>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                void watch();
              }}
            >
              <input className="input" placeholder="chess.com username" value={name} onChange={(e) => setName(e.target.value)} autoCapitalize="off" />
              <button className="btn primary" disabled={!name.trim()}>
                Watch my games
              </button>
            </form>
          </>
        )}
      </section>

      <SectionTitle>Ready to go over</SectionTitle>
      {!games ? null : waiting.length ? (
        <div className="debrief-list">
          {waiting.map((g) => {
            const r = byId.get(g.id);
            const job = jobs[g.id];
            const moments = r ? lessonsFor(r).practice.length : null;
            return (
              <DebriefRow
                key={g.id}
                g={g}
                sub={
                  r
                    ? moments
                      ? `${moments} moment${moments > 1 ? 's' : ''} to learn from`
                      : 'A clean game: a quick look'
                    : job?.status === 'running'
                      ? `Reviewing… ${Math.round((100 * job.done) / Math.max(1, job.total))}%`
                      : 'Waiting for its review'
                }
                action={r ? 'Debrief' : job?.status === 'running' ? undefined : 'Review'}
                onClick={() => (r ? navigate(`/review/${g.id}?debrief=1`) : void useReviewer.getState().start(g.id))}
              />
            );
          })}
        </div>
      ) : (
        <p className="faint coach-empty">
          {mine.length
            ? 'You are all caught up. Play a game and your coach will have it ready.'
            : 'Play a game, here or on chess.com, and your coach will go over it with you.'}
        </p>
      )}

      <SectionTitle>What we're working on</SectionTitle>
      {habit ? (
        <HabitCard h={habit} />
      ) : (
        <p className="faint coach-empty">After a few reviewed games your coach will pick the habit that costs you the most.</p>
      )}

      {done.length > 0 && (
        <>
          <SectionTitle>Gone over</SectionTitle>
          <div className="debrief-list">
            {done.map((g) => (
              <DebriefRow
                key={g.id}
                g={g}
                sub={`Gone over ${when(coach.debriefed[g.id])}`}
                action="Again"
                quiet
                onClick={() => navigate(`/review/${g.id}?debrief=1`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DebriefRow({ g, sub, action, quiet, onClick }: { g: GameRecord; sub: string; action?: string; quiet?: boolean; onClick: () => void }) {
  const opp = opponentOf(g);
  const bot = opp.botId ? findBot(opp.botId) : undefined;
  return (
    <button className="debrief-row" onClick={onClick}>
      <ResultChip g={g} />
      {bot && (
        <span className="avatar dr-av">
          <BotFace bot={bot} />
        </span>
      )}
      <span className="dr-body">
        <b>
          vs {opp.name}
          {opp.elo ? <span className="faint"> ({opp.elo})</span> : null}
        </b>
        <span>
          {g.source === 'import' ? 'chess.com · ' : ''}
          {when(g.createdAt)} · {sub}
        </span>
      </span>
      {action && <span className={`btn small ${quiet ? '' : 'primary'}`}>{action}</span>}
    </button>
  );
}

export function HabitCard({ h, compact }: { h: Habit; compact?: boolean }) {
  const trend = habitTrend(h);
  const per = (x: number) =>
    x >= 0.95 ? `${x.toFixed(1)} times a game` : x >= 0.05 ? `about ${Math.round(x * 10)} times in 10 games` : 'hardly ever';
  const trendText =
    trend === 'better'
      ? `Getting better: ${per(h.recent)} in your last 6 games, down from ${per(h.before!)}.`
      : trend === 'worse'
        ? `It has come up more lately: ${per(h.recent)} in your last 6 games, up from ${per(h.before!)}.`
        : trend === 'same'
          ? `About the same as before: ${per(h.recent)} in your last 6 games.`
          : `It came up ${per(h.recent)} in your recent games.`;
  return (
    <div className={`card-box habit-card ${trend ?? ''}`}>
      <div className="hc-head">
        <span className="hc-icon" aria-hidden>
          {h.icon}
        </span>
        <b>{h.title}</b>
      </div>
      <p className="hc-rule">{h.rule}</p>
      {!compact && <p className={`hc-trend ${trend ?? ''}`}>{trendText}</p>}
      <div className="row">
        {h.puzzles && (
          <button className="btn small primary" onClick={() => navigate(`/puzzles/play?theme=${h.puzzles!.join(',')}`)}>
            Practise it
          </button>
        )}
        {h.lesson && (
          <button className="btn small" onClick={() => navigate(`/learn/${h.lesson}`)}>
            The lesson
          </button>
        )}
      </div>
    </div>
  );
}
