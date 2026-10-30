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
  | 'dune';

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

export const BOARDS: { id: BoardId; name: string; light: string; dark: string }[] = [
  { id: 'green', name: 'Green', light: '#eeeed2', dark: '#769656' },
  { id: 'brown', name: 'Wood', light: '#f0d9b5', dark: '#b58863' },
  { id: 'blue', name: 'Blue', light: '#eae9d2', dark: '#4b7399' },
  { id: 'gothic', name: 'Gothic', light: '#cdc4e0', dark: '#6b5a8e' },
  { id: 'blossom', name: 'Blossom', light: '#fff0f6', dark: '#f39ac1' },
  { id: 'onyx', name: 'Onyx', light: '#d9d9d9', dark: '#2e2e2e' },
  { id: 'aurora', name: 'Aurora', light: '#d6efe6', dark: '#3d8a80' },
  { id: 'neon', name: 'Neon', light: '#f3d9ff', dark: '#9150d6' },
  { id: 'sea', name: 'Sea', light: '#d4ecf7', dark: '#2f77a3' },
  { id: 'moss', name: 'Moss', light: '#e6ebd0', dark: '#5f8048' },
  { id: 'dune', name: 'Dune', light: '#f6e2c0', dark: '#c48451' },
  { id: 'mono', name: 'Mono', light: '#e6e6e6', dark: '#9e9e9e' },
  { id: 'slate', name: 'Slate', light: '#dfe3e8', dark: '#8b95a1' },
  { id: 'ocean', name: 'Ice', light: '#e3eef6', dark: '#7096b8' },
  { id: 'ice', name: 'Sky', light: '#dbe9f4', dark: '#7ca6c4' },
  { id: 'purple', name: 'Purple', light: '#efefef', dark: '#8877b7' },
  { id: 'royal', name: 'Royal', light: '#ece6f5', dark: '#8a75b5' },
  { id: 'rose', name: 'Rose', light: '#fbe4ea', dark: '#d98aa0' },
  { id: 'paper', name: 'Paper', light: '#f7f3ea', dark: '#c2b59c' },
  { id: 'grey', name: 'Grey', light: '#dcdcdc', dark: '#8a8a8a' },
  { id: 'contrast', name: 'Contrast', light: '#ffffff', dark: '#7a7a7a' },
  { id: 'clear', name: 'Clear', light: '#e8edf2', dark: '#7d8fa3' },
];

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
  root.toggleAttribute('data-scene', !!t.scene);
  root.dataset.pieces = resolvePieces(s);
  root.dataset.text = s.textSize;
  root.toggleAttribute('data-colorblind', s.colorblind || t.id === 'clear');
  root.toggleAttribute('data-reduce-motion', s.reduceMotion);
  root.style.colorScheme = t.light ? 'light' : 'dark';
  loadFonts(['inter', 'mono', ...t.fonts]);
  if (!pieceStyle) {
    pieceStyle = document.createElement('style');
    pieceStyle.id = 'piece-sets';
    pieceStyle.textContent = pieceCss();
    document.head.appendChild(pieceStyle);
  }
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || t.swatch[0]);
}
