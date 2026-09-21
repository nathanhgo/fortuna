import Image from 'next/image';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CreateRoomForm } from '@/components/CreateRoomForm';
import { fortunaColors } from '@/theme/palette';

const games = [
  {
    name: 'Xadrez',
    cover: '/images/game-covers/chess-cover.png',
    description:
      'Escolha entre a partida fiel ao tabuleiro físico ou o modo assistido, com dicas, notação e relógio.',
  },
  {
    name: 'Coup',
    cover: '/images/game-covers/coup-cover.png',
    description:
      'Blefe, acuse e conquiste a corte. Configure quais personagens entram na mesa antes de começar.',
  },
  {
    name: 'Batalha Naval',
    cover: '/images/game-covers/battleship-cover.png',
    description: 'Posicione sua frota e ataque as coordenadas do adversário até afundar tudo.',
  },
];

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
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {games.map((game) => (
              <Stack
                key={game.name}
                component="div"
                spacing={1.5}
                sx={{
                  border: `1px solid ${fortunaColors.gold}33`,
                  p: 2,
                  bgcolor: fortunaColors.ivory,
                }}
              >
                <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3' }}>
                  <Image
                    src={game.cover}
                    alt={`Ilustração do jogo ${game.name}`}
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </Box>
                <Typography variant="h5" component="h3" sx={{ color: fortunaColors.graphite }}>
                  {game.name}
                </Typography>
                <Typography variant="body2" sx={{ color: fortunaColors.graphite, opacity: 0.8 }}>
                  {game.description}
                </Typography>
              </Stack>
            ))}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
