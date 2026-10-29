// The Friends card on the Play a friend screen: find people nearby (Android
// app, over Bluetooth), add them with one tap, and invite friends to a live game.
import { useEffect, useMemo, useState } from 'react';
import { BluetoothSearching, Check, Send, Share2, UserPlus, X } from 'lucide-react';
import { toast } from '../components/Widgets';
import { navigate } from '../lib/router';
import { copyText } from '../lib/platform';
import { monogram } from '../lib/bots/bots';
import { formatCode } from '../lib/online/relay';
import { closeness, nearbySupported, openNearbySettings, startNearby, type NearbyStatus } from '../lib/nearby';
import { usePeople, type Person } from '../state/people';
import { baseUrl } from '../state/friend';
import { useSettings } from '../state/settings';
import { ONLINE_CLOCKS } from './Online';

const useMyName = () => useSettings((s) => (s.playerName === 'You' ? '' : s.playerName));

/** A link that adds you as a friend in one tap: `#/friend?add=<code>&name=<name>`. */
export const friendLink = (id: string, name: string) => `${baseUrl()}#/friend?add=${id}${name ? `&name=${encodeURIComponent(name)}` : ''}`;

function invite(p: Person) {
  const code = usePeople.getState().invite(p.id);
  toast(`Invite sent to ${p.name}`);
  navigate(`/online/${code}`);
}

export function PeopleCard({ addId, addName }: { addId?: string | null; addName?: string | null }) {
  const ensureMe = usePeople((s) => s.ensureMe);
  const me = usePeople((s) => s.me);
  const people = usePeople((s) => s.people);
  useEffect(() => {
    ensureMe();
  }, [ensureMe]);
  if (!me) return null;
  return (
    <section className="friend-card people-card">
      <h2>
        <UserPlus size={22} className="ic-friends" /> Friends
      </h2>
      {addId && <AddFromLink id={addId} name={addName ?? ''} />}
      {nearbySupported() ? (
        <NearbyFinder />
      ) : (
        <p className="muted">
          Finding people nearby uses Bluetooth, which only the Android app can do. Here you can add friends with their link or friend code, and invite
          them with one tap.
        </p>
      )}
      {people.length > 0 && <FriendList people={people} />}
      <MyCode id={me} />
      <AddByCode />
    </section>
  );
}

/** Someone's "add me" link was opened. */
function AddFromLink({ id, name }: { id: string; name: string }) {
  const add = usePeople((s) => s.add);
  const me = usePeople((s) => s.me);
  const known = usePeople((s) => s.people.some((p) => p.id === id));
  if (id === me) return null;
  if (known) return <p className="people-note ok">{name || 'They'} are in your friends.</p>;
  return (
    <div className="people-note">
      <span className="fc-avatar small">{monogram(name || 'Friend')}</span>
      <span className="pn-body">
        <b>Add {name || 'this player'}?</b>
        <span>Then you can invite each other with one tap.</span>
      </span>
      <button
        className="btn primary small"
        onClick={() => {
          if (add(id, name) === 'invalid') toast('That link is broken');
          navigate('/friend');
        }}
      >
        Add
      </button>
    </div>
  );
}

