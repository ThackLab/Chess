// A player's avatar (see lib/avatars.ts). The caller's class sizes the box; the
// art fills it, or the initials sit in it.
import { useEffect, useState } from 'react';
import {
  Cpu,
  Crown,
  Dices,
  Flame,
  Gamepad2,
  Ghost,
  GraduationCap,
  Heart,
  Hourglass,
  Leaf,
  Shield,
  Shuffle,
  Sparkles,
  Star,
  WandSparkles,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { monogram } from '../lib/bots/bots';
import { parseAvatar, type Personality, type PersonalityIcon } from '../lib/avatars';

type Art = typeof import('../lib/avatarArt');
let art: Art | null = null;
let loading: Promise<Art> | null = null;
const loadArt = () =>
  (loading ??= import('../lib/avatarArt').then((m) => {
    art = m;
    return m;
  }));

/** The avatar's image URL once its art has loaded; null for initials. */
export function useAvatarUri(code: number | undefined): string | null {
  const isArt = parseAvatar(code).kind === 'art';
  const [uri, setUri] = useState<string | null>(() => (isArt && art ? art.artUri(code!) : null));
  useEffect(() => {
    if (!isArt) {
      setUri(null);
      return;
    }
    if (art) {
      setUri(art.artUri(code!));
      return;
    }
    let live = true;
    void loadArt().then((m) => live && setUri(m.artUri(code!)));
    return () => {
      live = false;
    };
  }, [code, isArt]);
  return uri;
}

/** Just the picture (or initials), for a box someone else draws. */
export function AvatarFace({ av, name }: { av?: number; name: string }) {
  const uri = useAvatarUri(av);
  if (uri) return <img className="av-img" src={uri} alt="" draggable={false} />;
  return <>{monogram(name || '?')}</>;
}

export function Avatar({ av, name, className = 'fc-avatar small' }: { av?: number; name: string; className?: string }) {
  return (
    <span className={`${className} av-box`}>
      <AvatarFace av={av} name={name} />
    </span>
  );
}

const ICONS: Record<PersonalityIcon, LucideIcon> = {
  flame: Flame,
  shield: Shield,
  sparkles: Sparkles,
  cap: GraduationCap,
  cpu: Cpu,
  zap: Zap,
  leaf: Leaf,
  wand: WandSparkles,
  hourglass: Hourglass,
  dice: Dices,
  heart: Heart,
  star: Star,
  shuffle: Shuffle,
  ghost: Ghost,
  crown: Crown,
  gamepad: Gamepad2,
};

export function PersonalityIconFor({ p, size = 16 }: { p: Personality; size?: number }) {
  const Icon = ICONS[p.icon];
  return <Icon size={size} style={{ color: p.color }} aria-hidden />;
}

/** "⚡ The Blitz Demon", in the type's colour. */
export function PersonalityTag({ p }: { p: Personality }) {
  return (
    <span className="ptag" style={{ color: p.color }}>
      <PersonalityIconFor p={p} size={14} /> {p.name}
    </span>
  );
}
