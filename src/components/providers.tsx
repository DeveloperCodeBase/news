'use client';

import { ReactNode, useMemo, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppLocale } from '@/lib/i18n/config';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type ProvidersProps = {
  locale: string;
  messages: Record<string, unknown>;
  children: ReactNode;
};

export default function Providers({ locale, messages, children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch (error) {
      console.warn('Supabase client is not configured.', error);
      return null;
    }
  }, []);

  return (
    <NextIntlClientProvider locale={locale as AppLocale} messages={messages} timeZone="Asia/Tehran">
      <QueryClientProvider client={queryClient}>
        {supabase ? <SessionContextProvider supabaseClient={supabase}>{children}</SessionContextProvider> : children}
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}
