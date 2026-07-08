import { createTheme } from '@mui/material/styles';

/**
 * Doctor portal theme — Steel Indigo
 * Primary: #4A5568
 * Background: #EDF0F4
 */
export const doctorTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4A5568',
      light: '#7B8DAA',
      dark: '#2D3748',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#718096',
      light: '#A0AEC0',
      dark: '#4A5568',
    },
    background: {
      default: '#EDF0F4',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A202C',
      secondary: '#718096',
    },
    divider: '#CBD5E0',
    error: { main: '#C53030' },
    warning: { main: '#C05621' },
    success: { main: '#2F855A' },
    info: { main: '#2B6CB0' },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
    h6: { fontWeight: 600, fontSize: '1.1rem' },
    subtitle1: { fontWeight: 500, fontSize: '0.95rem' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.6 },
    caption: { fontSize: '0.75rem', color: '#718096' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '& fieldset': { borderColor: '#CBD5E0' },
          '&:hover fieldset': { borderColor: '#4A5568' },
          '&.Mui-focused fieldset': { borderColor: '#4A5568' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 500,
        },
      },
    },
  },
});

export default doctorTheme;
