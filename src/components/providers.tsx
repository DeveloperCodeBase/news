'use client';

import { ReactNode, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import type { AppLocale } from '@/lib/i18n/config';

type ProvidersProps = {
  locale: string;
  messages: Record<string, unknown>;
  children: ReactNode;
};

export default function Providers({ locale, messages, children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <NextIntlClientProvider locale={locale as AppLocale} messages={messages} timeZone="Asia/Tehran">
      <QueryClientProvider client={queryClient}>
        <SessionProvider>{children}</SessionProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}
