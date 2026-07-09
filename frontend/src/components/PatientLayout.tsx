import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import BottomNav from './BottomNav';

export default function PatientLayout() {
  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: '#F8F5F0', overflow: 'hidden' }}>
      <Outlet />
      <BottomNav />
    </Box>
  );
}
