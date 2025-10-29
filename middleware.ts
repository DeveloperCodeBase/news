import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getToken } from 'next-auth/jwt';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/config';
import { isEditorialRole } from '@/lib/auth/permissions';
import { getEnv } from '@/lib/env';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const attachVisitorCookie = (response: NextResponse) => {
    if (!request.cookies.get('vista_visitor')) {
      response.cookies.set('vista_visitor', crypto.randomUUID(), {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 180
      });
    }
    return response;
  };

  if (pathname.startsWith('/admin')) {
    const token = await getToken({ req: request, secret: getEnv().NEXTAUTH_SECRET });

    if (!token || !token.email) {
      return attachVisitorCookie(NextResponse.redirect(new URL('/login', request.url)));
    }

    if (!isEditorialRole(token.role)) {
      return attachVisitorCookie(NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url)));
    }

    return attachVisitorCookie(NextResponse.next());
  }

  if (pathname.startsWith('/login')) {
    return attachVisitorCookie(NextResponse.next());
  }

  if (pathname === '/' || pathname === '') {
    return attachVisitorCookie(NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url)));
  }

  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0];

  if (!locale || !isLocale(locale)) {
    return attachVisitorCookie(
      NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}${pathname.startsWith('/') ? '' : '/'}${pathname}`, request.url))
    );
  }

  return attachVisitorCookie(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next|api|static|.*\..*).*)']
};
