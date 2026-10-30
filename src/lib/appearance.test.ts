import { describe, expect, it } from 'vitest';
import { BACKGROUNDS, BOARDS, backgroundOf, themeBackground } from './appearance';

describe('backgrounds', () => {
  it('follow the theme unless one is picked, and only over the dark looks', () => {
    expect(backgroundOf({ theme: 'club', background: 'auto' })).toBe('none');
    expect(backgroundOf({ theme: 'gothic', background: 'auto' })).toBeNull();
    expect(backgroundOf({ theme: 'club', background: 'space' })).toBe('space');
    expect(backgroundOf({ theme: 'aurora', background: 'none' })).toBe('none');
    // Plain light and accessibility themes keep their own background.
    expect(backgroundOf({ theme: 'paper', background: 'space' })).toBe('none');
    expect(backgroundOf({ theme: 'contrast', background: 'glasshall' })).toBe('none');
    // Settings saved before backgrounds existed.
    expect(backgroundOf({ theme: 'club' })).toBe('none');
  });

  it('every scene theme has its picture in the list, and ids are unique', () => {
    expect(themeBackground('gothic')).toBe('storm');
    expect(themeBackground('aurora')).toBe('aurora');
    for (const list of [BACKGROUNDS.map((b) => b.id), BOARDS.map((b) => b.id)]) expect(new Set(list).size).toBe(list.length);
  });
});
