// Avatars. Each is a single number, small enough to travel anywhere a name
// does (an invite, a live game, a Bluetooth advert):
//   0                 the player's initials
//   4096 + p·1024 + v personality p (PERSONALITIES[p]), variant v (0–1023)
// Everything else is read as initials. The art is drawn on the device by
// DiceBear (src/lib/avatarArt.ts); nothing is downloaded.
// PERSONALITIES only ever grows at the end, so every number keeps its picture.

export type ArtStyle =
  | 'adventurer'
  | 'avataaars'
  | 'big-ears'
  | 'big-smile'
  | 'bottts'
  | 'croodles'
  | 'dylan'
  | 'fun-emoji'
  | 'lorelei'
  | 'micah'
  | 'miniavs'
  | 'notionists'
  | 'open-peeps'
  | 'personas'
  | 'pixel-art';

export type PersonalityIcon =
  | 'flame'
  | 'shield'
  | 'sparkles'
  | 'cap'
  | 'cpu'
  | 'zap'
  | 'leaf'
  | 'wand'
  | 'hourglass'
  | 'dice'
  | 'heart'
  | 'star'
  | 'shuffle'
  | 'ghost'
  | 'crown'
  | 'gamepad';

export interface Personality {
  id: string;
  name: string;
  /** Who they are at the board, in a line. */
  line: string;
  icon: PersonalityIcon;
  /** The accent for this type's chip and badge. */
  color: string;
  style: ArtStyle;
  /** DiceBear options that give the type its look (expressions, accessories...). */
  options: Record<string, unknown>;
  /** Background gradient colours. */
  bg: string[];
}

