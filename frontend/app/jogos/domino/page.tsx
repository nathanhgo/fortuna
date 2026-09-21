import type { Metadata } from 'next';
import { GoldLink } from '@/components/GoldLink';
import { GuideLayout, GuideParagraph } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'Dominó online (em breve)',
  description:
    'Dominó na Fortuna, na mesma sala e sem cadastro. O jogo ainda não está disponível.',
  alternates: { canonical: '/jogos/domino' },
  openGraph: {
    title: 'Dominó online (em breve) — Fortuna',
    description: 'Dominó na Fortuna, na mesma sala e sem cadastro. O jogo ainda não está disponível.',
  },
};

export default function DominoGuidePage() {
  return (
    <GuideLayout title="Dominó, em breve">
      <GuideParagraph>
        Dominó é o jogo de mesa que cabe em qualquer reunião e some quando o grupo está remoto.
        A ideia é trazer as pedras para a mesma sala da Fortuna, sem cadastro. A mesa ainda não
        foi aberta.
      </GuideParagraph>
      <GuideParagraph>
        <GoldLink href="/">Voltar ao início</GoldLink> e jogar o que já está no ar.
      </GuideParagraph>
    </GuideLayout>
  );
}
