// Themes, boards and piece sets. A theme is a complete look: colours (in
// src/styles/themes.css, keyed by data-theme), a headline style, the fonts it
// needs, and the board and pieces it comes with. The board and pieces can be
// changed independently; "auto" follows the theme.
import interUrl from '@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2?url';
import serifUrl from '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url';
import serifItalicUrl from '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2?url';
import frauncesUrl from '@fontsource-variable/fraunces/files/fraunces-latin-soft-normal.woff2?url';
import frauncesItalicUrl from '@fontsource-variable/fraunces/files/fraunces-latin-soft-italic.woff2?url';
import newsreaderUrl from '@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2?url';
import newsreaderItalicUrl from '@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2?url';
import monoUrl from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url';
import atkinsonUrl from '@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2?url';
import atkinsonItalicUrl from '@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-italic.woff2?url';

export type FontId = 'inter' | 'serif' | 'fraunces' | 'newsreader' | 'mono' | 'atkinson';

export type BoardId =
  | 'mono'
  | 'green'
  | 'brown'
  | 'blue'
  | 'purple'
  | 'grey'
  | 'ice'
  | 'slate'
  | 'paper'
  | 'ocean'
  | 'royal'
  | 'rose'
  | 'contrast'
  | 'clear'
  | 'gothic'
  | 'blossom'
  | 'onyx'
  | 'aurora'
  | 'neon'
  | 'sea'
  | 'moss'
  | 'dune'
  | 'icysea'
  | 'orange'
  | 'red'
  | 'tan'
  | 'sand'
  | 'bubblegum'
  | 'light'
  | 'walnut'
  | 'burled'
  | 'marble'
  | 'metal'
  | 'stone'
  | 'glass'
  | 'neonboard'
  | 'newspaper'
  | 'pixel'
  | 'tournament';

export type PieceSetId =
  'cburnett' | 'merida' | 'chessnut' | 'spatial' | 'celtic' | 'fantasy' | 'papercut' | 'rhosgfx' | 'kiwen-suwi' | 'totoy' | 'mpchess' | 'firi';

export type ThemeId =
  'club' | 'gothic' | 'blossom' | 'noir' | 'aurora' | 'synthwave' | 'deepsea' | 'forest' | 'desert' | 'paper' | 'contrast' | 'clear';

/** How headlines are set: an editorial serif, tight heavy sans, or plain sans. */
export type DisplayStyle = 'serif' | 'tight' | 'plain';

export interface Theme {
  id: ThemeId;
  name: string;
  blurb: string;
  display: DisplayStyle;
  fonts: FontId[];
  board: BoardId;
  pieces: PieceSetId;
  /** Light themes get light browser chrome and form controls. */
  light?: boolean;
  /** Chunky chess.com-style controls (buttons with a lip, bold type), or the plain ones. */
  ui: 'chunky' | 'classic';
  /** A picture behind everything, with the app's cards over it like frosted glass (src/styles/scenes.css). */
  scene?: boolean;
  /** Shown in the theme list: background, text and accent. */
  swatch: [string, string, string];
  group: 'Scenes' | 'Classic' | 'Accessible';
}

const scene = (t: Omit<Theme, 'ui' | 'scene' | 'display' | 'fonts' | 'group'>): Theme => ({
  ...t,
  ui: 'chunky',
  scene: true,
  display: 'plain',
  fonts: [],
  group: 'Scenes',
});

