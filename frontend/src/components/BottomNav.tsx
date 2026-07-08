import { useLocation, useNavigate } from 'react-router-dom';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonIcon from '@mui/icons-material/Person';

const TABS = [
  { label: 'Home', icon: <HomeIcon />, path: '/home' },
  { label: 'Chat', icon: <ChatIcon />, path: '/chat' },
  { label: 'Records', icon: <DescriptionIcon />, path: '/records' },
  { label: 'Profile', icon: <PersonIcon />, path: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = TABS.findIndex((t) => location.pathname.startsWith(t.path));

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderTop: '1px solid #D9D6CE',
      }}
      elevation={3}
    >
      <BottomNavigation
        value={current >= 0 ? current : 0}
        onChange={(_, v) => navigate(TABS[v].path)}
        showLabels
        sx={{
          '& .MuiBottomNavigationAction-root': {
            color: '#6B7D6B',
            '&.Mui-selected': {
              color: '#7D9B76',
            },
          },
        }}
      >
        {TABS.map((t) => (
          <BottomNavigationAction key={t.label} label={t.label} icon={t.icon} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
