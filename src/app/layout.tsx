import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Vista AI News',
  description: 'Bilingual AI news magazine built with Next.js 14, Prisma, and Supabase.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
