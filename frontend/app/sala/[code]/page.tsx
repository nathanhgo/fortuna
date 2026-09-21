import Box from '@mui/material/Box';
import { RoomLobby } from '@/components/RoomLobby';
import { fortunaColors } from '@/theme/palette';

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return (
    <Box component="main" sx={{ bgcolor: fortunaColors.graphite, minHeight: '100%', py: 4, px: { xs: 2, sm: 3 } }}>
      <RoomLobby code={code.toUpperCase()} />
    </Box>
  );
}
