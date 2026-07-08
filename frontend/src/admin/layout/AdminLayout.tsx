import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Button,
  CircularProgress,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PeopleIcon from '@mui/icons-material/People';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HistoryIcon from '@mui/icons-material/History';
import BarChartIcon from '@mui/icons-material/BarChart';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EmailIcon from '@mui/icons-material/Email';
import LogoutIcon from '@mui/icons-material/Logout';
import { logout, getMe } from '../../api/admin';
import AdminLoginPage from '../pages/AdminLoginPage';
import ChangePasswordPage from '../pages/ChangePasswordPage';
import { pageCenter } from '../../styles/sxUtils';

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/admin/users', label: 'Users', icon: <PeopleIcon /> },
  { path: '/admin/doctors', label: 'Doctors', icon: <LocalHospitalIcon /> },
  { path: '/admin/providers', label: 'LLM', icon: <SmartToyIcon /> },
  { path: '/admin/knowledge', label: 'Knowledge', icon: <MenuBookIcon /> },
  { path: '/admin/reviews', label: 'Review', icon: <AssignmentIcon /> },
  { path: '/admin/audit-logs', label: 'Audit', icon: <HistoryIcon /> },
  { path: '/admin/observability', label: 'Observability', icon: <BarChartIcon /> },
  { path: '/admin/notifications', label: 'Notifications', icon: <NotificationsActiveIcon /> },
  { path: '/admin/email', label: 'Email', icon: <EmailIcon /> },
  { path: '/admin/settings', label: 'Settings', icon: <SettingsIcon /> },
];

function getActiveTab(pathname: string): number {
  const idx = NAV_ITEMS.findIndex(
    (item) =>
      pathname === item.path ||
      (item.path !== '/admin' && pathname.startsWith(item.path)),
  );
  return idx === -1 ? 0 : idx;
}

export default function AdminLayout() {
  const [authState, setAuthState] = useState(() => {
    const token = localStorage.getItem('access_token');
    return {
      checked: !token,
      authenticated: !!token,
      needPasswordChange: false,
    };
  });
  const navigate = useNavigate();
  const location = useLocation();

  const { checked: authChecked, authenticated: isAuthenticated, needPasswordChange } = authState;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return;
    }
    getMe()
      .then((user) => {
        setAuthState({
          checked: true,
          authenticated: true,
          needPasswordChange:
            user.password_change_required ||
            localStorage.getItem('password_change_required') === 'true',
        });
      })
      .catch(() => {
        logout();
        setAuthState({ checked: true, authenticated: false, needPasswordChange: false });
      });
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setAuthState({ checked: true, authenticated: false, needPasswordChange: false });
    navigate('/admin');
  };

  const activeTab = getActiveTab(location.pathname);

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <Box sx={pageCenter}>
        <CircularProgress />
      </Box>
    );
  }

  // Not authenticated → show login page
  if (!isAuthenticated) {
    return <AdminLoginPage />;
  }

  // Authenticated but need password change → show change password page
  if (needPasswordChange) {
    return <ChangePasswordPage />;
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
        <Toolbar
          sx={{
            minHeight: { xs: 56, sm: 64 },
            px: { xs: 2, sm: 3 },
            gap: 2,
          }}
        >
          {/* Left: Brand */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#2D3748',
              whiteSpace: 'nowrap',
              fontSize: { xs: '0.95rem', sm: '1.15rem' },
              flexShrink: 0,
            }}
          >
            MediCareAI Admin
          </Typography>

          {/* Center: Scrollable tab pills */}
          <Box
            sx={{
              flexGrow: 1,
              overflowX: 'auto',
              display: 'flex',
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E0', borderRadius: 4 },
            }}
          >
            <Tabs
              value={activeTab}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: 0,
                flexShrink: 0,
                '& .MuiTabs-flexContainer': { gap: 0.5 },
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
                    px: 1.75,
                    borderRadius: '24px',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    textTransform: 'none',
                    color: '#718096',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    '&.Mui-selected': {
                      bgcolor: '#2D3748',
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
          </Box>

          {/* Right: Logout */}
          <Button
            variant="text"
            size="small"
            startIcon={<LogoutIcon fontSize="small" />}
            onClick={handleLogout}
            sx={{
              textTransform: 'none',
              color: '#718096',
              fontWeight: 500,
              borderRadius: '20px',
              fontSize: '0.8rem',
              flexShrink: 0,
              '&:hover': { color: '#C53030', bgcolor: 'rgba(197,48,48,0.06)' },
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* Page content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
