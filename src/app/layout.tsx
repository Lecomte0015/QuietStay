import type { Metadata } from 'next';
import { DM_Sans, DM_Serif_Display } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
});

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dm-serif',
});

export const metadata: Metadata = {
  title: 'QuietStay Ops',
  description: 'Dashboard de gestion de conciergerie immobilière',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${dmSans.variable} ${dmSerif.variable} ${dmSans.className}`}>
        {children}
      </body>
    </html>
  );
}
