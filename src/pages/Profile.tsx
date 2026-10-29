// `#/profile`: your name and avatar. Friends see them in invites, live games and nearby.
import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, RefreshCw } from 'lucide-react';
import { PageHead } from '../components/ui';
import { Avatar, PersonalityIconFor, PersonalityTag } from '../components/Avatar';
import { PERSONALITIES, VARIANTS, avatarCode, parseAvatar } from '../lib/avatars';
import type { Credit } from '../lib/avatarArt';
import { useSettings } from '../state/settings';

const BATCH = 24;
/** Coprime with 1024, so each batch spreads over all the variants. */
const STEP = 389;

export function ProfilePage() {
  const stored = useSettings((s) => (s.playerName === 'You' ? '' : s.playerName));
  const av = useSettings((s) => s.avatar);
  const set = useSettings((s) => s.set);
  const current = parseAvatar(av);
  const [draft, setDraft] = useState(stored);
  const [type, setType] = useState(current.kind === 'art' ? current.p : 0);
  const [start, setStart] = useState(() => (current.kind === 'art' ? current.v : Math.floor(Math.random() * VARIANTS)));
  const [count, setCount] = useState(BATCH);
  const [credit, setCredit] = useState<Credit | null>(null);
  const p = PERSONALITIES[type];
  const variants = useMemo(() => Array.from({ length: count }, (_, i) => (start + i * STEP) % VARIANTS), [start, count]);

  useEffect(() => {
    let live = true;
    void import('../lib/avatarArt').then((m) => live && setCredit(m.styleCredit(p.style)));
    return () => {
      live = false;
    };
  }, [p.style]);

  const pickType = (i: number) => {
    setType(i);
    setStart(Math.floor(Math.random() * VARIANTS));
    setCount(BATCH);
  };

  return (
    <div className="page narrow profile">
      <PageHead title="Your profile" back="/you" />
      <section className="profile-hero">
        <Avatar av={av} name={draft || 'Me'} className="profile-avatar" />
        <div className="ph-body">
          <input
            className="profile-name"
            placeholder="Your name"
            value={draft}
            maxLength={24}
            onChange={(e) => {
              setDraft(e.target.value);
              set({ playerName: e.target.value.trim() || 'You' });
            }}
            onBlur={() => setDraft(draft.trim())}
          />
          {current.kind === 'art' ? (
            <>
              <PersonalityTag p={current.personality} />
              <span className="ph-line">{current.personality.line}</span>
            </>
          ) : (
            <span className="ph-line">Pick a personality below and choose your look.</span>
          )}
        </div>
      </section>
      <p className="muted small">Friends see your name and avatar in invites, live games and when you’re nearby.</p>

      <h2 className="profile-h">Pick your personality</h2>
      <div className="type-chips" role="tablist">
        {PERSONALITIES.map((x, i) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={i === type}
            className={`type-chip ${i === type ? 'on' : ''}`}
            style={i === type ? { borderColor: x.color } : undefined}
            onClick={() => pickType(i)}
          >
            <PersonalityIconFor p={x} size={16} /> {x.name.replace(/^The /, '')}
          </button>
        ))}
      </div>

      <section className="type-card" style={{ borderColor: p.color }}>
        <span className="tc-icon" style={{ background: `${p.color}22` }}>
          <PersonalityIconFor p={p} size={26} />
        </span>
        <span className="tc-body">
          <b>{p.name}</b>
          <span>{p.line}</span>
        </span>
      </section>

      <div className="av-grid">
        {variants.map((v) => {
          const code = avatarCode(type, v);
          const on = code === av;
          return (
            <button
              key={v}
              className={`av-pick ${on ? 'on' : ''}`}
              style={on ? { borderColor: p.color } : undefined}
              onClick={() => set({ avatar: code })}
              aria-label={`${p.name}, look ${v + 1}`}
              aria-pressed={on}
            >
              <Avatar av={code} name="" className="av-tile" />
              {on && (
                <span className="av-check" style={{ background: p.color }}>
                  <Check size={14} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="btn-row">
        <button className="btn" onClick={() => setStart(Math.floor(Math.random() * VARIANTS))}>
          <RefreshCw size={16} /> Shuffle
        </button>
        {count < VARIANTS && (
          <button className="btn" onClick={() => setCount((c) => Math.min(VARIANTS, c + BATCH))}>
            <Plus size={16} /> More looks
          </button>
        )}
      </div>
      {av !== 0 && (
        <button className="btn ghost block" onClick={() => set({ avatar: 0 })}>
          Use my initials instead
        </button>
      )}
      {credit && (
        <p className="credit">
          {p.name.replace(/^The /, '')} art: “{credit.title}” by {credit.creator}
          {credit.license && (
            <>
              {' · '}
              {credit.licenseUrl ? (
                <a href={credit.licenseUrl} target="_blank" rel="noreferrer">
                  {credit.license}
                </a>
              ) : (
                credit.license
              )}
            </>
          )}
          {' · drawn with '}
          <a href="https://www.dicebear.com" target="_blank" rel="noreferrer">
            DiceBear
          </a>
        </p>
      )}
    </div>
  );
}
