// A player's avatar (see lib/avatars.ts). The caller's class sizes the box; the
// picture fills it, or the initials sit in it.
import { useState } from 'react';
import { monogram } from '../lib/bots/bots';
import { parseAvatar } from '../lib/avatars';

/** Just the picture (or initials), for a box someone else draws. */
export function AvatarFace({ av, name, photo }: { av?: number; name: string; photo?: string }) {
  const a = parseAvatar(av);
  const [broken, setBroken] = useState(false);
  if (a.kind === 'photo' && photo) return <img className="av-img" src={photo} alt="" draggable={false} />;
  if (a.kind === 'art' && !broken)
    return (
      <span className="av-fill" style={{ background: `linear-gradient(145deg, ${a.art.bg[0]}, ${a.art.bg[1]})` }}>
        <img className="av-art" src={a.url} alt="" draggable={false} loading="lazy" onError={() => setBroken(true)} />
      </span>
    );
  return <>{monogram(name || '?')}</>;
}

export function Avatar({ av, name, photo, className = 'fc-avatar small' }: { av?: number; name: string; photo?: string; className?: string }) {
  return (
    <span className={`${className} av-box`}>
      <AvatarFace av={av} name={name} photo={photo} />
    </span>
  );
}
