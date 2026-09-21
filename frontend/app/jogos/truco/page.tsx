import type { Metadata } from 'next';
import { GoldLink } from '@/components/GoldLink';
import { GuideLayout, GuideParagraph } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'Truco online (em breve)',
  description:
    'Truco paulista na Fortuna está a caminho: a mesma sala dos outros jogos, sem cadastro. Ainda não dá para sentar à mesa.',
  alternates: { canonical: '/jogos/truco' },
  openGraph: {
    title: 'Truco online (em breve) — Fortuna',
    description:
      'Truco paulista na Fortuna está a caminho: a mesma sala dos outros jogos, sem cadastro.',
  },
};

export default function TrucoGuidePage() {
  return (
    <GuideLayout title="Truco, em breve">
      <GuideParagraph>
        O truco paulista é um dos jogos que queremos trazer para a mesma sala em que vocês já
        jogam xadrez e Coup. A ideia é o vai-e-vem de truco, seis, nove e doze sem sair do
        navegador e sem criar conta — ainda não está na mesa.
      </GuideParagraph>
      <GuideParagraph>
        Enquanto isso, <GoldLink href="/">crie uma sala</GoldLink> para os jogos que já estão no ar.
      </GuideParagraph>
    </GuideLayout>
  );
}
