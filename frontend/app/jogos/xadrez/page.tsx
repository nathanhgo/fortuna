import type { Metadata } from 'next';
import { GoldLink } from '@/components/GoldLink';
import { GuideLayout, GuideParagraph } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'Jogar xadrez online com amigos sem cadastro',
  description:
    'Abra uma sala na Fortuna e jogue xadrez no navegador, no modo realista ou assistido, sem criar conta.',
  keywords: ['jogar xadrez online com amigos sem cadastro', 'xadrez online multiplayer'],
  alternates: { canonical: '/jogos/xadrez' },
  openGraph: {
    title: 'Jogar xadrez online com amigos sem cadastro',
    description:
      'Abra uma sala na Fortuna e jogue xadrez no navegador, no modo realista ou assistido, sem criar conta.',
  },
};

export default function XadrezGuidePage() {
  return (
    <GuideLayout title="Xadrez online, do jeito da mesa">
      <GuideParagraph>
        O xadrez da Fortuna existe para o grupo que já se senta diante de um tabuleiro físico e
        agora está espalhado. Você cria uma sala, manda o link, cada pessoa escolhe um nome e a
        partida começa — sem cadastro e sem baixar nada.
      </GuideParagraph>
      <GuideParagraph>
        Há dois jeitos de jogar. No modo realista o tabuleiro se comporta como o de madeira: nada
        aponta as casas legais, o xeque não aparece escrito na tela, e um lance que deixa o rei
        exposto simplesmente perde a partida, como quem tira a mão da peça. No modo assistido
        entram dicas de movimento, relógio configurável, notação da partida e setas de planejamento
        com o botão direito, para quem prefere o apoio de um cliente moderno.
      </GuideParagraph>
      <GuideParagraph>
        Quem chega primeiro na mesa define essas regras. Quem entra depois joga ou assiste. O
        estado fica na sala, então recarregar o navegador não apaga o jogo.
      </GuideParagraph>
      <GuideParagraph>
        <GoldLink href="/">Crie uma sala</GoldLink>
        {' '}e convide quem costuma sentar do outro lado do tabuleiro.
      </GuideParagraph>
    </GuideLayout>
  );
}
