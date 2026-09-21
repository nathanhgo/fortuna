'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { ChatDialog } from '@/components/ChatDialog';
import { instanceIdFromPath, roomCodeFromPath } from '@/lib/roomPath';
import { fortunaColors } from '@/theme/palette';

export function SiteHeader() {
  const pathname = usePathname() ?? '/';
  const roomCode = roomCodeFromPath(pathname);
  const instanceId = instanceIdFromPath(pathname);
  const [chatOpen, setChatOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  function closeMenu() {
    setMenuAnchor(null);
  }

  return (
    <>
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          bgcolor: fortunaColors.graphite,
          borderBottom: `1px solid ${fortunaColors.gold}55`,
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            py: 0.75,
            px: { xs: 2, sm: 3 },
          }}
        >
          <Box
            component={Link}
            href="/"
            aria-label="Fortuna, ir para a página inicial"
            sx={{ display: 'flex', alignItems: 'center', lineHeight: 0 }}
          >
            <Image
              src="/images/logo/fortuna-logo-transparent.png"
              alt=""
              width={40}
              height={40}
              priority
            />
          </Box>
          <Stack
            component="nav"
            direction="row"
            spacing={0.5}
            aria-label="Menu"
            sx={{ display: { xs: 'none', md: 'flex' } }}
          >
            <Button
              component={Link}
              href="/perfil"
              sx={{ color: fortunaColors.ivory, minWidth: 0, px: 1.5 }}
            >
              Perfil
            </Button>
            <Button
              onClick={() => setChatOpen(true)}
              sx={{ color: fortunaColors.ivory, minWidth: 0, px: 1.5 }}
            >
              Chat
            </Button>
          </Stack>
          <IconButton
            aria-label="Abrir menu"
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            sx={{
              display: { xs: 'inline-flex', md: 'none' },
              color: fortunaColors.ivory,
            }}
          >
            <Box
              aria-hidden
              sx={{
                width: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <Box sx={{ height: '2px', bgcolor: fortunaColors.ivory }} />
              <Box sx={{ height: '2px', bgcolor: fortunaColors.ivory }} />
              <Box sx={{ height: '2px', bgcolor: fortunaColors.ivory }} />
            </Box>
          </IconButton>
        </Container>
      </Box>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        disableRestoreFocus
        slotProps={{ paper: { sx: { bgcolor: fortunaColors.ivory, minWidth: 160 } } }}
      >
        <MenuItem component={Link} href="/perfil" onClick={closeMenu}>
          Perfil
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu();
            setChatOpen(true);
          }}
        >
          Chat
        </MenuItem>
      </Menu>
      {chatOpen ? (
        <ChatDialog
          open
          onClose={() => setChatOpen(false)}
          roomCode={roomCode}
          initialInstanceId={instanceId}
        />
      ) : null}
    </>
  );
}
