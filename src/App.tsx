import { Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppBar, SideMenu } from './components/SideMenu';
import { navigate, useRoute } from './lib/router';
import { loadOpeningBook } from './lib/chess/openings';
import { pruneEvals } from './lib/review/evalCache';
import { HomePage } from './pages/Home';
import { PlayHub, PlayPage } from './pages/Play';
import { GamePage } from './pages/Game';
import { GamesPage } from './pages/Games';
import { FriendBoard, FriendHome, FriendJoin } from './pages/Friend';
import { OnlineGamePage } from './pages/Online';
import { useOnlineSync } from './state/online';
import { useInboxSync } from './state/people';
import { normaliseCode } from './lib/online/relay';
import { InvitePopup } from './components/InvitePopup';
import { OpeningDrill, OpeningsPage } from './pages/Openings';
import { PuzzlesPage } from './pages/Puzzles';

// Screens other than Home and Play load when first opened, so the app starts
// with less to download and parse; they're fetched in the background once it's idle.
const ReviewPage = lazy(() => import('./pages/Review').then((m) => ({ default: m.ReviewPage })));
const AnalysisPage = lazy(() => import('./pages/Analysis').then((m) => ({ default: m.AnalysisPage })));
const PracticePage = lazy(() => import('./pages/Practice').then((m) => ({ default: m.PracticePage })));
const ImportPage = lazy(() => import('./pages/Import').then((m) => ({ default: m.ImportPage })));
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })));
const AppearancePage = lazy(() => import('./pages/Appearance').then((m) => ({ default: m.AppearancePage })));
const InsightsPage = lazy(() => import('./pages/Insights').then((m) => ({ default: m.InsightsPage })));
const LearnPage = lazy(() => import('./pages/Learn').then((m) => ({ default: m.LearnPage })));
const LessonPage = lazy(() => import('./pages/Lesson').then((m) => ({ default: m.LessonPage })));
const PuzzleSessionPage = lazy(() => import('./pages/PuzzleSession').then((m) => ({ default: m.PuzzleSessionPage })));
const RushPage = lazy(() => import('./pages/Rush').then((m) => ({ default: m.RushPage })));
const ExamPage = lazy(() => import('./pages/Exam').then((m) => ({ default: m.ExamPage })));
const YouPage = lazy(() => import('./pages/You').then((m) => ({ default: m.YouPage })));
const ProfilePage = lazy(() => import('./pages/Profile').then((m) => ({ default: m.ProfilePage })));
const LATER = [
  () => import('./pages/Review'),
  () => import('./pages/Analysis'),
  () => import('./pages/Practice'),
  () => import('./pages/Import'),
  () => import('./pages/Settings'),
  () => import('./pages/Appearance'),
  () => import('./pages/Insights'),
  () => import('./pages/Learn'),
  () => import('./pages/Lesson'),
  () => import('./pages/PuzzleSession'),
  () => import('./pages/Rush'),
  () => import('./pages/Exam'),
  () => import('./pages/You'),
  () => import('./pages/Profile'),
];

/** Board screens take the whole phone screen (no menu bar). */
function isFocus(parts: string[]): boolean {
  const [root, id] = parts;
  if (root === 'game' || root === 'review' || root === 'tactics' || root === 'exam') return true;
  if (root === 'friend' && id && id !== 'join') return true;
  if (root === 'online' && id) return true;
  if (root === 'openings' && id) return true;
  if (root === 'learn' && id) return true;
  if (root === 'puzzles' && id) return true;
  return false;
}

export function App() {
  const route = useRoute();
  const main = useRef<HTMLElement>(null);
  // Each screen opens at the top, not wherever the previous one was scrolled to.
  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [route.path]);
  useOnlineSync();
  useInboxSync();
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  // A new screen closes the menu.
  useEffect(() => setMenu(false), [route.path]);
  useEffect(() => {
    const idle = (globalThis as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1500));
    idle(() => LATER.forEach((load) => void load().catch(() => undefined)));
    void loadOpeningBook();
    // Old background evaluations are only kept for a month.
    setTimeout(() => void pruneEvals(), 5000);
  }, []);

  let page: ReactNode;
  const [root, id] = route.parts;
  switch (root) {
    case undefined:
      page = <HomePage />;
      break;
    case 'play':
      page =
        id === 'custom' || route.query.get('fen') ? (
          <PlayPage key={route.query.get('fen') ?? ''} initialFen={route.query.get('fen') ?? undefined} />
        ) : (
          <PlayHub />
        );
      break;
    case 'game':
      page = <GamePage />;
      break;
    case 'review':
      page = <ReviewPage key={id} gameId={id} />;
      break;
    case 'analysis':
      page = <AnalysisPage key={route.query.get('game') ?? route.query.get('fen') ?? 'board'} query={route.query} />;
      break;
    case 'games':
      page = <GamesPage />;
      break;
    case 'practice':
      page = <PracticePage />;
      break;
    case 'learn':
      page = id ? <LessonPage key={id} id={id} courseId={route.query.get('course')} /> : <LearnPage />;
      break;
    case 'exam':
      page = <ExamPage key={id} levelId={id ?? 'placement'} />;
      break;
    case 'puzzles':
      page = id === 'rush' ? <RushPage /> : id === 'play' ? <PuzzleSessionPage key={route.query.toString()} query={route.query} /> : <PuzzlesPage />;
      break;
    case 'tactics':
      page = <PuzzleSessionPage key={route.query.toString()} query={route.query} />;
      break;
    case 'you':
      page = <YouPage />;
      break;
    case 'profile':
      page = <ProfilePage />;
      break;
    case 'import':
      page = <ImportPage />;
      break;
    case 'settings':
      page = <SettingsPage />;
      break;
    case 'appearance':
      page = <AppearancePage />;
      break;
    case 'insights':
      page = <InsightsPage />;
      break;
    case 'openings':
      page = id ? <OpeningDrill key={id} id={id} /> : <OpeningsPage />;
      break;
    case 'online':
      page = id ? <OnlineGamePage key={id} code={id} autoJoin={route.query.get('accept') === '1'} /> : <FriendHome />;
      break;
    case 'friend':
      page =
        id === 'join' ? (
          <FriendJoin d={route.query.get('d')} />
        ) : id ? (
          <FriendBoard key={id} id={id} />
        ) : (
          <FriendHome addId={normaliseCode(route.query.get('add') ?? '')} addName={route.query.get('name')} addAv={route.query.get('av')} />
        );
      break;
    default:
      page = (
        <div className="page empty">
          <h2>Page not found</h2>
          <button className="btn primary" onClick={() => navigate('/')}>
            Go home
          </button>
        </div>
      );
  }

  const focus = isFocus(route.parts);
  return (
    <div className={`app ${focus ? 'focus' : ''}`}>
      <main className="main" ref={main}>
        {!focus && <AppBar onMenu={() => setMenu(true)} />}
        <Suspense fallback={<div className="page-loading" aria-label="Loading" />}>{page}</Suspense>
      </main>
      <SideMenu open={menu} onClose={closeMenu} path={route.path} />
      <InvitePopup />
    </div>
  );
}
