import { Box, Typography, Button, Chip, LinearProgress } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import type { GuestStatus } from '../types/agent';
import { flexRowGap15 } from '../styles/sxUtils';


interface Props {
  status: GuestStatus | null;
  onRegister: () => void;
  onLogin: () => void;
}

export default function GuestBanner({ status, onRegister, onLogin }: Props) {
  if (!status) return null;

  const progress = status.max_interactions > 0
    ? ((status.max_interactions - status.remaining) / status.max_interactions) * 100
    : 100;
  const isExhausted = status.remaining <= 0 && status.interaction_count > 0;

  return (
    <Box sx={{ bgcolor: isExhausted ? '#FFF3E0' : '#F0F3EE', borderBottom: '1px solid #D9D6CE', px: 2, py: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={flexRowGap15}>
          <Chip label="Guest Mode" size="small"
            sx={{ bgcolor: isExhausted ? '#E65100' : '#D9D6CE', color: isExhausted ? '#fff' : '#2C3E2D', fontWeight: 500, fontSize: 12 }} />
          <Typography variant="body2" color={isExhausted ? 'error' : 'text.secondary'}>
            {isExhausted
              ? 'Free consultation used — register to continue'
              : `${status.remaining} free consultation${status.remaining !== 1 ? 's' : ''} remaining`}
          </Typography>
          {isExhausted && (
            <Typography variant="caption" color="error" sx={{ fontWeight: 500 }}>
              ⚠️ Quota exhausted, please register to continue
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<LoginIcon fontSize="small" />} onClick={onLogin}
            sx={{ borderColor: '#7D9B76', color: '#7D9B76', textTransform: 'none', borderRadius: 2, '&:hover': { borderColor: '#5C7A55', bgcolor: '#F0F3EE' } }}>
            Login
          </Button>
          <Button size="small" variant="contained" startIcon={<PersonAddIcon fontSize="small" />} onClick={onRegister}
            sx={{ bgcolor: '#7D9B76', textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: '#5C7A55' } }}>
            Register
          </Button>
        </Box>
      </Box>

      <LinearProgress variant="determinate" value={progress}
        sx={{ mt: 1, height: 4, borderRadius: 2, bgcolor: '#D9D6CE', '& .MuiLinearProgress-bar': { bgcolor: isExhausted ? '#D32F2F' : '#7D9B76', borderRadius: 2 } }} />
    </Box>
  );
}