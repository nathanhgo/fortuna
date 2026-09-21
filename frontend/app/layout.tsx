import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { getSiteUrl } from '@/lib/siteUrl';
import { ThemeRegistry } from '@/theme/ThemeRegistry';
import { Cormorant, Lora } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
});

const title = 'Fortuna — jogos de mesa online com amigos';
const description =
  'Crie uma sala e jogue Xadrez, Coup e Batalha Naval com seus amigos direto no navegador, sem cadastro e sem instalar nada.';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: title,
    template: '%s — Fortuna',
  },
  description,
  keywords: [
    'jogar xadrez online com amigos sem cadastro',
    'coup online',
    'batalha naval online multiplayer',
    'jogos de mesa sem cadastro',
  ],
  openGraph: {
    title,
    description,
    locale: 'pt_BR',
    type: 'website',
    siteName: 'Fortuna',
    images: [
      {
        url: '/images/logo/fortuna-logo-transparent.png',
        alt: 'Fortuna',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title,
    description,
    images: ['/images/logo/fortuna-logo-transparent.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${lora.variable}`}>
      <body>
        <ThemeRegistry>
          <SiteHeader />
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
