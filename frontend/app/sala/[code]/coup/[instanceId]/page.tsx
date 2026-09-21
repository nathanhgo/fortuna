import Box from '@mui/material/Box';
import { CoupGame } from '@/components/coup/CoupGame';
import { fortunaColors } from '@/theme/palette';

export default async function CoupPage({
  params,
}: {
  params: Promise<{ code: string; instanceId: string }>;
}) {
  const { code, instanceId } = await params;

  return (
    <Box component="main" sx={{ bgcolor: fortunaColors.graphite, minHeight: '100%', py: 4, px: { xs: 2, sm: 3 } }}>
      <CoupGame code={code.toUpperCase()} instanceId={instanceId} />
    </Box>
  );
}
