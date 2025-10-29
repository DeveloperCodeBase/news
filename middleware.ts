import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/config';
import { isEditorialRole } from '@/lib/auth/permissions';
import { getEnv } from '@/lib/env';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const response = NextResponse.next();
    const token = await getToken({ req: request, secret: getEnv().NEXTAUTH_SECRET });

    if (!token || !token.email) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (!isEditorialRole(token.role)) {
      return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url));
    }

    return response;
  }

  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  if (pathname === '/' || pathname === '') {
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url));
  }

  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0];

  if (!locale || !isLocale(locale)) {
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}${pathname.startsWith('/') ? '' : '/'}${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|static|.*\..*).*)']
};
