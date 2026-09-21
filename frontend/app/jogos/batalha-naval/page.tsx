import type { Metadata } from 'next';
import { GoldLink } from '@/components/GoldLink';
import { GuideLayout, GuideParagraph } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'Batalha naval online multiplayer',
  description:
    'Jogue batalha naval online com um amigo, sem cadastro: posicione a frota e atire pelas coordenadas no navegador.',
  keywords: ['batalha naval online multiplayer', 'batalha naval sem cadastro'],
  alternates: { canonical: '/jogos/batalha-naval' },
  openGraph: {
    title: 'Batalha naval online multiplayer',
    description:
      'Jogue batalha naval online com um amigo, sem cadastro: posicione a frota e atire pelas coordenadas no navegador.',
  },
};

export default function BattleshipGuidePage() {
  return (
    <GuideLayout title="Batalha Naval no navegador">
      <GuideParagraph>
        A Batalha Naval da Fortuna é o mesmo duelo de frotas escondidas, agora com um link no lugar
        do papel quadriculado. Os dois jogadores posicionam os navios no próprio tabuleiro — sem
        sobrepor, sem diagonal — e atiram por coordenadas até restar só um.
      </GuideParagraph>
      <GuideParagraph>
        Quem abre a mesa escolhe o tamanho do mar e o conjunto de navios. Acertos, erros e navios
        afundados aparecem com marcas próprias, e a frota do adversário só se revela quando um
        casco inteiro vai ao fundo. Quem quiser só olhar a partida entra como espectador.
      </GuideParagraph>
      <GuideParagraph>
        Sem cadastro: crie a sala, envie o convite, posicionem as frotas e comecem a atirar.
      </GuideParagraph>
      <GuideParagraph>
        <GoldLink href="/">Criar uma sala</GoldLink>
        {' '}e chamar o outro almirante.
      </GuideParagraph>
    </GuideLayout>
  );
}
