import Box from '@mui/material/Box';
import { BattleshipGame } from '@/components/battleship/BattleshipGame';
import { fortunaColors } from '@/theme/palette';

export default async function BattleshipPage({
  params,
}: {
  params: Promise<{ code: string; instanceId: string }>;
}) {
  const { code, instanceId } = await params;

  return (
    <Box component="main" sx={{ bgcolor: fortunaColors.graphite, minHeight: '100%', py: 4 }}>
      <BattleshipGame code={code.toUpperCase()} instanceId={instanceId} />
    </Box>
  );
}
