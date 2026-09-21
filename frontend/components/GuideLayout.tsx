'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fortunaColors } from '@/theme/palette';

export function GuideLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box component="main" sx={{ bgcolor: fortunaColors.graphite, minHeight: '100%' }}>
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={3}>
          <Typography
            variant="h1"
            component="h1"
            sx={{ color: fortunaColors.ivory, fontSize: { xs: '2.2rem', md: '3rem' } }}
          >
            {title}
          </Typography>
          {children}
        </Stack>
      </Container>
    </Box>
  );
}

export function GuideParagraph({ children }: { children: ReactNode }) {
  return (
    <Typography sx={{ color: fortunaColors.ivory, opacity: 0.9, fontSize: '1.05rem' }}>
      {children}
    </Typography>
  );
}
