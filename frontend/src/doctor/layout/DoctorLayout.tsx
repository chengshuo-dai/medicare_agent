import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Avatar,
  Button,
  Tooltip,
  CircularProgress,
  IconButton,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import MessageIcon from '@mui/icons-material/Message';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';
import { logout, getMe } from '../../api/auth';
import type { UserInfo } from '../../api/auth';
import { flexRowGap1, flexRowGap2, pageCenter } from '../../styles/sxUtils';

const NAV_ITEMS = [
  { path: '/doctor', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/doctor/cases', label: 'Cases', icon: <PeopleIcon /> },
  { path: '/doctor/messages', label: 'Messages', icon: <MessageIcon /> },
  { path: '/doctor/settings', label: 'Profile', icon: <SettingsIcon /> },
];

function getActiveTab(pathname: string): number {
  // Exact match for /doctor or prefix match for sub-routes
  const idx = NAV_ITEMS.findIndex(
    (item) =>
      pathname === item.path ||
      (item.path !== '/doctor' && pathname.startsWith(item.path)),
  );
  return idx === -1 ? 0 : idx;
}

export default function DoctorLayout() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = getActiveTab(location.pathname);

  useEffect(() => {
    let mounted = true;
    getMe()
      .then((data) => {
        if (mounted) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoading(false);
          navigate('/login');
        }
      });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSwitchToPatient = () => {
    localStorage.setItem('user_role', 'patient');
    navigate('/chat');
  };

  if (loading) {
    return (
      <Box sx={pageCenter}>
        <CircularProgress sx={{ color: '#4A5568' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#EDF0F4' }}>
      {/* Sticky top bar */}
      <AppBar
        position="sticky"
        sx={{
          bgcolor: '#fff',
          color: '#1A202C',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          zIndex: 1100,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 2, sm: 3 }, gap: 2 }}>
          {/* Left: Brand */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#2D3748',
              whiteSpace: 'nowrap',
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}
          >
            MediCareAI Doctor
          </Typography>

          {/* Center: Tab pills */}
          <Tabs
            value={activeTab}
            sx={{
              flexGrow: 1,
              minHeight: 0,
              '& .MuiTabs-flexContainer': { justifyContent: 'center', gap: 0.5 },
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            {NAV_ITEMS.map((item) => (
              <Tab
                key={item.path}
                component={Link}
                to={item.path}
                icon={item.icon}
                iconPosition="start"
                label={item.label}
                sx={{
                  minHeight: 36,
                  py: 0.75,
                  px: 2,
                  borderRadius: '24px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textTransform: 'none',
                  color: '#718096',
                  transition: 'all 0.2s',
                  '&.Mui-selected': {
                    bgcolor: '#4A5568',
                    color: '#fff',
                  },
                  '&:hover:not(.Mui-selected)': {
                    bgcolor: '#EDF0F4',
                    color: '#1A202C',
                  },
                }}
              />
            ))}
          </Tabs>

          {/* Right: User + actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <Tooltip title={user?.name || user?.email || 'Doctor'}>
              <Box sx={{ ...flexRowGap1, display: { xs: 'none', md: 'flex' } }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: '#4A5568',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  {(user?.name || user?.email || 'D')[0].toUpperCase()}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1A202C' }}>
                  {user?.name || user?.email || 'Doctor'}
                </Typography>
              </Box>
            </Tooltip>

            <Button
              variant="outlined"
              size="small"
              startIcon={<SwitchAccountIcon fontSize="small" />}
              onClick={handleSwitchToPatient}
              sx={{
                textTransform: 'none',
                borderColor: '#CBD5E0',
                color: '#718096',
                fontWeight: 500,
                borderRadius: '20px',
                fontSize: '0.8rem',
                px: 1.5,
                '&:hover': {
                  borderColor: '#4A5568',
                  color: '#4A5568',
                  bgcolor: 'rgba(74,85,104,0.04)',
                },
              }}
            >
              Switch to Patient
            </Button>

            <IconButton
              onClick={handleLogout}
              size="small"
              sx={{
                color: '#718096',
                '&:hover': { color: '#C53030', bgcolor: 'rgba(197,48,48,0.06)' },
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Page content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
