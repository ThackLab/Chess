// The one menu: a bar at the top with the ☰ button, and a drawer that slides in
// from the left with every part of the app worth going to.
import { useEffect, type ReactNode } from 'react';
import {
  BookOpen,
  Bot,
  Download,
  Flame,
  GraduationCap,
  History,
  House,
  Menu,
  Microscope,
  Puzzle,
  Settings,
  Target,
  TrendingUp,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Logo } from './Widgets';
import { navigate } from '../lib/router';
import { monogram } from '../lib/bots/bots';
import { useSettings } from '../state/settings';
import { useProfile } from '../state/profile';
import { liveStreak, useLearn } from '../state/learn';
import { useOpponents } from '../state/opponents';
import { useRepertoire } from '../state/repertoire';
import { useDueCount } from '../pages/Puzzles';
import { dueLines, usePackLines } from '../pages/Openings';

interface Item {
  path: string;
  label: string;
  icon: ReactNode;
  /** Highlighted when the current path starts with one of these. */
  match: string[];
  badge?: number;
}

export function AppBar({ onMenu }: { onMenu: () => void }) {
  const streak = liveStreak(useLearn());
  return (
    <header className="appbar">
      <button className="appbar-menu" onClick={onMenu} aria-label="Menu">
        <Menu size={26} />
      </button>
      <a className="appbar-brand" href="#/">
        <Logo size={26} /> Outpost
      </a>
      <span className="spacer" />
      <span className="appbar-streak" title="Days in a row with some training">
        <Flame size={20} className="ic-flame" fill="currentColor" />
        {streak}
      </span>
    </header>
  );
}

export function SideMenu({ open, onClose, path }: { open: boolean; onClose: () => void; path: string }) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, onClose]);
  return (
    <>
      <div className={`drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} aria-hidden />
      <nav className={`drawer ${open ? 'open' : ''}`} aria-label="Menu" aria-hidden={!open}>
        {open && <MenuBody path={path} onClose={onClose} />}
      </nav>
    </>
  );
}

function MenuBody({ path, onClose }: { path: string; onClose: () => void }) {
  const name = useSettings((s) => s.playerName);
  const rating = useProfile((s) => s.rating);
  const puzzleRating = useLearn((s) => s.rating);
  const yourMoves = useOpponents().filter((o) => o.yourMove).length;
  const mistakes = useDueCount();
  const repertoire = useRepertoire();
  const openings = dueLines(usePackLines(), repertoire.selected, repertoire.lines);

  const groups: { title: string; items: Item[] }[] = [
    {
      title: 'Play',
      items: [
        { path: '/', label: 'Home', icon: <House size={22} />, match: [] },
        { path: '/play', label: 'Play a bot', icon: <Bot size={22} className="ic-bot" />, match: ['/play', '/game'] },
        {
          path: '/friend',
          label: 'Play a friend',
          icon: <Users size={22} className="ic-friends" />,
          match: ['/friend', '/online'],
          badge: yourMoves,
        },
      ],
    },
    {
      title: 'Improve',
      items: [
        { path: '/puzzles', label: 'Puzzles', icon: <Puzzle size={22} className="ic-puzzle" />, match: ['/puzzles/play', '/tactics'] },
        { path: '/puzzles/rush', label: 'Puzzle Rush', icon: <Zap size={22} className="ic-zap" />, match: ['/puzzles/rush'] },
        { path: '/learn', label: 'Lessons', icon: <GraduationCap size={22} className="ic-learn" />, match: ['/learn', '/exam'] },
        { path: '/openings', label: 'Openings', icon: <BookOpen size={22} className="ic-timer" />, match: ['/openings'], badge: openings },
        { path: '/practice', label: 'Your mistakes', icon: <Target size={22} className="ic-mistake" />, match: ['/practice'], badge: mistakes },
      ],
    },
    {
      title: 'Your games',
      items: [
        { path: '/games', label: 'Game history', icon: <History size={22} />, match: ['/games', '/review'] },
        { path: '/analysis', label: 'Analysis board', icon: <Microscope size={22} />, match: ['/analysis'] },
        { path: '/insights', label: 'Insights', icon: <TrendingUp size={22} />, match: ['/insights'] },
        { path: '/import', label: 'Import games', icon: <Download size={22} />, match: ['/import'] },
      ],
    },
  ];
  const isOn = (it: Item) => (it.path === '/' ? path === '/' : path === it.path || it.match.some((m) => path.startsWith(m)));

  const go = (p: string) => {
    onClose();
    navigate(p);
  };

  return (
    <>
      <div className="drawer-head">
        <button className="drawer-me" onClick={() => go('/you')}>
          <span className="me-avatar">{monogram(name && name !== 'You' ? name : 'Me')}</span>
          <span className="dm-body">
            <b>{name && name !== 'You' ? name : 'Your profile'}</b>
            <span>
              Bots {rating} · Puzzles {puzzleRating}
            </span>
          </span>
        </button>
        <button className="icon-btn" onClick={onClose} aria-label="Close menu">
          <X size={22} />
        </button>
      </div>
      <div className="drawer-body">
        {groups.map((g) => (
          <div key={g.title} className="drawer-group">
            <div className="drawer-title">{g.title}</div>
            {g.items.map((it) => (
              <button key={it.path} className={`drawer-item ${isOn(it) ? 'on' : ''}`} onClick={() => go(it.path)}>
                <span className="di-ico">{it.icon}</span>
                <span className="di-label">{it.label}</span>
                {!!it.badge && <span className="di-badge">{it.badge}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="drawer-foot">
        <button className={`drawer-item ${path.startsWith('/you') ? 'on' : ''}`} onClick={() => go('/you')}>
          <span className="di-ico">
            <UserRound size={22} />
          </span>
          <span className="di-label">Profile</span>
        </button>
        <button
          className={`drawer-item ${path.startsWith('/settings') || path.startsWith('/appearance') ? 'on' : ''}`}
          onClick={() => go('/settings')}
        >
          <span className="di-ico">
            <Settings size={22} />
          </span>
          <span className="di-label">Settings</span>
        </button>
      </div>
    </>
  );
}
