// Draws avatars with DiceBear (MIT), on the device. Loaded only when an avatar
// is on screen, as its own chunk. The art styles' authors and licences are in
// STYLE_CREDITS and the README.
import { createAvatar, type Style } from '@dicebear/core';
import * as adventurer from '@dicebear/adventurer';
import * as avataaars from '@dicebear/avataaars';
import * as bigEars from '@dicebear/big-ears';
import * as bigSmile from '@dicebear/big-smile';
import * as bottts from '@dicebear/bottts';
import * as croodles from '@dicebear/croodles';
import * as dylan from '@dicebear/dylan';
import * as funEmoji from '@dicebear/fun-emoji';
import * as lorelei from '@dicebear/lorelei';
import * as micah from '@dicebear/micah';
import * as miniavs from '@dicebear/miniavs';
import * as notionists from '@dicebear/notionists';
import * as openPeeps from '@dicebear/open-peeps';
import * as personas from '@dicebear/personas';
import * as pixelArt from '@dicebear/pixel-art';
import { parseAvatar, type ArtStyle } from './avatars';

type AnyStyle = Style<Record<string, unknown>>;

const STYLES: Record<ArtStyle, AnyStyle> = {
  adventurer: adventurer as unknown as AnyStyle,
  avataaars: avataaars as unknown as AnyStyle,
  'big-ears': bigEars as unknown as AnyStyle,
  'big-smile': bigSmile as unknown as AnyStyle,
  bottts: bottts as unknown as AnyStyle,
  croodles: croodles as unknown as AnyStyle,
  dylan: dylan as unknown as AnyStyle,
  'fun-emoji': funEmoji as unknown as AnyStyle,
  lorelei: lorelei as unknown as AnyStyle,
  micah: micah as unknown as AnyStyle,
  miniavs: miniavs as unknown as AnyStyle,
  notionists: notionists as unknown as AnyStyle,
  'open-peeps': openPeeps as unknown as AnyStyle,
  personas: personas as unknown as AnyStyle,
  'pixel-art': pixelArt as unknown as AnyStyle,
};

const cache = new Map<number, string>();

/** The avatar as an image URL, or null for initials. */
export function artUri(code: number): string | null {
  const hit = cache.get(code);
  if (hit) return hit;
  const a = parseAvatar(code);
  if (a.kind !== 'art') return null;
  const p = a.personality;
  const uri = createAvatar(STYLES[p.style], {
    ...p.options,
    seed: `${p.id}-${a.v}`,
    backgroundColor: p.bg,
    backgroundType: ['gradientLinear'],
    backgroundRotation: [0, 360],
    radius: 0,
  }).toDataUri();
  cache.set(code, uri);
  return uri;
}

export interface Credit {
  title: string;
  creator: string;
  license: string;
  licenseUrl?: string;
  source?: string;
}

/** Who drew each style, under which licence. */
export function styleCredit(style: ArtStyle): Credit {
  const m = (STYLES[style] as { meta?: { title?: string; creator?: string; source?: string; license?: { name?: string; url?: string } } }).meta ?? {};
  return { title: m.title ?? style, creator: m.creator ?? '', license: m.license?.name ?? '', licenseUrl: m.license?.url, source: m.source };
}
