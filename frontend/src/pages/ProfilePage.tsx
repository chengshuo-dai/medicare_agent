import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Avatar,
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getUserRole } from '../api/auth';

const sagePrimary = '#7D9B76';
const sageText = '#2C3E2D';
const sageBg = '#F8F5F0';
const sageBorder = '#D9D6CE';

/** Placeholder — replace with real auth user data hook */
function useUserInfo() {
  return {
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    role: getUserRole() || 'patient',
    initials: 'SC',
  };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useUserInfo();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleSwitchRole = () => {
    // Navigate to doctor portal or back to patient
    if (user.role === 'patient') {
      navigate('/doctor');
    } else {
      navigate('/chat');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const menuItems = [
    {
      label: 'Settings',
      icon: <SettingsOutlinedIcon sx={{ color: sagePrimary }} />,
      onClick: () => navigate('/profile/settings'),
    },
    {
      label: user.role === 'patient' ? 'Switch to Doctor' : 'Switch to Patient',
      icon: <SwapHorizIcon sx={{ color: sagePrimary }} />,
      onClick: handleSwitchRole,
      trailing: (
        <Chip
          label={user.role === 'patient' ? 'Doctor' : 'Patient'}
          size="small"
          sx={{
            bgcolor: '#E8F0E6',
            color: sagePrimary,
            fontWeight: 600,
            fontSize: '0.7rem',
            height: 22,
          }}
        />
      ),
    },
    {
      label: 'Logout',
      icon: <LogoutIcon sx={{ color: '#D32F2F' }} />,
      onClick: () => setLogoutOpen(true),
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: sageBg }}>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        {/* Avatar and user info */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 4,
            pt: 2,
          }}
        >
          <Avatar
            sx={{
              width: 88,
              height: 88,
              bgcolor: sagePrimary,
              fontSize: '2rem',
              fontWeight: 700,
              mb: 2,
              boxShadow: '0 4px 16px rgba(125,155,118,0.30)',
            }}
          >
            {user.initials}
          </Avatar>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: sageText, mb: 0.5 }}
          >
            {user.name}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7D6B' }}>
            {user.email}
          </Typography>
          <Chip
            label={user.role === 'patient' ? 'Patient' : user.role === 'doctor' ? 'Doctor' : user.role}
            size="small"
            sx={{
              mt: 1,
              bgcolor: '#E8F0E6',
              color: sagePrimary,
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        </Box>

        {/* Menu items */}
        <Paper
          sx={{
            borderRadius: 3,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            border: `1px solid ${sageBorder}`,
            overflow: 'hidden',
          }}
        >
          <List disablePadding>
            {menuItems.map((item, index) => (
              <Box key={item.label}>
                {index > 0 && <Divider sx={{ borderColor: sageBorder }} />}
                <ListItemButton
                  onClick={item.onClick}
                  sx={{
                    px: 2.5,
                    py: 1.8,
                    '&:hover': { bgcolor: '#F3F1EC' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color: sageText,
                      fontSize: '0.95rem',
                    }}
                  />
                  {item.trailing ?? (
                    <ChevronRightIcon sx={{ color: '#C4B9A8', fontSize: 20 }} />
                  )}
                </ListItemButton>
              </Box>
            ))}
          </List>
        </Paper>

        {/* Logout confirmation dialog */}
        <Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)}>
          <DialogTitle sx={{ color: sageText, fontWeight: 700 }}>
            Confirm Logout
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: '#6B7D6B' }}>
              Are you sure you want to log out? Any unsaved progress will be lost.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setLogoutOpen(false)}
              sx={{ color: '#6B7D6B', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogout}
              variant="contained"
              sx={{
                bgcolor: '#D32F2F',
                '&:hover': { bgcolor: '#B71C1C' },
                borderRadius: 2,
                px: 3,
              }}
            >
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