export const PERSONALITIES: Personality[] = [
  {
    id: 'berserker',
    name: 'The Berserker',
    line: 'Attacks first. Asks questions never.',
    icon: 'flame',
    color: '#ff5a36',
    style: 'avataaars',
    options: {
      eyebrows: ['angry', 'angryNatural', 'upDown'],
      eyes: ['squint', 'default', 'surprised'],
      mouth: ['screamOpen', 'grimace', 'serious'],
      accessories: ['eyepatch', 'sunglasses'],
      accessoriesProbability: 30,
      facialHair: ['beardMajestic', 'beardMedium', 'moustacheMagnum'],
      facialHairProbability: 40,
    },
    bg: ['ff4d4d', 'ff8c1a', 'c81d25', 'ffb703'],
  },
  {
    id: 'fortress',
    name: 'The Fortress',
    line: 'Castles early, trades nothing, waits for you to crack.',
    icon: 'shield',
    color: '#7f9cb8',
    style: 'micah',
    options: { mouth: ['frown', 'smirk', 'nervous'], eyebrows: ['down'], eyes: ['eyes', 'round', 'eyesShadow'], glassesProbability: 20 },
    bg: ['5b7c99', '8fa9c0', '3d5a73', 'b8c7d6'],
  },
  {
    id: 'gambiteer',
    name: 'The Gambiteer',
    line: 'Pawns are snacks. Sacrifices are a lifestyle.',
    icon: 'sparkles',
    color: '#ffb703',
    style: 'avataaars',
    options: {
      eyes: ['hearts', 'happy', 'winkWacky'],
      eyebrows: ['raisedExcited', 'raisedExcitedNatural'],
      mouth: ['smile', 'twinkle', 'tongue'],
      clothing: ['graphicShirt'],
      clothingGraphic: ['diamond', 'pizza', 'bat', 'skull'],
    },
    bg: ['ffd166', 'f78c6b', 'ef476f', 'ffe29a'],
  },
  {
    id: 'professor',
    name: 'The Professor',
    line: 'Has read every opening book. Twice. Footnotes too.',
    icon: 'cap',
    color: '#d9b46a',
    style: 'notionists',
    options: { glassesProbability: 100, gesture: ['point', 'pointLongArm', 'ok', 'hand'], gestureProbability: 60, beardProbability: 40 },
    bg: ['f1e3c8', 'e8d5b0', 'd9c39a', 'fff4dc'],
  },
  {
    id: 'engine',
    name: 'The Engine',
    line: 'Calculates thirty moves deep. Feels nothing.',
    icon: 'cpu',
    color: '#22b8e6',
    style: 'bottts',
    options: {
      eyes: ['robocop', 'sensor', 'glow', 'frame1', 'frame2', 'eva', 'shade01'],
      top: ['radar', 'antenna', 'lights', 'glowingBulb01', 'glowingBulb02'],
      topProbability: 100,
      texture: ['circuits', 'dots'],
      textureProbability: 50,
    },
    bg: ['00b4d8', '0077b6', '023e8a', '48cae4'],
  },
  {
    id: 'blitz',
    name: 'The Blitz Demon',
    line: 'Premoves everything. Flags you with a tenth of a second left.',
    icon: 'zap',
    color: '#ff2d8a',
    style: 'fun-emoji',
    options: { eyes: ['shades', 'stars', 'pissed', 'wink2'], mouth: ['shout', 'tongueOut', 'smileTeeth', 'drip', 'smileLol'] },
    bg: ['ff006e', '8338ec', '3a86ff', 'fb5607'],
  },
  {
    id: 'zen',
    name: 'The Zen Master',
    line: 'Never panics. Breathes slowly with one second on the clock.',
    icon: 'leaf',
    color: '#52b788',
    style: 'dylan',
    options: { mood: ['neutral', 'hopeful', 'happy'] },
    bg: ['95d5b2', 'b7e4c7', '74c69d', 'd8f3dc'],
  },
  {
    id: 'trickster',
    name: 'The Trickster',
    line: 'Every move is a trap. Some of them even work.',
    icon: 'wand',
    color: '#b46bff',
    style: 'big-smile',
    options: {
      eyes: ['winking', 'confused', 'cheery', 'starstruck'],
      mouth: ['awkwardSmile', 'kawaii', 'gapSmile', 'teethSmile'],
      accessories: ['catEars', 'clownNose', 'sunglasses', 'sailormoonCrown', 'mustache'],
      accessoriesProbability: 80,
    },
    bg: ['9b5de5', 'f15bb5', '00bbf9', '00f5d4'],
  },
  {
    id: 'grinder',
    name: 'The Grinder',
    line: 'Will play 120 moves to win a pawn ending, and enjoy every one.',
    icon: 'hourglass',
    color: '#b08968',
    style: 'open-peeps',
    options: { face: ['driven', 'serious', 'solemn', 'tired', 'calm', 'suspicious'], facialHairProbability: 50, maskProbability: 0 },
    bg: ['a68a64', '7f5539', 'b08968', 'ddb892'],
  },
  {
    id: 'hustler',
    name: 'The Park Hustler',
    line: 'Trash talk, bullet chess and a pocket full of cash.',
    icon: 'dice',
    color: '#2ec4b6',
    style: 'personas',
    options: {
      eyes: ['sunglasses', 'wink', 'happy'],
      mouth: ['smirk', 'bigSmile', 'smile'],
      hair: ['cap', 'beanie', 'fade', 'curlyHighTop', 'mohawk', 'buzzcut'],
      facialHairProbability: 50,
    },
    bg: ['2ec4b6', 'ff9f1c', 'cbf3f0', 'ffbf69'],
  },
  {
    id: 'romantic',
    name: 'The Romantic',
    line: 'Plays like it’s 1851: open lines, wild sacrifices, pure style.',
    icon: 'heart',
    color: '#ff8fb8',
    style: 'adventurer',
    options: { features: ['blush', 'mustache', 'birthmark'], featuresProbability: 60, earringsProbability: 30 },
    bg: ['ffafcc', 'ffc8dd', 'cdb4db', 'bde0fe'],
  },
  {
    id: 'prodigy',
    name: 'The Prodigy',
    line: 'Eleven years old. Already better than you.',
    icon: 'star',
    color: '#4cc3ff',
    style: 'miniavs',
    options: { eyes: ['confident', 'happy'], mouth: ['default', 'missingTooth'], mustacheProbability: 0, glassesProbability: 30 },
    bg: ['8ecae6', '219ebc', 'ffb703', 'a2d2ff'],
  },
  {
    id: 'wildcard',
    name: 'The Wildcard',
    line: 'Nobody knows what they’ll play next. Including them.',
    icon: 'shuffle',
    color: '#ffbe0b',
    style: 'croodles',
    options: {},
    bg: ['ffbe0b', 'fb5607', 'ff006e', '8338ec', '3a86ff'],
  },
  {
    id: 'gremlin',
    name: 'The Gremlin',
    line: 'Lives in your time trouble. Feeds on blunders.',
    icon: 'ghost',
    color: '#57cc99',
    style: 'big-ears',
    options: {},
    bg: ['80ed99', '57cc99', '38a3a5', 'c7f9cc'],
  },
  {
    id: 'classicist',
    name: 'The Classicist',
    line: 'Opens 1.e4, says “good game”, means it.',
    icon: 'crown',
    color: '#d4a373',
    style: 'lorelei',
    options: { glassesProbability: 30, hairAccessoriesProbability: 20, frecklesProbability: 20 },
    bg: ['e9edc9', 'fefae0', 'faedcd', 'd4a373'],
  },
  {
    id: 'arcade',
    name: 'The Arcade Boss',
    line: 'Learned chess from a cartridge. Plays like the final boss.',
    icon: 'gamepad',
    color: '#c77dff',
    style: 'pixel-art',
    options: { hatProbability: 40, glassesProbability: 40, accessoriesProbability: 30 },
    bg: ['3a0ca3', '7209b7', 'f72585', '4cc9f0'],
  },
];

const ART_BASE = 4096;
export const VARIANTS = 1024;

export const avatarCode = (personality: number, variant: number) => ART_BASE + personality * VARIANTS + (variant % VARIANTS);

export type ParsedAvatar = { kind: 'initials' } | { kind: 'art'; p: number; v: number; personality: Personality };

export function parseAvatar(code: unknown): ParsedAvatar {
  if (typeof code !== 'number' || !Number.isInteger(code) || code < ART_BASE || code > 0xffff) return { kind: 'initials' };
  const p = Math.floor((code - ART_BASE) / VARIANTS);
  const personality = PERSONALITIES[p];
  return personality ? { kind: 'art', p, v: (code - ART_BASE) % VARIANTS, personality } : { kind: 'initials' };
}

/** A valid avatar number to send or keep, or undefined. */
export const cleanAvatar = (code: unknown): number | undefined =>
  typeof code === 'number' && Number.isInteger(code) && code >= 0 && code <= 0xffff ? code : undefined;

export const personalityOf = (code: unknown): Personality | null => {
  const a = parseAvatar(code);
  return a.kind === 'art' ? a.personality : null;
};
