import { describe, expect, it } from 'vitest';
import { AVATARS, PHOTO, avatarCode, cleanAvatar, cleanPhoto, parseAvatar } from './avatars';

describe('avatars', () => {
  it('round-trips every avatar and fits in two bytes', () => {
    AVATARS.forEach((a, i) => {
      const code = avatarCode(i);
      expect(code).toBeLessThanOrEqual(0xffff);
      expect(parseAvatar(code)).toMatchObject({ kind: 'art', art: { id: a.id } });
    });
    expect(parseAvatar(PHOTO).kind).toBe('photo');
  });

  it('reads anything else as initials, and gives app 1.5 avatars a close match', () => {
    for (const x of [0, -1, 1.5, '4100', null, undefined, 0x10000, avatarCode(AVATARS.length)]) expect(parseAvatar(x).kind).toBe('initials');
    expect(parseAvatar(4096)).toMatchObject({ kind: 'art', art: { id: 'fire' } });
    expect(parseAvatar(4096 + 15 * 1024 + 7).kind).toBe('art');
    expect(cleanAvatar(5000)).toBe(5000);
    expect(cleanAvatar('5000')).toBeUndefined();
  });

  it('only lets small JPEG photos through', () => {
    expect(cleanPhoto('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA');
    expect(cleanPhoto('data:image/svg+xml;base64,AAAA')).toBeUndefined();
    expect(cleanPhoto('javascript:alert(1)')).toBeUndefined();
    expect(cleanPhoto(`data:image/jpeg;base64,${'A'.repeat(20_000)}`)).toBeUndefined();
  });

  it('has a picture file for every avatar, and unique ids', async () => {
    const { existsSync } = await import('node:fs');
    for (const a of AVATARS) expect(existsSync(`public/avatars/${a.id}.webp`), a.id).toBe(true);
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(AVATARS.length);
  });
});
