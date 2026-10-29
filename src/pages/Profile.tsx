// `#/profile`: your name and avatar. Friends see them in invites, live games and nearby.
import { useRef, useState } from 'react';
import { Camera, Check, Type } from 'lucide-react';
import { PageHead } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { toast } from '../components/Widgets';
import { AVATARS, PHOTO, avatarCode, parseAvatar } from '../lib/avatars';
import { photoFromFile } from '../lib/photo';
import { useSettings } from '../state/settings';

export function ProfilePage() {
  const stored = useSettings((s) => (s.playerName === 'You' ? '' : s.playerName));
  const av = useSettings((s) => s.avatar);
  const photo = useSettings((s) => s.photo);
  const set = useSettings((s) => s.set);
  const [draft, setDraft] = useState(stored);
  const file = useRef<HTMLInputElement>(null);
  const current = parseAvatar(av);
  const label = current.kind === 'art' ? current.art.name : current.kind === 'photo' ? 'Your photo' : 'Your initials';

  const upload = async (f: File | undefined) => {
    if (!f) return;
    try {
      set({ photo: await photoFromFile(f), avatar: PHOTO });
    } catch {
      toast('That picture couldn’t be opened. Try another one.');
    }
  };

  return (
    <div className="page narrow profile">
      <PageHead title="Your profile" back="/you" />
      <section className="profile-hero">
        <Avatar av={av} photo={photo} name={draft || 'Me'} className="profile-avatar" />
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
          <span className="ph-line">{label} · friends see this in invites, games and nearby</span>
        </div>
      </section>

      <h2 className="profile-h">Pick your avatar</h2>
      <div className="av-grid">
        <button className={`av-pick av-special ${av === PHOTO ? 'on' : ''}`} onClick={() => file.current?.click()} aria-label="Upload your own photo">
          {photo ? (
            <Avatar av={PHOTO} photo={photo} name="" className="av-tile" />
          ) : (
            <span className="av-initials">
              <Camera size={28} />
            </span>
          )}
          <span className="av-name">{photo ? 'Change photo' : 'Upload'}</span>
          {av === PHOTO && <PickedMark />}
        </button>
        <button
          className={`av-pick av-special ${av === 0 ? 'on' : ''}`}
          onClick={() => set({ avatar: 0 })}
          aria-label="Use your initials"
          aria-pressed={av === 0}
        >
          <span className="av-initials">{draft ? draft.slice(0, 2).toUpperCase() : <Type size={28} />}</span>
          <span className="av-name">Initials</span>
          {av === 0 && <PickedMark />}
        </button>
        {AVATARS.map((a, i) => {
          const code = avatarCode(i);
          const on = code === av;
          return (
            <button key={a.id} className={`av-pick ${on ? 'on' : ''}`} onClick={() => set({ avatar: code })} aria-label={a.name} aria-pressed={on}>
              <Avatar av={code} name="" className="av-tile" />
              <span className="av-name">{a.name}</span>
              {on && <PickedMark />}
            </button>
          );
        })}
      </div>
      <input ref={file} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => void upload(e.target.files?.[0])} />
      <p className="credit">
        Your photo is cropped to a small square and stays on your phone; only friends you’ve added receive it, encrypted. Avatars:{' '}
        <a href="https://github.com/microsoft/fluentui-emoji" target="_blank" rel="noreferrer">
          Fluent Emoji
        </a>{' '}
        by Microsoft, MIT licence.
      </p>
    </div>
  );
}

function PickedMark() {
  return (
    <span className="av-check">
      <Check size={14} strokeWidth={3} />
    </span>
  );
}
