import type { Metadata } from 'next';
import { GoldLink } from '@/components/GoldLink';
import { GuideLayout, GuideParagraph } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'Lobisomem online (em breve)',
  description:
    'Um jogo de dedução social no estilo Werewolf/Lobisomem vai entrar na Fortuna. Ainda não está jogável.',
  alternates: { canonical: '/jogos/lobisomem' },
  openGraph: {
    title: 'Lobisomem online (em breve) — Fortuna',
    description:
      'Um jogo de dedução social no estilo Werewolf/Lobisomem vai entrar na Fortuna. Ainda não está jogável.',
  },
};

export default function WerewolfGuidePage() {
  return (
    <GuideLayout title="Lobisomem, em breve">
      <GuideParagraph>
        Noites, papéis secretos e a aldeia tentando descobrir quem mente: um jogo de dedução
        social no estilo Werewolf é candidato certo para a Fortuna, porque o grupo que já se reúne
        numa sala não precisa de outro site só para isso. A mesa ainda não abriu.
      </GuideParagraph>
      <GuideParagraph>
        Por ora, <GoldLink href="/">comece uma sala</GoldLink> com Coup, Xadrez ou Batalha Naval.
      </GuideParagraph>
    </GuideLayout>
  );
}
