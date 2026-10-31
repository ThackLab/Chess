import { useState } from 'react';
import { candidatesFromPgn, fetchChessCom, fetchLichess, toRecord, type Candidate } from '../lib/importGames';
import { navigate } from '../lib/router';
import { listGames, saveGame } from '../lib/storage/db';
import { Segmented, toast } from '../components/Widgets';
import { useReviewer } from '../state/reviewer';
import { PageHead } from '../components/ui';
import { useSettings } from '../state/settings';

type Source = 'chesscom' | 'lichess' | 'pgn';

const LS_USER = 'grandmasters.import-user';

function savedUser(src: Source) {
  try {
    return JSON.parse(localStorage.getItem(LS_USER) ?? '{}')[src] ?? '';
  } catch {
    return '';
  }
}

function rememberUser(src: Source, name: string) {
  try {
    const cur = JSON.parse(localStorage.getItem(LS_USER) ?? '{}');
    cur[src] = name;
    localStorage.setItem(LS_USER, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
}

export function ImportPage() {
  const [src, setSrc] = useState<Source>('chesscom');
  const [user, setUser] = useState<string>(() => savedUser('chesscom'));
  const [pgn, setPgn] = useState('');
  const [pgnName, setPgnName] = useState(() => {
    const n = useSettings.getState().playerName;
    return n === 'You' ? '' : n;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<Candidate[]>([]);
  const [known, setKnown] = useState<Set<string>>(new Set());

  const refreshKnown = async () => setKnown(new Set((await listGames()).map((g) => g.id)));

  const load = async () => {
    // The name used in PGN files is remembered as your player name.
    if (src === 'pgn' && pgnName.trim()) useSettings.getState().set({ playerName: pgnName.trim() });
    setError(null);
    setBusy(true);
    setList([]);
    try {
      let out: Candidate[] = [];
      if (src === 'pgn') out = candidatesFromPgn(pgn);
      else {
        if (!user.trim()) throw new Error('Enter a username');
        rememberUser(src, user.trim());
        out = src === 'chesscom' ? await fetchChessCom(user.trim()) : await fetchLichess(user.trim());
      }
      if (!out.length) throw new Error('No games found');
      setList(out);
      await refreshKnown();
    } catch (e) {
      setError(e instanceof Error ? (e.message === 'Failed to fetch' ? 'Network error – are you online?' : e.message) : String(e));
    } finally {
      setBusy(false);
    }
  };

  const importOne = async (c: Candidate, review: boolean) => {
    const rec = toRecord(c, src === 'pgn' ? pgnName.trim() || undefined : user.trim());
    if (!rec) return toast('Could not read that game');
    if (!known.has(rec.id)) await saveGame(rec);
    await refreshKnown();
    if (review) navigate(`/review/${rec.id}`);
  };

  const importAll = async () => {
    let n = 0;
    for (const c of list) {
      const rec = toRecord(c, src === 'pgn' ? pgnName.trim() || undefined : user.trim());
      if (rec && !known.has(rec.id)) {
        await saveGame(rec);
        n++;
      }
    }
    await refreshKnown();
    toast(n === 1 ? 'Imported 1 game' : `Imported ${n} games`);
  };

  const idOf = (c: Candidate) => `imp-${c.site}-${c.key}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 80);
  const me = user.trim().toLowerCase();

  return (
    <div className="page narrow">
      <PageHead title="Import games" back="/you" />
      <p className="muted">Review your games from chess.com or lichess for free, or paste/upload any PGN (multi-game files are fine).</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <Segmented
          value={src}
          onChange={(s) => {
            setSrc(s);
            setList([]);
            setError(null);
            if (s !== 'pgn') setUser(savedUser(s));
          }}
          options={[
            { value: 'chesscom', label: 'chess.com' },
            { value: 'lichess', label: 'lichess' },
            { value: 'pgn', label: 'PGN' },
          ]}
        />
        <div style={{ marginTop: 12 }}>
          {src === 'pgn' ? (
            <>
              <textarea rows={8} placeholder="Paste PGN here" value={pgn} onChange={(e) => setPgn(e.target.value)} />
              <input
                className="input"
                style={{ marginTop: 8, width: '100%' }}
                placeholder="Your name in these games (optional, for Insights)"
                value={pgnName}
                onChange={(e) => setPgnName(e.target.value)}
              />
              <div className="row" style={{ marginTop: 8 }}>
                <label className="btn small">
                  Open .pgn file
                  <input
                    type="file"
                    accept=".pgn,.txt"
                    style={{ display: 'none' }}
                    onChange={async (e) => e.target.files?.[0] && setPgn(await e.target.files[0].text())}
                  />
                </label>
                <span className="spacer" />
                <button className="btn primary" onClick={load} disabled={busy || !pgn.trim()}>
                  Read games
                </button>
              </div>
            </>
          ) : (
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                void load();
              }}
            >
              <input
                placeholder={`${src === 'chesscom' ? 'chess.com' : 'lichess'} username`}
                value={user}
                onChange={(e) => setUser(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
              />
              <button className="btn primary" disabled={busy}>
                {busy ? 'Loading…' : 'Fetch recent games'}
              </button>
            </form>
          )}
        </div>
        {error && (
          <div className="error-box" style={{ marginTop: 10 }}>
            {error}
          </div>
        )}
      </div>

      {list.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <div className="row" style={{ padding: '12px 14px' }}>
            <b>{list.length === 1 ? '1 game' : `${list.length} games`}</b>
            <span className="spacer" />
            <button className="btn small" onClick={importAll}>
              Import all to library
            </button>
            <button
              className="btn small primary"
              onClick={async () => {
                await importAll();
                for (const c of list.slice(0, 10)) void useReviewer.getState().start(idOf(c));
                toast('Reviewing the 10 most recent games in the background');
              }}
            >
              Import & review latest 10
            </button>
          </div>
          <table className="table">
            <tbody>
              {list.map((c) => {
                const userWhite = c.white.toLowerCase() === me;
                const userBlack = c.black.toLowerCase() === me;
                const outcome =
                  c.result === '1/2-1/2' ? 'draw' : userWhite || userBlack ? ((c.result === '1-0') === userWhite ? 'win' : 'loss') : null;
                return (
                  <tr key={c.key}>
                    <td>
                      {outcome ? (
                        <span className={`result-chip ${outcome}`}>{outcome === 'win' ? '+' : outcome === 'loss' ? '−' : '='}</span>
                      ) : (
                        <span className="tag">{c.result}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: userWhite ? 800 : 500 }}>
                        {c.white} <span className="faint">{c.whiteElo ?? ''}</span>
                      </div>
                      <div style={{ fontWeight: userBlack ? 800 : 500 }}>
                        {c.black} <span className="faint">{c.blackElo ?? ''}</span>
                      </div>
                    </td>
                    <td className="faint" style={{ fontSize: '0.85rem' }}>
                      {c.timeClass}
                      <div>{c.date}</div>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {known.has(idOf(c)) && (
                        <span className="tag" style={{ marginRight: 6 }}>
                          saved
                        </span>
                      )}
                      <button className="btn small primary" onClick={() => importOne(c, true)}>
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
