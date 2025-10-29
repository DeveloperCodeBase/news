import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/config';
import { isEditorialRole, normalizeRole } from '@/lib/auth/permissions';
import type { Database } from '@/types/supabase';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const response = NextResponse.next();
    const supabase = createMiddlewareClient<Database>({ req: request, res: response });
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const role = normalizeRole(session.user.user_metadata?.role);
    if (!role || !isEditorialRole(role)) {
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
