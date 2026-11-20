import { describe, expect, it } from 'vitest';
import { isLoopbackUrl } from './http';

describe('isLoopbackUrl', () => {
  it('recognises addresses on this computer', () => {
    for (const url of [
      'http://localhost:5000',
      'http://api.localhost:5000',
      'http://127.0.0.1:5000',
      'http://[::1]:5000',
    ]) {
      expect(isLoopbackUrl(url)).toBe(true);
    }
  });

  it('rejects everything else', () => {
    for (const url of ['', '/api', 'https://my-app.vercel.app', 'http://192.168.1.5:5000', 'http://localhost.evil.com']) {
      expect(isLoopbackUrl(url)).toBe(false);
    }
  });
});
