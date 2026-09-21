import type { Metadata } from 'next';
import { Cormorant, Lora } from 'next/font/google';
import { ThemeRegistry } from '@/theme/ThemeRegistry';
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

export const metadata: Metadata = {
  title: 'Fortuna — jogos de mesa online com amigos',
  description:
    'Crie uma sala e jogue Xadrez, Coup e Batalha Naval com seus amigos direto no navegador, sem cadastro e sem instalar nada.',
  openGraph: {
    title: 'Fortuna — jogos de mesa online com amigos',
    description:
      'Crie uma sala e jogue Xadrez, Coup e Batalha Naval com seus amigos direto no navegador, sem cadastro e sem instalar nada.',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${lora.variable}`}>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
