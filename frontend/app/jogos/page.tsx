import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { GameCoverCard } from '@/components/GameCoverCard';
import { GoldLink } from '@/components/GoldLink';
import { GuideLayout, GuideParagraph } from '@/components/GuideLayout';
import { GAME_CATALOG } from '@/lib/catalog';
import { fortunaColors } from '@/theme/palette';

export const metadata: Metadata = {
  title: 'Jogos de mesa online',
  description:
    'Jogue Xadrez, Coup e Batalha Naval online com amigos, sem cadastro. Truco, Lobisomem, Damas e Dominó entram em breve.',
  alternates: { canonical: '/jogos' },
  openGraph: {
    title: 'Jogos de mesa online — Fortuna',
    description:
      'Jogue Xadrez, Coup e Batalha Naval online com amigos, sem cadastro. Truco, Lobisomem, Damas e Dominó entram em breve.',
  },
};

export default function JogosIndexPage() {
  return (
    <GuideLayout title="Os jogos da Fortuna">
      <GuideParagraph>
        A Fortuna reúne versões digitais de jogos que vocês já jogam na mesa. Crie uma sala, mande
        o link e cada um entra no navegador com um nome — sem conta, sem aplicativo.
      </GuideParagraph>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 3,
          pt: 2,
        }}
      >
        {GAME_CATALOG.map((game) => (
          <GameCoverCard
            key={game.slug}
            name={game.name}
            cover={game.cover}
            description={game.description}
            href={game.path}
            comingSoon={!game.available}
          />
        ))}
      </Box>
      <Stack spacing={1} sx={{ pt: 2 }}>
        <Typography variant="body2" sx={{ color: fortunaColors.ivory, opacity: 0.7 }}>
          <GoldLink href="/">Voltar ao início</GoldLink>
          {' · '}criar uma sala e começar a jogar.
        </Typography>
      </Stack>
    </GuideLayout>
  );
}
