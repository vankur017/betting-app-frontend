import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './navigation';

describe('safeRedirectPath', () => {
  it('allows in-app paths', () => {
    expect(safeRedirectPath('/games/crash')).toBe('/games/crash');
    expect(safeRedirectPath('/history?page=2')).toBe('/history?page=2');
  });

  it('blocks off-site and malformed targets', () => {
    for (const target of ['https://evil.example', '//evil.example', '/\\evil.example', 'games', 42, undefined]) {
      expect(safeRedirectPath(target)).toBe('/');
    }
  });

  it('does not redirect back to auth pages', () => {
    expect(safeRedirectPath('/login')).toBe('/');
    expect(safeRedirectPath('/register?x=1')).toBe('/');
  });
});
