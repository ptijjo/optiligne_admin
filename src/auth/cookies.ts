import { NextResponse } from 'next/server';

export const REFRESH_COOKIE = 'ol_refresh';
export const SESSION_COOKIE = 'ol_session';

const WEEK_S = 60 * 60 * 24 * 7;

function cookieBase(path: string) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path,
    maxAge: WEEK_S,
  };
}

export function applySessionCookies(res: NextResponse, refreshToken: string) {
  res.cookies.set(REFRESH_COOKIE, refreshToken, cookieBase('/api/auth'));
  res.cookies.set(SESSION_COOKIE, '1', cookieBase('/'));
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(REFRESH_COOKIE, '', { ...cookieBase('/api/auth'), maxAge: 0 });
  res.cookies.set(SESSION_COOKIE, '', { ...cookieBase('/'), maxAge: 0 });
}
