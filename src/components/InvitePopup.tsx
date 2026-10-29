// Invites and friend requests pop up here, on any screen, while the app is open.
import { useEffect } from 'react';
import { Swords, UserPlus } from 'lucide-react';
import { navigate } from '../lib/router';
import { vibrate } from '../lib/platform';
import { playSound } from '../lib/sound';
import { Avatar } from './Avatar';
import { personalityOf } from '../lib/avatars';
import { usePeople } from '../state/people';
import { tcLabel } from '../state/online';

export function InvitePopup() {
  const n = usePeople((s) => s.incoming[0]);
  const known = usePeople((s) => !!n && s.people.some((p) => p.id === n.from.id));
  const { accept, decline, dismiss, add } = usePeople.getState();

  useEffect(() => {
    if (!n) return;
    playSound(n.t === 'invite' ? 'start' : 'correct');
    vibrate([40, 80, 40]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n?.mid]);

  if (!n) return null;
  const name = n.from.name;
  return (
    <div className="invite-pop" role="alertdialog" aria-live="assertive" aria-label={n.t === 'invite' ? `${name} challenges you` : name}>
      <Avatar av={n.from.av} name={name} className="fc-avatar invite-av" />
      {n.t === 'invite' ? (
        <>
          <span className="ip-body">
            <b>
              <Swords size={16} /> {name} challenges you
            </b>
            <span>
              {personalityOf(n.from.av)?.name ?? 'Live game'} · {n.tc ? tcLabel(n.tc) : 'no clock'}
              {known ? '' : ' · not in your friends yet'}
            </span>
          </span>
          <span className="ip-actions">
            <button className="btn small" onClick={() => decline(n.mid)}>
              Not now
            </button>
            <button
              className="btn primary small"
              onClick={() => {
                const code = accept(n.mid);
                if (code) navigate(`/online/${code}?accept=1`);
              }}
            >
              Play
            </button>
          </span>
        </>
      ) : n.t === 'hello' ? (
        <>
          <span className="ip-body">
            <b>
              <UserPlus size={16} /> {name} added you
            </b>
            <span>Add them back to invite each other with one tap.</span>
          </span>
          <span className="ip-actions">
            <button className="btn small" onClick={() => dismiss(n.mid)}>
              Not now
            </button>
            <button
              className="btn primary small"
              onClick={() => {
                add(n.from.id, name);
                dismiss(n.mid);
              }}
            >
              Add back
            </button>
          </span>
        </>
      ) : (
        <>
          <span className="ip-body">
            <b>{name} can’t play right now</b>
            <span>Your invite was turned down. Try again later.</span>
          </span>
          <span className="ip-actions">
            <button className="btn primary small" onClick={() => dismiss(n.mid)}>
              OK
            </button>
          </span>
        </>
      )}
    </div>
  );
}
