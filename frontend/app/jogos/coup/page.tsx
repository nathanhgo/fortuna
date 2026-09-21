import type { Metadata } from 'next';
import { GoldLink } from '@/components/GoldLink';
import { GuideLayout, GuideParagraph } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'Coup online',
  description:
    'Jogue Coup no navegador com amigos: blefe, contestação, golpe e a expansão Reformation, sem cadastro.',
  keywords: ['coup online', 'coup multiplayer sem cadastro'],
  alternates: { canonical: '/jogos/coup' },
  openGraph: {
    title: 'Coup online',
    description:
      'Jogue Coup no navegador com amigos: blefe, contestação, golpe e a expansão Reformation, sem cadastro.',
  },
};

export default function CoupGuidePage() {
  return (
    <GuideLayout title="Coup online, com a corte na mesa">
      <GuideParagraph>
        Coup é o jogo de influência em que quase tudo pode ser mentira — até alguém contestar.
        Na Fortuna a mesa cabe no navegador: cada jogador vê só as próprias cartas, o verso dourado
        cobre a mão dos outros, e o histórico da rodada fica visível para a sala inteira.
      </GuideParagraph>
      <GuideParagraph>
        As regras seguem o jogo-base (Duque, Assassino, Capitão, Embaixador e Condessa), com a
        quantidade de cópias configurável. Quem senta primeiro decide se a Reformation entra, se o
        Inquisidor substitui o Embaixador, e quantas pessoas cabem na corte. Renda, ajuda externa,
        imposto, assassinato, roubo, troca com a corte e golpe estão todos na mesa, inclusive o
        blefe de uma carta que você não tem — se ninguém acusar, vale.
      </GuideParagraph>
      <GuideParagraph>
        Não precisa de conta. Abra uma sala, chame o grupo pelo link e sentem à corte.
      </GuideParagraph>
      <GuideParagraph>
        <GoldLink href="/">Começar uma sala</GoldLink>
        {' '}para a próxima rodada de Coup.
      </GuideParagraph>
    </GuideLayout>
  );
}