function FriendList({ people }: { people: Person[] }) {
  const clock = usePeople((s) => s.clock);
  const setClock = usePeople((s) => s.setClock);
  const idx = Math.max(
    0,
    ONLINE_CLOCKS.findIndex((c) => JSON.stringify(c.tc) === JSON.stringify(clock)),
  );
  const sorted = useMemo(() => [...people].sort((a, b) => a.name.localeCompare(b.name)), [people]);
  return (
    <div className="people-block">
      <div className="people-head">
        <span>Your friends</span>
        <label className="clock-pick">
          Invite to
          <select value={idx} onChange={(e) => setClock(ONLINE_CLOCKS[+e.target.value].tc)}>
            {ONLINE_CLOCKS.map((c, i) => (
              <option key={c.label} value={i}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="people-list">
        {sorted.map((p) => (
          <FriendRow key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}

function FriendRow({ p }: { p: Person }) {
  const remove = usePeople((s) => s.remove);
  const [removing, setRemoving] = useState(false);
  return (
    <div className="person-row">
      <span className="fc-avatar small">{monogram(p.name)}</span>
      <span className="pr-body">
        <b>{p.name}</b>
        <span>{formatCode(p.id)}</span>
      </span>
      {removing ? (
        <>
          <button className="btn small danger" onClick={() => remove(p.id)}>
            Remove
          </button>
          <button className="icon-btn" onClick={() => setRemoving(false)} aria-label="Keep">
            <X size={18} />
          </button>
        </>
      ) : (
        <>
          <button className="btn primary small" onClick={() => invite(p)}>
            <Send size={15} /> Invite
          </button>
          <button className="icon-btn" onClick={() => setRemoving(true)} aria-label={`Remove ${p.name}`}>
            <X size={18} />
          </button>
        </>
      )}
    </div>
  );
}

interface Seen {
  id: string;
  name: string;
  rssi: number;
  at: number;
}

const STATUS_TEXT: Partial<Record<NearbyStatus, string>> = {
  asking: 'Allow “Nearby devices” so Grandmasters can find players close to you.',
  'on-hidden': 'Looking for players nearby. This phone can’t make itself visible over Bluetooth, so they won’t see you, but you can add them.',
  'bluetooth-off': 'Bluetooth is off.',
  'location-off': 'On Android 11 and older, scanning for Bluetooth devices needs Location switched on. Grandmasters never reads your location.',
  denied: 'Grandmasters isn’t allowed to look for nearby devices.',
  unsupported: 'This phone doesn’t have Bluetooth LE, so it can’t find people nearby.',
  failed: 'Bluetooth didn’t start. Try again, or switch Bluetooth off and on.',
};

/** Android app: shows this phone to players nearby and lists the ones it can see. */
function NearbyFinder() {
  const me = usePeople((s) => s.me)!;
  const friends = usePeople((s) => s.people);
  const add = usePeople((s) => s.add);
  const myName = useMyName();
  const [draft, setDraft] = useState('');
  const [on, setOn] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<NearbyStatus>('off');
  const [seen, setSeen] = useState<Record<string, Seen>>({});

  useEffect(() => {
    if (!on || !myName) return;
    const stop = startNearby(me, myName, (e) => {
      if (e.type === 'status') setStatus(e.status);
      else setSeen((s) => ({ ...s, [e.id]: { ...e, at: Date.now() } }));
    });
    // People who walked away (or closed the screen) drop off after a few seconds.
    const prune = setInterval(() => {
      const cutoff = Date.now() - 12_000;
      setSeen((s) => Object.fromEntries(Object.entries(s).filter(([, p]) => p.at > cutoff)));
    }, 3000);
    return () => {
      stop();
      clearInterval(prune);
      setStatus('off');
      setSeen({});
    };
  }, [on, me, myName, attempt]);

  const list = Object.values(seen).sort((a, b) => b.rssi - a.rssi);
  const retry = () => setAttempt((x) => x + 1);

  if (!on) {
    return (
      <div className="nearby">
        <button className="btn primary big block" onClick={() => setOn(true)}>
          <BluetoothSearching size={20} /> Find people nearby
        </button>
        <p className="muted small">Uses Bluetooth. While this is on, Grandmasters players close to you can see your name, and you can see theirs.</p>
      </div>
    );
  }
  if (!myName) {
    return (
      <div className="nearby">
        <p className="muted">What should people nearby see you as?</p>
        <div className="join-row">
          <input placeholder="Your name" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={24} autoFocus />
          <button className="btn primary" disabled={!draft.trim()} onClick={() => useSettings.getState().set({ playerName: draft.trim() })}>
            Go
          </button>
        </div>
      </div>
    );
  }
  const looking = status === 'on' || status === 'on-hidden';
  return (
    <div className="nearby">
      <div className={`nearby-status ${looking ? 'live' : ''}`}>
        {looking && <span className="radar" aria-hidden />}
        <span className="ns-body">
          {status === 'on' ? (
            <>
              <b>Looking for players nearby</b>
              <span>They need Grandmasters open on this screen too. They see you as {myName}.</span>
            </>
          ) : (
            <span>{STATUS_TEXT[status] ?? 'Starting Bluetooth…'}</span>
          )}
        </span>
        <button className="icon-btn" onClick={() => setOn(false)} aria-label="Stop looking">
          <X size={18} />
        </button>
      </div>
      {status === 'bluetooth-off' && (
        <button className="btn block" onClick={() => openNearbySettings('bluetooth')}>
          Turn on Bluetooth
        </button>
      )}
      {status === 'location-off' && (
        <button className="btn block" onClick={() => openNearbySettings('location')}>
          Location settings
        </button>
      )}
      {status === 'denied' && (
        <div className="btn-row">
          <button className="btn" onClick={retry}>
            Try again
          </button>
          <button className="btn" onClick={() => openNearbySettings('app')}>
            App permissions
          </button>
        </div>
      )}
      {status === 'failed' && (
        <button className="btn block" onClick={retry}>
          Try again
        </button>
      )}
      {list.length > 0 && (
        <div className="people-list">
          {list.map((p) => {
            const friend = friends.find((f) => f.id === p.id);
            return (
              <div key={p.id} className="person-row">
                <span className="fc-avatar small">{monogram(p.name || 'Player')}</span>
                <span className="pr-body">
                  <b>{friend?.name ?? (p.name || 'Player')}</b>
                  <span>{closeness(p.rssi)}</span>
                </span>
                {friend ? (
                  <button className="btn primary small" onClick={() => invite(friend)}>
                    <Send size={15} /> Invite
                  </button>
                ) : (
                  <button
                    className="btn small"
                    onClick={() => {
                      add(p.id, p.name);
                      toast(`${p.name || 'Player'} added`);
                    }}
                  >
                    <UserPlus size={15} /> Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MyCode({ id }: { id: string }) {
  const name = useMyName();
  const share = async () => {
    const url = friendLink(id, name);
    const text = `Add me on Grandmasters so we can play chess: open the link, or enter my friend code ${formatCode(id)}.`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Grandmasters', text, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    await copyText(`${text}\n${url}`);
    toast('Link copied. Send it to your friend.');
  };
  return (
    <div className="my-code">
      <span className="mc-body">
        <span>Your friend code</span>
        <b>{formatCode(id)}</b>
      </span>
      <button className="btn small" onClick={() => void share()}>
        <Share2 size={15} /> Share
      </button>
    </div>
  );
}

function AddByCode() {
  const add = usePeople((s) => s.add);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const go = () => {
    const r = add(code, name);
    if (r === 'invalid') return toast('That isn’t a friend code');
    if (r === 'self') return toast('That’s your own code');
    toast(r === 'added' ? `${name.trim() || 'Friend'} added` : 'Already in your friends');
    setCode('');
    setName('');
  };
  return (
    <details className="add-code">
      <summary>Add a friend by code</summary>
      <div className="friend-fields">
        <input
          placeholder="Friend code XXXXX-XXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="characters"
          spellCheck={false}
        />
        <input placeholder="Their name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
      </div>
      <button className="btn block" onClick={go} disabled={!code.trim()}>
        <Check size={16} /> Add
      </button>
    </details>
  );
}