export const THEMES: Theme[] = [
  {
    id: 'club',
    name: 'Club',
    blurb: 'The classic club look: green board, dark greys, chunky green buttons.',
    display: 'plain',
    fonts: [],
    board: 'green',
    pieces: 'merida',
    ui: 'chunky',
    swatch: ['#302e2b', '#ffffff', '#81b64c'],
    group: 'Classic',
  },
  scene({
    id: 'gothic',
    name: 'Gothic Storm',
    blurb: 'Lightning strikes moonlit peaks, rain falls on the lake. A rendered photo.',
    board: 'gothic',
    pieces: 'fantasy',
    swatch: ['#120c26', '#f4efff', '#9d6bff'],
  }),
  scene({
    id: 'blossom',
    name: 'Blossom',
    blurb: 'Candy pink, cherry blossom and little hearts. Sweet and bold.',
    board: 'blossom',
    pieces: 'papercut',
    light: true,
    swatch: ['#ffd9e8', '#3d1230', '#ff4f9a'],
  }),
  scene({
    id: 'aurora',
    name: 'Aurora',
    blurb: 'The northern lights over snowy peaks.',
    board: 'aurora',
    pieces: 'chessnut',
    swatch: ['#04121a', '#eafff6', '#2fd18b'],
  }),
  scene({
    id: 'synthwave',
    name: 'Synthwave',
    blurb: 'A neon sunset over a retro grid.',
    board: 'neon',
    pieces: 'spatial',
    swatch: ['#160028', '#fdeaff', '#ff3d9a'],
  }),
  scene({
    id: 'deepsea',
    name: 'Deep Sea',
    blurb: 'Sunlight through the water, fish and rising bubbles.',
    board: 'sea',
    pieces: 'cburnett',
    swatch: ['#03182b', '#e6f6ff', '#23b5f0'],
  }),
  scene({
    id: 'forest',
    name: 'Enchanted Forest',
    blurb: 'Moonlit pines and fireflies.',
    board: 'moss',
    pieces: 'celtic',
    swatch: ['#081a10', '#effbe6', '#7cc142'],
  }),
  scene({
    id: 'desert',
    name: 'Desert Dusk',
    blurb: 'Sunset over the dunes, a caravan on the horizon.',
    board: 'dune',
    pieces: 'rhosgfx',
    swatch: ['#2a1230', '#fff1e0', '#ff9d3c'],
  }),
  {
    id: 'noir',
    name: 'Noir',
    blurb: 'Minimal black. No colour, no clutter, editorial headlines.',
    display: 'serif',
    fonts: ['serif'],
    board: 'onyx',
    pieces: 'cburnett',
    ui: 'classic',
    swatch: ['#000000', '#f5f5f5', '#ffffff'],
    group: 'Classic',
  },
  {
    id: 'paper',
    name: 'Paper',
    blurb: 'Ink on ivory, like a chess book.',
    display: 'serif',
    fonts: ['newsreader'],
    board: 'paper',
    pieces: 'mpchess',
    light: true,
    ui: 'classic',
    swatch: ['#f5f0e6', '#1c1a17', '#1c1a17'],
    group: 'Classic',
  },
  {
    id: 'contrast',
    name: 'High contrast',
    blurb: 'Black, white and yellow. Nothing faint.',
    display: 'plain',
    fonts: [],
    board: 'contrast',
    pieces: 'cburnett',
    ui: 'classic',
    swatch: ['#000000', '#ffffff', '#ffd60a'],
    group: 'Accessible',
  },
  {
    id: 'clear',
    name: 'Visual aid',
    blurb: 'Larger, clearer type, colour-blind safe colours and named squares.',
    display: 'plain',
    fonts: ['atkinson'],
    board: 'clear',
    pieces: 'kiwen-suwi',
    ui: 'classic',
    swatch: ['#101418', '#f5f7fa', '#ffcc00'],
    group: 'Accessible',
  },
];

/** Themes from before 1.6, and the one that replaced each. */
const RENAMED: Record<string, ThemeId> = { hearth: 'desert', graphite: 'noir', walnut: 'club', ocean: 'deepsea', royal: 'gothic', rose: 'blossom' };

