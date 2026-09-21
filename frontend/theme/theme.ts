import { createTheme } from '@mui/material/styles';
import { fortunaColors } from './palette';

/**
 * Tema visual de Fortuna. Cores, tipografia e espaçamento vêm todos daqui —
 * nenhum componente deve declarar cor ou fonte diretamente (ver
 * .cursor/rules/00-project-context.mdc e architecture_docs/visual.md).
 *
 * Tipografia é injetada via CSS variables definidas em app/layout.tsx
 * (next/font/google para Cormorant e Lora), referenciadas aqui por nome.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: fortunaColors.gold,
      contrastText: fortunaColors.graphite,
    },
    secondary: {
      main: fortunaColors.graphite,
      contrastText: fortunaColors.ivory,
    },
    error: {
      main: fortunaColors.wine,
    },
    success: {
      main: fortunaColors.olive,
    },
    background: {
      default: fortunaColors.ivory,
      paper: fortunaColors.ivory,
    },
    text: {
      primary: fortunaColors.graphite,
    },
  },
  typography: {
    fontFamily: 'var(--font-lora), Georgia, serif',
    h1: { fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 600 },
    h2: { fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 600 },
    h3: { fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 600 },
    h4: { fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 600 },
    h5: { fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 600 },
    h6: { fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          boxShadow: 'none',
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
      defaultProps: {
        elevation: 0,
      },
    },
    MuiFilledInput: {
      defaultProps: {
        disableUnderline: true,
      },
      styleOverrides: {
        root: {
          backgroundColor: fortunaColors.ivory,
          color: fortunaColors.graphite,
          borderRadius: 4,
          '&:hover': {
            backgroundColor: fortunaColors.ivory,
          },
          '&.Mui-focused': {
            backgroundColor: fortunaColors.ivory,
          },
        },
        input: {
          color: fortunaColors.graphite,
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
    },
  },
});
