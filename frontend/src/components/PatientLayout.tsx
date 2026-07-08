import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import BottomNav from './BottomNav';

export default function PatientLayout() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8F5F0', pb: 8 }}>
      <Outlet />
      <BottomNav />
    </Box>
  );
}