/** Pictures of the textured boards (drawn by scripts/backgrounds/boards.py). */
const BOARD_PICTURES = import.meta.glob('../assets/boards/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const picture = (id: string) => BOARD_PICTURES[`../assets/boards/${id}.webp`];

export interface BoardDef {
  id: BoardId;
  name: string;
  /** Square colours (for a textured board, roughly its average, used for small previews). */
  light: string;
  dark: string;
  /** A picture of the whole board, for the textured ones. */
  texture?: string;
}

const B = (id: BoardId, name: string, light: string, dark: string, textured = false): BoardDef => ({
  id,
  name,
  light,
  dark,
  ...(textured ? { texture: picture(id) } : {}),
});

export const BOARDS: BoardDef[] = [
  B('green', 'Green', '#eeeed2', '#769656'),
  B('brown', 'Brown', '#f0d9b5', '#b58863'),
  B('icysea', 'Icy Sea', '#d6e4ea', '#7c9eb2', true),
  B('blue', 'Blue', '#eae9d2', '#4b7399'),
  B('purple', 'Purple', '#efefef', '#8877b7'),
  B('orange', 'Orange', '#fbe3b4', '#d18b2c'),
  B('red', 'Red', '#f5dbc3', '#bb5746'),
  B('tan', 'Tan', '#ecd9b9', '#c09a6b'),
  B('sand', 'Sand', '#f3e4c8', '#d6b68a'),
  B('bubblegum', 'Bubblegum', '#fefefe', '#f4b6c8'),
  B('light', 'Light', '#e2e2e2', '#a9a9a9'),
  B('walnut', 'Walnut', '#c49a6c', '#5a3a22', true),
  B('burled', 'Burled Wood', '#d2a878', '#6e4426', true),
  B('marble', 'Marble', '#e6e4e0', '#5d6066', true),
  B('metal', 'Metal', '#bfc0c4', '#5e6066', true),
  B('stone', 'Stone', '#b8b2a8', '#6c6c6c', true),
  B('glass', 'Glass', '#9db3c8', '#2a3a52', true),
  B('neonboard', 'Neon', '#4a2a6a', '#121030', true),
  B('newspaper', 'Newspaper', '#e6e4de', '#9a9894', true),
  B('pixel', '8-Bit', '#e0edb3', '#6b9e47', true),
  B('tournament', 'Tournament', '#eeeee6', '#326a4b', true),
  B('gothic', 'Gothic', '#cdc4e0', '#6b5a8e'),
  B('blossom', 'Blossom', '#fff0f6', '#f39ac1'),
  B('onyx', 'Onyx', '#d9d9d9', '#2e2e2e'),
  B('aurora', 'Aurora', '#d6efe6', '#3d8a80'),
  B('neon', 'Violet', '#f3d9ff', '#9150d6'),
  B('sea', 'Sea', '#d4ecf7', '#2f77a3'),
  B('moss', 'Moss', '#e6ebd0', '#5f8048'),
  B('dune', 'Dune', '#f6e2c0', '#c48451'),
  B('mono', 'Mono', '#e6e6e6', '#9e9e9e'),
  B('slate', 'Slate', '#dfe3e8', '#8b95a1'),
  B('ocean', 'Ice', '#e3eef6', '#7096b8'),
  B('ice', 'Sky', '#dbe9f4', '#7ca6c4'),
  B('royal', 'Royal', '#ece6f5', '#8a75b5'),
  B('rose', 'Rose', '#fbe4ea', '#d98aa0'),
  B('paper', 'Paper', '#f7f3ea', '#c2b59c'),
  B('grey', 'Grey', '#dcdcdc', '#8a8a8a'),
  B('contrast', 'Contrast', '#ffffff', '#7a7a7a'),
  B('clear', 'Clear', '#e8edf2', '#7d8fa3'),
];

/** Boards added in 1.8, whose CSS is made here (the older ones are in the stylesheets). */
const GENERATED_BOARDS = new Set<BoardId>(['orange', 'red', 'tan', 'sand', 'bubblegum', 'light']);

/** CSS for the newer boards' squares (colours, or the picture), keyed by .theme-<id>. */
export function boardCss(): string {
  return BOARDS.filter((b) => b.texture || GENERATED_BOARDS.has(b.id))
    .map((b) =>
      b.texture
        ? `.theme-${b.id} cg-board { background: url('${b.texture}') 0 0 / 100% 100%; }`
        : `.theme-${b.id} cg-board { background: conic-gradient(${b.dark} 0 25%, ${b.light} 0 50%, ${b.dark} 0 75%, ${b.light} 0) 0 0 / 25% 25%; }`,
    )
    .join('\n');
}

/**
 * Backgrounds: a picture behind the whole app, chosen apart from the board and
 * pieces. The 3D ones are rendered with Blender (scripts/backgrounds/*.py), the
 * rest drawn by scripts/backgrounds/flat.py. Each has a picture for tall
 * screens and one for wide ones; the CSS is in src/styles/backgrounds.css.
 */
export type BackgroundId =
  | 'storm'
  | 'glassdesert'
  | 'ebony'
  | 'woodset'
  | 'space'
  | 'ocean'
  | 'glasshall'
  | 'bubblegum'
  | 'metal'
  | 'sky'
  | 'pixel'
  | 'light'
  | 'slate'
  | 'blossom'
  | 'aurora'
  | 'synthwave'
  | 'deepsea'
  | 'forest'
  | 'desert';

/** 'auto' is the theme's own background (none for a plain theme). */
export type BackgroundChoice = BackgroundId | 'auto' | 'none';

const BG_THUMBS = import.meta.glob('../assets/backgrounds/*-thumb.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const SCENE_PICTURES = import.meta.glob('../assets/scenes/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const thumb = (id: string) => BG_THUMBS[`../assets/backgrounds/${id}-thumb.webp`];
const scenePic = (file: string) => SCENE_PICTURES[`../assets/scenes/${file}`];

export const BACKGROUNDS = (
  [
    { id: 'glassdesert', name: 'Glass Desert', thumb: thumb('glassdesert') },
    { id: 'storm', name: 'Gothic', thumb: thumb('storm') ?? scenePic('storm-portrait.webp') },
    { id: 'glasshall', name: 'Glass', thumb: thumb('glasshall') },
    { id: 'ebony', name: 'Real 3D', thumb: thumb('ebony') },
    { id: 'woodset', name: 'Wood', thumb: thumb('woodset') },
    { id: 'space', name: 'Space', thumb: thumb('space') },
    { id: 'ocean', name: 'Ocean', thumb: thumb('ocean') },
    { id: 'sky', name: 'Sky', thumb: thumb('sky') },
    { id: 'bubblegum', name: 'Bubblegum', thumb: thumb('bubblegum') },
    { id: 'metal', name: 'Metal', thumb: thumb('metal') },
    { id: 'pixel', name: '8-Bit', thumb: thumb('pixel') },
    { id: 'slate', name: 'Slate', thumb: thumb('slate') },
    { id: 'light', name: 'Light', thumb: thumb('light') },
    { id: 'blossom', name: 'Blossom', thumb: scenePic('blossom.svg') },
    { id: 'aurora', name: 'Aurora', thumb: scenePic('aurora.svg') },
    { id: 'synthwave', name: 'Synthwave', thumb: scenePic('synthwave.svg') },
    { id: 'deepsea', name: 'Deep Sea', thumb: scenePic('deepsea.svg') },
    { id: 'forest', name: 'Forest', thumb: scenePic('forest.svg') },
    { id: 'desert', name: 'Desert', thumb: scenePic('desert.svg') },
  ] as { id: BackgroundId; name: string; thumb: string }[]
)
  // A background shows once its pictures are in src/assets/backgrounds.
  .filter((b) => !!b.thumb);

/** The background a scene theme comes with, as a background id. */
export function themeBackground(id: ThemeId): BackgroundId | 'none' {
  if (id === 'gothic') return 'storm';
  return BACKGROUNDS.some((b) => b.id === id) ? (id as BackgroundId) : 'none';
}

/** Themes that can sit over any background (the rest keep their own plain one). */
export const takesBackground = (t: Theme) => !!t.scene || t.id === 'club' || t.id === 'noir';

/** The background in use: a picture's id, 'none', or null for the theme's own. */
export function backgroundOf(s: Pick<AppearanceSettings, 'theme' | 'background'>): BackgroundId | 'none' | null {
  const t = themeOf(s.theme);
  if (!takesBackground(t)) return 'none';
  if (!s.background || s.background === 'auto') return t.scene ? null : 'none';
  return s.background;
}

export const PIECE_SETS: { id: PieceSetId; name: string; credit: string }[] = [
  { id: 'cburnett', name: 'Classic', credit: 'Colin M.L. Burnett, GPLv2+' },
  { id: 'merida', name: 'Tournament', credit: 'Armando Hernandez Marroquin, GPLv2+' },
  { id: 'chessnut', name: 'Modern', credit: 'Alexis Luengas, Apache 2.0' },
  { id: 'spatial', name: 'Sculpted', credit: 'Maurizio Monge, MIT' },
  { id: 'celtic', name: 'Celtic', credit: 'Maurizio Monge, MIT' },
  { id: 'fantasy', name: 'Fantasy', credit: 'Maurizio Monge, MIT' },
  { id: 'papercut', name: 'Papercut', credit: 'Nikolay Anzarov, CC BY 4.0' },
  { id: 'firi', name: 'Gilded', credit: 'James Faure, CC BY 4.0' },
  { id: 'rhosgfx', name: 'Terracotta', credit: 'RhosGFX, CC0' },
  { id: 'kiwen-suwi', name: 'Bold', credit: 'neverRare, CC BY 4.0' },
  { id: 'totoy', name: 'Totoy', credit: 'Kosal Sen, CC BY 4.0' },
  { id: 'mpchess', name: 'Print', credit: 'Maxime Chupin, GPLv3+' },
];

export const themeOf = (id: string): Theme => THEMES.find((t) => t.id === (RENAMED[id] ?? id)) ?? THEMES[0];

/** A theme id that exists now (themes from before 1.6 map to their replacements). */
export const currentThemeId = (id: string): ThemeId => themeOf(id).id;

const FONT_FILES: Record<FontId, { family: string; normal: string; italic?: string; weight: string }> = {
  inter: { family: 'Inter', normal: interUrl, weight: '100 900' },
  serif: { family: 'Instrument Serif', normal: serifUrl, italic: serifItalicUrl, weight: '400' },
  fraunces: { family: 'Fraunces', normal: frauncesUrl, italic: frauncesItalicUrl, weight: '100 900' },
  newsreader: { family: 'Newsreader', normal: newsreaderUrl, italic: newsreaderItalicUrl, weight: '200 800' },
  mono: { family: 'JetBrains Mono', normal: monoUrl, weight: '100 800' },
  atkinson: { family: 'Atkinson Hyperlegible Next', normal: atkinsonUrl, italic: atkinsonItalicUrl, weight: '200 800' },
};

const loaded = new Set<FontId>();

/** Loads fonts from the bundle (no network needed, including in the APK). */
export function loadFonts(ids: FontId[]) {
  if (typeof FontFace === 'undefined') return;
  for (const id of ids) {
    if (loaded.has(id)) continue;
    loaded.add(id);
    const f = FONT_FILES[id];
    const faces = [new FontFace(f.family, `url(${f.normal}) format('woff2')`, { weight: f.weight, display: 'swap' })];
    if (f.italic) faces.push(new FontFace(f.family, `url(${f.italic}) format('woff2')`, { weight: f.weight, style: 'italic', display: 'swap' }));
    for (const face of faces)
      face
        .load()
        .then((ff) => document.fonts.add(ff))
        .catch(() => undefined);
  }
}

/** Every theme's fonts, for the theme previews. */
export const loadAllFonts = () => loadFonts(Object.keys(FONT_FILES) as FontId[]);

const ROLES = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' } as const;

/**
 * CSS for every piece set: board pieces under [data-pieces] and the small
 * figurines used in move notation (.fig-wN etc). The images load only when used.
 */
function pieceCss(): string {
  const base = new URL('pieces/', document.baseURI).href;
  const out: string[] = [];
  for (const { id } of PIECE_SETS)
    for (const c of ['w', 'b'] as const)
      for (const [letter, role] of Object.entries(ROLES)) {
        const url = `url('${base}${id}/${c}${letter}.svg')`;
        // Classic board pieces are bundled, so the default never waits for a download; only its figurines load here.
        const board = id === 'cburnett' ? '' : `[data-pieces='${id}'] piece.${role}.${c === 'w' ? 'white' : 'black'}, `;
        out.push(`${board}[data-pieces='${id}'] .fig-${c}${letter} { background-image: ${url}; }`);
      }
  return out.join('\n');
}

let pieceStyle: HTMLStyleElement | null = null;

export interface AppearanceSettings {
  theme: ThemeId;
  background?: BackgroundChoice;
  boardTheme: BoardId | 'auto';
  pieceSet: PieceSetId | 'auto';
  textSize: 'm' | 'l' | 'xl';
  colorblind: boolean;
  squareNames: boolean;
  reduceMotion: boolean;
}

export const resolveBoard = (s: Pick<AppearanceSettings, 'theme' | 'boardTheme'>): BoardId =>
  s.boardTheme === 'auto' ? themeOf(s.theme).board : s.boardTheme;
export const resolvePieces = (s: Pick<AppearanceSettings, 'theme' | 'pieceSet'>): PieceSetId =>
  s.pieceSet === 'auto' ? themeOf(s.theme).pieces : s.pieceSet;

/** Applies a theme and the accessibility options to the whole app. */
export function applyAppearance(s: AppearanceSettings) {
  const t = themeOf(s.theme);
  const root = document.documentElement;
  root.dataset.theme = t.id;
  root.dataset.display = t.display;
  root.dataset.ui = t.ui;
  const bg = backgroundOf(s);
  // Over a picture the app's cards turn to frosted glass; plain themes get glass colours for it.
  root.toggleAttribute('data-scene', !!t.scene || (!!bg && bg !== 'none'));
  if (bg) root.dataset.bg = bg;
  else delete root.dataset.bg;
  if (!t.scene && bg && bg !== 'none') root.dataset.glass = 'dark';
  else delete root.dataset.glass;
  root.dataset.pieces = resolvePieces(s);
  root.dataset.text = s.textSize;
  root.toggleAttribute('data-colorblind', s.colorblind || t.id === 'clear');
  root.toggleAttribute('data-reduce-motion', s.reduceMotion);
  root.style.colorScheme = t.light ? 'light' : 'dark';
  loadFonts(['inter', 'mono', ...t.fonts]);
  if (!pieceStyle) {
    pieceStyle = document.createElement('style');
    pieceStyle.id = 'piece-sets';
    pieceStyle.textContent = `${pieceCss()}\n${boardCss()}`;
    document.head.appendChild(pieceStyle);
  }
  const bar = getComputedStyle(root).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar || t.swatch[0]);
}
