import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { LONDON_LINES, findLine, linesUpTo } from './lines';
import { LONDON_TRAPS } from './traps';
import { buildTree, nodeAt } from './tree';
import { PERSONAS, PHRASES, type Moment } from '../coach/phrases';
import { fill, hasNotation, pickPhrase, worthSaying } from '../coach/talk';
import { describeMove, plainWarning } from '../coach/plain';
import type { PositionEval } from '../review/types';

const SQUARE = /^[a-h][1-8]$/;
const validArrow = (a: string) => {
  const uci = a.includes(':') ? a.split(':')[1] : a;
  return SQUARE.test(uci.slice(0, 2)) && SQUARE.test(uci.slice(2, 4)) && uci.length === 4;
};

describe('London lines', () => {
  it('have unique ids and every level', () => {
    const ids = LONDON_LINES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lv of ['beginner', 'intermediate', 'advanced'] as const)
      expect(
        LONDON_LINES.some((l) => l.level === lv),
        lv,
      ).toBe(true);
  });

  it('are legal, start from the start, end on a move of yours', () => {
    for (const line of LONDON_LINES) {
      const c = new Chess();
      for (const m of line.moves) {
        expect(() => c.move(m.san), `${line.id}: ${m.san}`).not.toThrow();
      }
      expect(line.moves.length % 2, `${line.id} should end on White's move`).toBe(1);
    }
  });

  it('speak plain English: no notation or square names in anything the coach says', () => {
    for (const line of LONDON_LINES) {
      for (const text of [line.name, line.summary, line.rule, line.group, ...line.moves.map((m) => m.note)]) {
        expect(text.trim().length, `${line.id}: empty text`).toBeGreaterThan(0);
        expect(hasNotation(text), `${line.id}: "${text}"`).toBe(false);
      }
    }
  });

  it('have well-formed arrows', () => {
    for (const line of LONDON_LINES)
      for (const m of line.moves) for (const a of m.arrows ?? []) expect(validArrow(a), `${line.id} ${m.san} ${a}`).toBe(true);
  });

  it('flag a few of your moves as worth explaining in every line', () => {
    for (const line of LONDON_LINES) expect(line.moves.filter((m, i) => i % 2 === 0 && m.key).length, line.id).toBeGreaterThanOrEqual(2);
  });

  it('build into one tree, and lower levels come with higher ones', () => {
    const tree = buildTree(LONDON_LINES);
    const after = nodeAt(tree, ['d2d4', 'd7d5', 'c1f4']);
    expect(after).toBeTruthy();
    expect(after!.next.size).toBeGreaterThan(3);
    expect(linesUpTo('beginner').every((l) => l.level === 'beginner')).toBe(true);
    expect(linesUpTo('advanced').length).toBe(LONDON_LINES.length);
    expect(findLine('raid')?.name).toBeTruthy();
  });

  it('never disagree about your move in the same position', () => {
    // Two lines that reach the same position must play the same move for you there.
    const seen = new Map<string, string>();
    for (const line of LONDON_LINES.filter((l) => !l.system)) {
      const c = new Chess();
      for (const m of line.moves) {
        const key = c.fen().split(' ').slice(0, 4).join(' ');
        if (c.turn() === 'w') {
          const prev = seen.get(key);
          const mine = c.move(m.san).san;
          if (prev) expect(mine, `${line.id} at ${key}`).toBe(prev);
          seen.set(key, mine);
        } else c.move(m.san);
      }
    }
  });
});

describe('London traps', () => {
  it('are legal with you to move, and come from real lines', () => {
    const ids = new Set<string>();
    for (const t of LONDON_TRAPS) {
      expect(ids.has(t.id), t.id).toBe(false);
      ids.add(t.id);
      const c = new Chess();
      for (const san of t.moves.split(' ')) c.move(san);
      expect(c.turn(), t.id).toBe('w');
      const start = c.fen();
      for (const san of t.solution) expect(() => c.move(san), `${t.id}: ${san}`).not.toThrow();
      expect(t.solution.length % 2, t.id).toBe(1);
      for (const alt of t.alts ?? []) expect(() => new Chess(start).move(alt), `${t.id}: ${alt}`).not.toThrow();
      if (t.line) expect(findLine(t.line), `${t.id} line ${t.line}`).toBeTruthy();
      for (const text of [t.title, t.intro, t.hint, t.why, t.wrong]) expect(hasNotation(text), `${t.id}: "${text}"`).toBe(false);
      for (const a of t.arrows ?? []) expect(validArrow(a), `${t.id} ${a}`).toBe(true);
    }
  });
});

