// A player's avatar (see lib/avatars.ts). The caller's class sizes the box; the
// picture fills it, or the initials sit in it.
import { useState } from 'react';
import { botArtUrl, monogram, type BotProfile } from '../lib/bots/bots';
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

/** A bot's portrait on a tile of its colour, for a box someone else draws. */
export function BotFace({ bot }: { bot: BotProfile }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <>{monogram(bot.name)}</>;
  return (
    <span className="av-fill bot-fill" style={{ background: `linear-gradient(145deg, ${lighten(bot.tint, 0.45)}, ${bot.tint})` }}>
      <img className="av-art" src={botArtUrl(bot)} alt="" draggable={false} loading="lazy" onError={() => setBroken(true)} />
    </span>
  );
}

/** `#rrggbb` mixed toward white by `t` (0..1). */
function lighten(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) + (255 - ((n >> shift) & 255)) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

export function Avatar({ av, name, photo, className = 'fc-avatar small' }: { av?: number; name: string; photo?: string; className?: string }) {
  return (
    <span className={`${className} av-box`}>
      <AvatarFace av={av} name={name} photo={photo} />
    </span>
  );
}
