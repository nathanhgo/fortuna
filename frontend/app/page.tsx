import Image from 'next/image';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CreateRoomForm } from '@/components/CreateRoomForm';
import { GameCoverCard } from '@/components/GameCoverCard';
import { GAME_CATALOG } from '@/lib/catalog';
import { fortunaColors } from '@/theme/palette';

export default function HomePage() {
  return (
    <Box component="main" sx={{ bgcolor: fortunaColors.graphite, minHeight: '100%' }}>
      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Stack component="div" spacing={4} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Image
            src="/images/logo/fortuna-logo-transparent.png"
            alt="Fortuna"
            width={120}
            height={120}
            priority
          />
          <Stack component="div" spacing={1.5}>
            <Typography variant="h1" component="h1" sx={{ color: fortunaColors.ivory, fontSize: { xs: '2.75rem', md: '3.5rem' } }}>
              Fortuna
            </Typography>
            <Typography variant="body1" sx={{ color: fortunaColors.ivory, opacity: 0.85, maxWidth: 480, mx: 'auto' }}>
              Crie uma sala, convide seus amigos com um link e joguem juntos direto no navegador.
              Sem cadastro, sem instalar nada.
            </Typography>
          </Stack>
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <CreateRoomForm />
          </Box>
        </Stack>

        <Stack component="div" spacing={3} sx={{ mt: { xs: 8, md: 12 } }}>
          <Typography variant="h4" component="h2" sx={{ color: fortunaColors.ivory, textAlign: 'center' }}>
            Os jogos
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 3,
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
        </Stack>
      </Container>
    </Box>
  );
}
