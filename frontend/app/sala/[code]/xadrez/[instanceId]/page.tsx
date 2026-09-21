import Box from '@mui/material/Box';
import { ChessGame } from '@/components/chess/ChessGame';
import { fortunaColors } from '@/theme/palette';

export default async function ChessPage({
  params,
}: {
  params: Promise<{ code: string; instanceId: string }>;
}) {
  const { code, instanceId } = await params;

  return (
    <Box component="main" sx={{ bgcolor: fortunaColors.graphite, minHeight: '100%', py: 4, px: { xs: 2, sm: 3 } }}>
      <ChessGame code={code.toUpperCase()} instanceId={instanceId} />
    </Box>
  );
}
