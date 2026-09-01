import { SESSION_COOKIE } from '@/auth/cookies';
import { proxy } from '@/proxy';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

function request(path: string, cookieHeader?: string) {
  const headers = new Headers();
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }
  return new NextRequest(new URL(path, 'http://localhost:3000'), { headers });
}

describe('proxy — garde de session', () => {
  it('laisse /login sans cookie', () => {
    const res = proxy(request('/login'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('laisse /api/health sans cookie (healthcheck Docker)', () => {
    const res = proxy(request('/api/health'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('laisse /api/upstream sans cookie (proxy API)', () => {
    const res = proxy(request('/api/upstream/health'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirige vers /login si le cookie de session est absent', () => {
    const res = proxy(request('/'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('n’accepte pas le refresh seul sur / (path /api/auth)', () => {
    const res = proxy(request('/', 'ol_refresh=secret'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('laisse passer la zone app avec le cookie de session path=/', () => {
    const res = proxy(request('/', `${SESSION_COOKIE}=1`));
    expect(res.headers.get('location')).toBeNull();
  });
});
