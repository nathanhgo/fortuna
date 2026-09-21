import type { Metadata } from 'next';
import { GoldLink } from '@/components/GoldLink';
import { GuideLayout, GuideParagraph } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'Damas online (em breve)',
  description:
    'Damas clássicas na Fortuna, na mesma sala dos outros jogos e sem cadastro. Ainda não está na mesa.',
  alternates: { canonical: '/jogos/damas' },
  openGraph: {
    title: 'Damas online (em breve) — Fortuna',
    description:
      'Damas clássicas na Fortuna, na mesma sala dos outros jogos e sem cadastro. Ainda não está na mesa.',
  },
};

export default function DamasGuidePage() {
  return (
    <GuideLayout title="Damas, em breve">
      <GuideParagraph>
        Damas é o tabuleiro que muita gente aprende em casa e depois não encontra um lugar simples
        para jogar à distância. A Fortuna quer essa mesa no mesmo convite do xadrez. Ainda não dá
        para mover as pedras aqui.
      </GuideParagraph>
      <GuideParagraph>
        Enquanto as damas não chegam, <GoldLink href="/jogos/xadrez">jogue xadrez</GoldLink> na sala.
      </GuideParagraph>
    </GuideLayout>
  );
}
