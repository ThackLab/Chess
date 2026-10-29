import { describe, expect, it } from 'vitest';
import { PERSONALITIES, VARIANTS, avatarCode, cleanAvatar, parseAvatar } from './avatars';

describe('avatars', () => {
  it('round-trips every personality and fits in two bytes', () => {
    PERSONALITIES.forEach((p, i) => {
      for (const v of [0, 1, VARIANTS - 1]) {
        const code = avatarCode(i, v);
        expect(code).toBeLessThanOrEqual(0xffff);
        expect(parseAvatar(code)).toMatchObject({ kind: 'art', p: i, v, personality: { id: p.id } });
      }
    });
  });

  it('reads anything else as initials', () => {
    for (const x of [0, 17, 4095, -1, 1.5, '4100', null, undefined, 0x10000, avatarCode(PERSONALITIES.length, 0)]) {
      expect(parseAvatar(x).kind).toBe('initials');
    }
    expect(cleanAvatar(5000)).toBe(5000);
    expect(cleanAvatar(-3)).toBeUndefined();
    expect(cleanAvatar('5000')).toBeUndefined();
  });

  it('keeps personality ids unique (they seed the art)', () => {
    expect(new Set(PERSONALITIES.map((p) => p.id)).size).toBe(PERSONALITIES.length);
  });
});
