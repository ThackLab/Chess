import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import {
  BACKGROUNDS,
  BOARDS,
  PIECE_SETS,
  THEMES,
  backgroundOf,
  currentThemeId,
  loadAllFonts,
  resolveBoard,
  resolvePieces,
  takesBackground,
  themeBackground,
  themeOf,
  type BackgroundChoice,
  type BoardId,
  type Theme,
} from '../lib/appearance';
import { Board } from '../components/Board';
import { useSettings } from '../state/settings';
import { PageHead, SectionTitle } from '../components/ui';
import { Segmented, Toggle } from '../components/Widgets';

/** A corner of a board in a theme's colours, with a couple of its pieces. */
function MiniBoard({ board, pieces, size = 4 }: { board: BoardId; pieces: string; size?: number }) {
  const b = BOARDS.find((x) => x.id === board) ?? BOARDS[0];
  const cells = [];
  const placed: Record<string, string> = { '0-1': 'black king', '0-3': 'black knight', '1-0': 'white queen', '1-2': 'white bishop' };
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      cells.push(
        <span key={`${r}-${c}`} style={{ background: (r + c) % 2 ? b.dark : b.light }}>
          {placed[`${r}-${c}`] && <piece className={placed[`${r}-${c}`]} />}
        </span>,
      );
  return (
    <div className="mini-board" data-pieces={pieces} style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
      {cells}
    </div>
  );
}

