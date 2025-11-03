import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { inter, vazirmatn } from '@/lib/fonts';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';

export const metadata: Metadata = {
  title: 'Hoosh Gate Magazine',
  description: 'Hoosh Gate delivers bilingual AI journalism powered by automated ingestion, translation, and expert editorial review.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning>
      <body
        className={`${vazirmatn.variable} ${inter.variable} min-h-screen bg-slate-950 text-slate-100 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