describe('the talking coach', () => {
  it('has plenty to say for every moment, without notation', () => {
    const moments = Object.keys(PHRASES.mate) as Moment[];
    for (const persona of Object.keys(PERSONAS) as (keyof typeof PERSONAS)[]) {
      for (const m of moments) {
        const list = PHRASES[persona][m] ?? [];
        expect(list.length, `${persona}.${m}`).toBeGreaterThanOrEqual(3);
        for (const p of list) expect(hasNotation(p), `${persona}.${m}: ${p}`).toBe(false);
      }
    }
  });

  it('uses every phrase once before repeating one', () => {
    const n = PHRASES.mate.right!.length;
    const round1 = Array.from({ length: n }, () => pickPhrase('mate', 'right'));
    expect(new Set(round1).size).toBe(n);
    const next = pickPhrase('mate', 'right');
    expect(next).not.toBe(round1[n - 1]);
  });

  it('fills the blanks and tacks on details that have none', () => {
    expect(fill('Nope. {detail}', { moment: 'wrong', detail: 'Bishop out first.' }, 'mate')).toBe('Nope. Bishop out first.');
    expect(fill('Yep.', { moment: 'rightKey', idea: 'It guards the middle.' }, 'mate')).toBe('Yep. It guards the middle.');
    expect(fill('', { moment: 'walkYours', idea: 'Knight out.' }, 'mate')).toBe('Knight out.');
    expect(fill('{n} in a row, {name}.', { moment: 'streak', n: 4 }, 'Jacob')).toBe('4 in a row, Jacob.');
    expect(fill('This one’s {line}. {idea}', { moment: 'walkStart', line: 'The queen raid' }, 'mate')).toBe('This one’s The queen raid.');
  });

  it('spots notation', () => {
    for (const s of ['Play Nf3', 'then e4', 'castle with O-O', 'Bxd5!', 'the f7 square', '♘f3']) expect(hasNotation(s), s).toBe(true);
    for (const s of ['Knight out.', 'Push the pawn in front of your king.', 'A 3 move trap', 'Be careful', 'I am a coach'])
      expect(hasNotation(s), s).toBe(false);
  });

  it('says less when told to be quiet', () => {
    expect(worthSaying(0, 'chatty')).toBe(true);
    expect(worthSaying(0, 'normal')).toBe(false);
    expect(worthSaying(1, 'quiet')).toBe(false);
    expect(worthSaying(2, 'quiet')).toBe(true);
  });

  it('describes moves and mistakes in plain words', () => {
    // After 1.d4 d5 2.Bf4 c5 3.e3 Qb6 4.Nc3 Qxb2, the knight takes on d5 threatening a fork.
    const c = new Chess();
    for (const s of 'd4 d5 Bf4 c5 e3 Qb6 Nc3 Qxb2'.split(' ')) c.move(s);
    const text = describeMove(c.fen(), 'c3d5', 'w');
    expect(text).toBe('your knight takes their pawn');
    expect(hasNotation(text)).toBe(false);
    // A blunder: 1.d4 e5 2.dxe5 Nc6 3.Nf3 Qe7 4.Bf4 Qb4+ 5.Bd2 Qxb2 6.Bc3?? Bb4 and mate follows.
    const b = new Chess();
    for (const s of 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2'.split(' ')) b.move(s);
    const before: PositionEval = { fen: b.fen(), depth: 10, lines: [{ score: { type: 'cp', value: 150 }, pv: ['b1c3'], san: ['Nc3'], depth: 10 }] };
    b.move('Bc3');
    const after: PositionEval = {
      fen: b.fen(),
      depth: 10,
      lines: [{ score: { type: 'cp', value: -450 }, pv: ['f8b4', 'd1d2', 'b4c3', 'd2c3', 'b2c1'], san: [], depth: 10 }],
    };
    const w = plainWarning(before, after, 'w');
    expect(hasNotation(w.text), w.text).toBe(false);
    expect(w.text.startsWith('That lets their bishop')).toBe(true);
    expect(w.arrows).toEqual(['r:f8b4']);
  });
});
