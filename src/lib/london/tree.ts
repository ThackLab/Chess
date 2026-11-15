// The London lines merged into one move tree: what the coach's bot plays as
// Black while the game is still in the book, and what the London move is for
// you in any position the lines reach.
import { Chess } from 'chess.js';
import type { LondonLevel } from '../../state/london';
import type { LondonLine, LondonMove } from './lines';

export interface TreeNode {
  /** The move that led here (UCI), and its SAN and lesson note. */
  uci?: string;
  san?: string;
  move?: LondonMove;
  /** Lines that pass through this position. */
  lines: string[];
  /** The easiest level of any line through here. */
  level: LondonLevel;
  next: Map<string, TreeNode>;
}

const ORDER: LondonLevel[] = ['beginner', 'intermediate', 'advanced'];

export interface PlayedLine {
  line: LondonLine;
  uci: string[];
  /** Position before each move, and after the last. */
  fens: string[];
}

const cache = new Map<string, PlayedLine>();

/** A line's moves as UCI, with the position before each one. */
export function playLine(line: LondonLine): PlayedLine {
  const hit = cache.get(line.id);
  if (hit) return hit;
  const c = new Chess();
  const uci: string[] = [];
  const fens = [c.fen()];
  for (const m of line.moves) {
    const mv = c.move(m.san);
    uci.push(mv.from + mv.to + (mv.promotion ?? ''));
    fens.push(c.fen());
  }
  const out = { line, uci, fens };
  cache.set(line.id, out);
  return out;
}

export function buildTree(lines: LondonLine[]): TreeNode {
  const root: TreeNode = { lines: [], level: 'advanced', next: new Map() };
  for (const line of lines) {
    const { uci } = playLine(line);
    let node = root;
    node.lines.push(line.id);
    if (ORDER.indexOf(line.level) < ORDER.indexOf(node.level)) node.level = line.level;
    uci.forEach((u, i) => {
      let child = node.next.get(u);
      if (!child) {
        child = { uci: u, san: line.moves[i].san, move: line.moves[i], lines: [], level: line.level, next: new Map() };
        node.next.set(u, child);
      }
      child.lines.push(line.id);
      if (ORDER.indexOf(line.level) < ORDER.indexOf(child.level)) child.level = line.level;
      node = child;
    });
  }
  return root;
}

/** The node reached by these moves, or null once the game has left the lines. */
export function nodeAt(root: TreeNode, moves: string[]): TreeNode | null {
  let node: TreeNode | undefined = root;
  for (const u of moves) {
    node = node.next.get(u);
    if (!node) return null;
  }
  return node;
}

/** Book replies from a node that suit a level (a beginner's bot sticks to beginner lines while it can). */
export function repliesFor(node: TreeNode, level: LondonLevel): TreeNode[] {
  const all = [...node.next.values()];
  const max = ORDER.indexOf(level);
  const fit = all.filter((n) => ORDER.indexOf(n.level) <= max);
  return fit.length ? fit : all;
}
