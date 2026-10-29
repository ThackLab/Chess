// Avatars. Each is a single number, small enough to travel anywhere a name
// does (an invite, a live game, a Bluetooth advert):
//   0      the player's initials
//   1      their own photo (which travels separately: see state/people.ts and state/online.ts)
//   2 + i  AVATARS[i]
// AVATARS only ever grows at the end, so every number keeps its picture. The
// pictures are Microsoft's Fluent Emoji (MIT), in public/avatars.

export interface AvatarArt {
  id: string;
  name: string;
  /** The tile behind it: a gradient from one colour to the other. */
  bg: [string, string];
}

const A = (id: string, name: string, a: string, b: string): AvatarArt => ({ id, name, bg: [a, b] });

export const AVATARS: AvatarArt[] = [
  A('fox', 'Fox', '#ffb36b', '#ff7a3d'),
  A('panda', 'Panda', '#d9f2e3', '#8fd3b0'),
  A('lion', 'Lion', '#ffd36b', '#f59e2b'),
  A('tiger_face', 'Tiger', '#ffc46b', '#ff8a3d'),
  A('cat_face', 'Cat', '#ffe08a', '#ffb347'),
  A('dog_face', 'Dog', '#f6d7b0', '#d9a36b'),
  A('unicorn', 'Unicorn', '#f9c6ff', '#b79bff'),
  A('dragon_face', 'Dragon', '#8be08b', '#2f9e5a'),
  A('owl', 'Owl', '#c9b38b', '#7d6142'),
  A('penguin', 'Penguin', '#bfe6ff', '#5aaee8'),
  A('frog', 'Frog', '#c6f28b', '#6cc24a'),
  A('octopus', 'Octopus', '#ffb3c7', '#ff6f91'),
  A('shark', 'Shark', '#9fd8ff', '#3a8fd6'),
  A('t_rex', 'T. rex', '#b7e66b', '#4f9e3a'),
  A('wolf', 'Wolf', '#c9d2e0', '#6f7f99'),
  A('ninja', 'Ninja', '#5a5f73', '#20232e'),
  A('woman_mage', 'Mage', '#c3a6ff', '#6a4bd8'),
  A('man_vampire', 'Vampire', '#c9283b', '#3b0a1a'),
  A('woman_superhero', 'Superhero', '#ff6b6b', '#3a6bff'),
  A('man_zombie', 'Zombie', '#a6d68b', '#4a7d3a'),
  A('princess', 'Princess', '#ffd1e8', '#ff8fc4'),
  A('prince', 'Prince', '#ffe29a', '#d9a23b'),
  A('astronaut', 'Astronaut', '#4a5bd8', '#141a4a'),
  A('detective', 'Detective', '#d9c3a0', '#7a5f3d'),
  A('alien', 'Alien', '#b6f2a6', '#3fbf7a'),
  A('robot', 'Robot', '#b8d4e8', '#5f86a6'),
  A('ghost', 'Ghost', '#d4c8ff', '#7a6be0'),
  A('skull', 'Skull', '#4a4a52', '#141418'),
  A('goblin', 'Goblin', '#ff8a6b', '#b8322a'),
  A('alien_monster', 'Space invader', '#c58bff', '#5a2ac2'),
  A('clown_face', 'Clown', '#ffe36b', '#ff5f7a'),
  A('jack_o_lantern', 'Pumpkin', '#ffa94d', '#3b1f0a'),
  A('smiling_face_with_sunglasses', 'Cool', '#7ad3ff', '#2d7fe0'),
  A('nerd_face', 'Nerd', '#fff2a6', '#ffcf3d'),
  A('face_with_monocle', 'Monocle', '#e8dcc0', '#a68a5a'),
  A('cowboy_hat_face', 'Cowboy', '#f2c98b', '#b8743a'),
  A('exploding_head', 'Mind blown', '#ffb36b', '#e8413d'),
  A('partying_face', 'Party', '#a6f0ff', '#ff8fd8'),
  A('star_struck', 'Star-struck', '#fff08a', '#ffb800'),
  A('smiling_face_with_horns', 'Devil', '#c86bff', '#5a1a9e'),
  A('crown', 'Crown', '#ffe9a6', '#e0a62b'),
  A('trophy', 'Trophy', '#fff0b3', '#f2b705'),
  A('fire', 'Fire', '#ffb36b', '#e8302a'),
  A('high_voltage', 'Lightning', '#3a3a8a', '#12123a'),
  A('gem_stone', 'Gem', '#b3e6ff', '#4a8ff0'),
  A('rocket', 'Rocket', '#2a2f6b', '#0b0e2a'),
  A('chess_pawn', 'Pawn', '#eeeed2', '#769656'),
  A('brain', 'Brain', '#ffd1dc', '#ff8fab'),
];

export const PHOTO = 1;
const BASE = 2;

export const avatarCode = (i: number) => BASE + i;

export type ParsedAvatar = { kind: 'initials' } | { kind: 'photo' } | { kind: 'art'; art: AvatarArt; url: string };

/** The avatars app 1.5 drew (codes from 4096 up): each of its 16 styles gets the closest one here. */
const LEGACY = [
  'fire',
  'ninja',
  'gem_stone',
  'face_with_monocle',
  'robot',
  'high_voltage',
  'panda',
  'clown_face',
  'owl',
  'smiling_face_with_sunglasses',
  'unicorn',
  'star_struck',
  'partying_face',
  'goblin',
  'crown',
  'alien_monster',
];

const urlFor = (id: string) => (typeof document === 'undefined' ? `avatars/${id}.webp` : new URL(`avatars/${id}.webp`, document.baseURI).href);

export function parseAvatar(code: unknown): ParsedAvatar {
  if (typeof code !== 'number' || !Number.isInteger(code) || code < 0 || code > 0xffff) return { kind: 'initials' };
  if (code === PHOTO) return { kind: 'photo' };
  let art = code >= BASE ? AVATARS[code - BASE] : undefined;
  if (code >= 4096) art = AVATARS.find((a) => a.id === LEGACY[Math.floor((code - 4096) / 1024)]);
  return art ? { kind: 'art', art, url: urlFor(art.id) } : { kind: 'initials' };
}

/** A valid avatar number to send or keep, or undefined. */
export const cleanAvatar = (code: unknown): number | undefined =>
  typeof code === 'number' && Number.isInteger(code) && code >= 0 && code <= 0xffff ? code : undefined;

/** A photo as it travels: a small JPEG data URL, or undefined if it isn't one. */
export const cleanPhoto = (x: unknown): string | undefined =>
  typeof x === 'string' && x.length <= 16_000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(x) ? x : undefined;