function ThemeCard({ t, on, onPick }: { t: Theme; on: boolean; onPick: () => void }) {
  return (
    <button
      className={`theme-card ${on ? 'on' : ''}`}
      data-theme={t.id}
      data-display={t.display}
      data-ui={t.ui}
      data-scene={t.scene ? '' : undefined}
      onClick={onPick}
      aria-pressed={on}
    >
      <MiniBoard board={t.board} pieces={t.pieces} />
      <span className="tc-body">
        <span className="tc-name">{t.name}</span>
        <span className="tc-blurb">{t.blurb}</span>
        <span className="tc-sample">
          <span className="tc-chip">Nc7+</span> wins the rook.
        </span>
      </span>
      {on && (
        <span className="tc-check" aria-hidden>
          <Check size={14} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

type Tab = 'board' | 'pieces' | 'background' | 'themes' | 'more';
const TABS: { id: Tab; label: string }[] = [
  { id: 'board', label: 'Board' },
  { id: 'pieces', label: 'Pieces' },
  { id: 'background', label: 'Background' },
  { id: 'themes', label: 'Themes' },
  { id: 'more', label: 'More' },
];
const TAB_KEY = 'grandmasters.themeTab';
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function savedTab(): Tab {
  try {
    const t = localStorage.getItem(TAB_KEY) as Tab | null;
    return t && TABS.some((x) => x.id === t) ? t : 'board';
  } catch {
    return 'board';
  }
}

/** A board's corner as a tile: its picture, or its two colours. */
function boardTile(b: (typeof BOARDS)[number]) {
  return b.texture
    ? { backgroundImage: `url('${b.texture}')`, backgroundSize: '400% 400%', backgroundPosition: '0 0' }
    : { background: `conic-gradient(${b.dark} 0 25%, ${b.light} 0 50%, ${b.dark} 0 75%, ${b.light} 0) 0 0 / 100% 100%` };
}

/** `#/appearance`: the theme screen. A live board up top; board, pieces and background are each picked on their own. */
export function AppearancePage() {
  const s = useSettings();
  useEffect(loadAllFonts, []);
  const [tab, setTabState] = useState<Tab>(savedTab);
  const setTab = (t: Tab) => {
    setTabState(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* private mode: the tab just isn't remembered */
    }
  };
  const groups = ['Scenes', 'Classic', 'Accessible'] as const;
  const theme = themeOf(s.theme);
  const board = resolveBoard(s);
  const pieces = resolvePieces(s);
  const bg = backgroundOf(s);
  const shownBg = bg === null ? (theme.scene ? themeBackground(theme.id) : 'none') : bg;
  const pickBackground = (id: BackgroundChoice) =>
    // Plain light and accessibility themes keep their own background: pictures go with the dark look.
    s.set(takesBackground(theme) || id === 'none' || id === 'auto' ? { background: id } : { background: id, theme: 'club' });

  const selectedName =
    tab === 'board'
      ? s.boardTheme === 'auto'
        ? `${BOARDS.find((b) => b.id === board)?.name ?? ''} (theme)`
        : (BOARDS.find((b) => b.id === s.boardTheme)?.name ?? '')
      : tab === 'pieces'
        ? `${PIECE_SETS.find((p) => p.id === pieces)?.name ?? ''}${s.pieceSet === 'auto' ? ' (theme)' : ''}`
        : tab === 'background'
          ? shownBg === 'none'
            ? 'None'
            : (BACKGROUNDS.find((b) => b.id === shownBg)?.name ?? '')
          : '';

  return (
    <div className="page narrow appearance theme-page">
      <PageHead title="Theme" back="/settings" />
      <div className="tp-preview">
        <Board fen={START} orientation="white" viewOnly />
      </div>
      <div className="tp-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {selectedName && <div className="tp-name">{selectedName}</div>}

      {tab === 'board' && (
        <div className="tp-grid">
          <button
            className={`tp-tile tp-auto ${s.boardTheme === 'auto' ? 'on' : ''}`}
            onClick={() => s.set({ boardTheme: 'auto' })}
            title="Match the theme"
          >
            <span>Theme</span>
          </button>
          {BOARDS.map((b) => (
            <button
              key={b.id}
              className={`tp-tile ${s.boardTheme === b.id ? 'on' : ''}`}
              style={boardTile(b)}
              onClick={() => s.set({ boardTheme: b.id })}
              aria-label={b.name}
              title={b.name}
            />
          ))}
        </div>
      )}

      {tab === 'pieces' && (
        <div className="tp-grid">
          <button
            className={`tp-tile tp-auto ${s.pieceSet === 'auto' ? 'on' : ''}`}
            onClick={() => s.set({ pieceSet: 'auto' })}
            title="Match the theme"
          >
            <span>Theme</span>
          </button>
          {PIECE_SETS.map((p) => (
            <button
              key={p.id}
              className={`tp-tile tp-piece ${s.pieceSet === p.id ? 'on' : ''}`}
              data-pieces={p.id}
              style={boardTile(BOARDS.find((b) => b.id === board) ?? BOARDS[0])}
              onClick={() => s.set({ pieceSet: p.id })}
              aria-label={p.name}
              title={p.name}
            >
              <piece className="white knight" />
              <piece className="black knight" />
            </button>
          ))}
        </div>
      )}

      {tab === 'background' && (
        <>
          <div className="tp-grid">
            <button
              className={`tp-tile tp-none ${shownBg === 'none' ? 'on' : ''}`}
              onClick={() => pickBackground('none')}
              aria-label="No picture"
              title="No picture"
            >
              <span>None</span>
            </button>
            {BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                className={`tp-tile tp-bg ${shownBg === b.id ? 'on' : ''}`}
                style={{ backgroundImage: `url('${b.thumb}')` }}
                onClick={() => pickBackground(b.id)}
                aria-label={b.name}
                title={b.name}
              />
            ))}
          </div>
          {!takesBackground(theme) && (
            <p className="tp-note">{theme.name} has a plain background for easy reading. Picking a picture switches to the Club look.</p>
          )}
        </>
      )}

      {tab === 'themes' && (
        <>
          <p className="tp-note">A theme sets everything at once: colours, board, pieces and background.</p>
          {groups.map((g) => (
            <section key={g}>
              <SectionTitle>{g === 'Accessible' ? 'Easier to see' : g === 'Scenes' ? 'Scenes' : 'Classic'}</SectionTitle>
              <div className="theme-grid">
                {THEMES.filter((t) => t.group === g).map((t) => (
                  <ThemeCard
                    key={t.id}
                    t={t}
                    on={currentThemeId(s.theme) === t.id}
                    onPick={() => s.set({ theme: t.id, boardTheme: 'auto', pieceSet: 'auto', background: 'auto' })}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {tab === 'more' && (
        <>
          <SectionTitle>Reading and seeing</SectionTitle>
          <div className="settings-list">
            <div className="setting">
              <div>
                <div className="st-title">Text size</div>
              </div>
              <Segmented
                value={s.textSize}
                onChange={(textSize) => s.set({ textSize })}
                options={[
                  { value: 'm', label: 'Default' },
                  { value: 'l', label: 'Large' },
                  { value: 'xl', label: 'Larger' },
                ]}
              />
            </div>
            <div className="setting">
              <div>
                <div className="st-title">Moves with piece pictures</div>
                <div className="desc">
                  Shows <span className="tc-chip">Nf3</span> as a knight and a square, the way chess books print it.
                </div>
              </div>
              <Toggle checked={s.figurines} onChange={(figurines) => s.set({ figurines })} />
            </div>
            <div className="setting">
              <div>
                <div className="st-title">Colour-blind safe colours</div>
                <div className="desc">Blue for right and orange for wrong, instead of green and red.</div>
              </div>
              <Toggle checked={s.colorblind || s.theme === 'clear'} onChange={(colorblind) => s.set({ colorblind })} />
            </div>
            <div className="setting">
              <div>
                <div className="st-title">Name every square</div>
                <div className="desc">Writes a1, b1 and so on in each square. Handy while you learn the board.</div>
              </div>
              <Toggle checked={s.squareNames || s.theme === 'clear'} onChange={(squareNames) => s.set({ squareNames })} />
            </div>
            <div className="setting">
              <div>
                <div className="st-title">Reduce motion</div>
                <div className="desc">No sliding pieces, counting numbers or fading screens.</div>
              </div>
              <Toggle checked={s.reduceMotion} onChange={(reduceMotion) => s.set({ reduceMotion })} />
            </div>
          </div>
          <details className="credits" data-pieces={pieces}>
            <summary>Piece set credits</summary>
            <p>From lichess.org, all free to use:</p>
            <ul>
              {PIECE_SETS.map((p) => (
                <li key={p.id}>
                  {p.name}: {p.credit}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
