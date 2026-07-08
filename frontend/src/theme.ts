import { createTheme } from '@mui/material/styles';

export const patientTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#7D9B76',
      light: '#A3B899',
      dark: '#5C7A55',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#9B8E7E',
      light: '#C4B9A8',
      dark: '#6B5E4E',
    },
    background: {
      default: '#F8F5F0',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2C3E2D',
      secondary: '#6B7D6B',
    },
    divider: '#D9D6CE',
    error: { main: '#D32F2F' },
    warning: { main: '#F57C00' },
    success: { main: '#388E3C' },
    info: { main: '#5B8C89' },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
    h6: { fontWeight: 600, fontSize: '1.1rem' },
    subtitle1: { fontWeight: 500, fontSize: '0.95rem' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.6 },
    caption: { fontSize: '0.75rem', color: '#6B7D6B' },
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
          '& fieldset': { borderColor: '#D9D6CE' },
          '&:hover fieldset': { borderColor: '#7D9B76' },
          '&.Mui-focused fieldset': { borderColor: '#7D9B76' },
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

export default patientTheme;
