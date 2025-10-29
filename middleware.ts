import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/config';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
