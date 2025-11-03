import { Vazirmatn } from 'next/font/google';
import { Inter } from 'next/font/google';

export const vazirmatn = Vazirmatn({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
  display: 'swap'
});

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});
