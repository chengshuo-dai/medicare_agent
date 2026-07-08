import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  IconButton,
  InputAdornment,
  Snackbar,
  Alert,
  Link,
  CircularProgress,
  useTheme,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, getMe } from '../api/auth';

const sagePrimary = '#7D9B76';
const sagePrimaryDark = '#5C7A55';
const sageText = '#2C3E2D';
const sageBg = '#F8F5F0';

const LoginPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'success';
  }>({
    open: false,
    message: '',
    severity: 'error',
  });

  useEffect(() => {
    const msg = (location.state as { message?: string } | null)?.message;
    if (msg) {
      setSnackbar({ open: true, message: msg, severity: 'success' });
      window.history.replaceState({}, '');
    }
    const params = new URLSearchParams(location.search);
    if (params.get('verified') === 'true') {
      setSnackbar({ open: true, message: 'Email verified successfully! Please sign in to your account.', severity: 'success' });
      window.history.replaceState({}, '', '/login');
    }
    if (params.get('doctor_confirmed') === 'true') {
      setSnackbar({ open: true, message: 'Doctor certification confirmed! Please sign in to your account.', severity: 'success' });
      window.history.replaceState({}, '', '/login');
    }
  }, [location.state, location.search]);

  const handleTogglePassword = () => setShowPassword((prev) => !prev);

  const handleCloseSnackbar = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setSnackbar({
        open: true,
        message: 'Please enter your email and password',
        severity: 'error',
      });
      return;
    }
    setLoading(true);
    try {
      await login({ email: email.trim(), password, role: 'patient' });
      // Migrate any guest data to the user account
      import('../api/agent').then(m => m.migrateGuestData()).catch(() => {});
      const user = await getMe();
      const role = user.role;
      const routes: Record<string, string> = {
        patient: '/chat',
        doctor: '/doctor',
        admin: '/admin',
      };
      navigate(routes[role] || '/chat', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed, please try again later';
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: sageBg,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
        p: 2,
      }}
    >
      {/* Decorative background circles */}
      <Box
        sx={{
          position: 'absolute',
          top: '-15%',
          left: '-8%',
          width: { xs: 260, md: 420 },
          height: { xs: 260, md: 420 },
          borderRadius: '50%',
          bgcolor: 'rgba(125,155,118,0.08)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: { xs: 200, md: 340 },
          height: { xs: 200, md: 340 },
          borderRadius: '50%',
          bgcolor: 'rgba(125,155,118,0.06)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-12%',
          left: '20%',
          width: { xs: 280, md: 500 },
          height: { xs: 280, md: 500 },
          borderRadius: '50%',
          bgcolor: 'rgba(180,185,175,0.07)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-8%',
          right: '-5%',
          width: { xs: 180, md: 280 },
          height: { xs: 180, md: 280 },
          borderRadius: '50%',
          bgcolor: 'rgba(125,155,118,0.05)',
          pointerEvents: 'none',
        }}
      />

      {/* Centered Card */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 400,
          p: { xs: 3.5, sm: 5 },
          borderRadius: 5,
          bgcolor: '#fff',
          boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo / Icon */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${sagePrimary} 0%, ${sagePrimaryDark} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(125,155,118,0.3)',
            }}
          >
            <MedicalServicesIcon sx={{ fontSize: 30, color: '#fff' }} />
          </Box>
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            mb: 0.5,
            color: sageText,
            textAlign: 'center',
            letterSpacing: '-0.02em',
            fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
          }}
        >
          Welcome Back
        </Typography>
        <Typography
          variant="body2"
          sx={{
            mb: 4,
            color: '#6B7D6B',
            textAlign: 'center',
            lineHeight: 1.6,
            fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
          }}
        >
          Please sign in to your account
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            id="email-input"
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            autoComplete="email"
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email sx={{ color: sagePrimary }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                '& fieldset': { borderColor: 'rgba(125,155,118,0.25)' },
                '&:hover fieldset': { borderColor: sagePrimary },
                '&.Mui-focused fieldset': { borderColor: sagePrimary },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: sagePrimaryDark },
            }}
          />
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            autoComplete="current-password"
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ color: sagePrimary }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleTogglePassword}
                    edge="end"
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                '& fieldset': { borderColor: 'rgba(125,155,118,0.25)' },
                '&:hover fieldset': { borderColor: sagePrimary },
                '&.Mui-focused fieldset': { borderColor: sagePrimary },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: sagePrimaryDark },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{
              py: 1.5,
              borderRadius: 3,
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              bgcolor: sagePrimary,
              boxShadow: '0 4px 14px rgba(125,155,118,0.3)',
              '&:hover': { bgcolor: sagePrimaryDark, boxShadow: '0 6px 20px rgba(125,155,118,0.4)' },
              fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Login'
            )}
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography
            variant="body2"
            sx={{
              color: '#6B7D6B',
              fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
            }}
          >
            Didn't receive verification email?{' '}
            <Link
              component="button"
              type="button"
              onClick={async () => {
                const emailEl = (document.getElementById('email-input') as HTMLInputElement)?.value;
                if (!emailEl) { setSnackbar({ open: true, message: 'Please enter your email address first', severity: 'error' }); return; }
                try {
                  const res = await fetch(`${import.meta.env.VITE_API_BASE || '/api/v1'}/auth/resend-verification`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailEl }),
                  });
                  const json = await res.json();
                  setSnackbar({ open: true, message: json.message || 'Sent', severity: res.ok ? 'success' : 'error' });
                } catch { setSnackbar({ open: true, message: 'Request failed, please try again later', severity: 'error' }); }
              }}
              sx={{
                color: sagePrimary,
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline', color: sagePrimaryDark },
              }}
            >
              Resend verification email
            </Link>
          </Typography>
        </Box>

        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Typography
            variant="body2"
            sx={{
              color: '#6B7D6B',
              fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
            }}
          >
            Don't have an account?{' '}
            <Link
              component="button"
              type="button"
              onClick={() => navigate('/register')}
              sx={{
                color: sagePrimary,
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline', color: sagePrimaryDark },
              }}
            >
              Sign Up
            </Link>
          </Typography>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{
            width: '100%',
            borderRadius: 2,
            fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginPage;
