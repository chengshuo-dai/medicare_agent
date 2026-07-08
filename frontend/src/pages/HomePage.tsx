import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  AppBar,
  Toolbar,
  Button,
  Stack,
  Chip,
  Avatar,
} from '@mui/material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import ChatIcon from '@mui/icons-material/Chat';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EventIcon from '@mui/icons-material/Event';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import MedicationOutlinedIcon from '@mui/icons-material/MedicationOutlined';
import { getUserRole } from '../api/auth';

const sagePrimary = '#7D9B76';
const sageText = '#2C3E2D';
const sageBg = '#F8F5F0';
const sageBorder = '#D9D6CE';

function useUserInfo() {
  // Placeholder — replace with real auth context or API call
  const role = getUserRole();
  return {
    name: 'Sarah',
    initials: 'SC',
    role: role || 'patient',
  };
}

export default function HomePage() {
  const navigate = useNavigate();
  const user = useUserInfo();

  const quickActions = [
    { label: 'Chat', icon: <ChatIcon />, path: '/chat' },
    { label: 'Records', icon: <DescriptionOutlinedIcon />, path: '/records' },
    { label: 'Profile', icon: <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: sagePrimary }}>{user.initials}</Avatar>, path: '/profile' },
  ];

  const healthTips = [
    'Stay hydrated — aim for 8 glasses of water daily.',
    'A 30-minute walk can boost your cardiovascular health.',
    'Regular sleep schedule improves immune function.',
    'Deep breathing exercises help reduce stress levels.',
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: sageBg }}>
      {/* Top bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: sageBg,
          borderBottom: `1px solid ${sageBorder}`,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <MedicalServicesIcon sx={{ color: sagePrimary, fontSize: 28 }} />
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, color: sageText, letterSpacing: '-0.3px' }}
            >
              MediCareAI
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" sx={{ color: '#6B7D6B' }}>
              Hi, {user.name}
            </Typography>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                fontSize: '0.8rem',
                bgcolor: sagePrimary,
                fontWeight: 700,
              }}
            >
              {user.initials}
            </Avatar>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Quick action chips */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}
        >
          {quickActions.map((action) => (
            <Chip
              key={action.label}
              icon={action.icon}
              label={action.label}
              onClick={() => navigate(action.path)}
              variant="outlined"
              sx={{
                borderColor: sageBorder,
                color: sageText,
                fontWeight: 500,
                '&:hover': {
                  bgcolor: '#E8F0E6',
                  borderColor: sagePrimary,
                },
              }}
            />
          ))}
        </Stack>

        {/* Bento grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gridTemplateAreas: {
              xs: `
                "consult"
                "reports"
                "appointments"
                "tips"
              `,
              sm: `
                "consult      consult"
                "reports      appointments"
                "tips         appointments"
              `,
              md: `
                "consult      consult      reports"
                "consult      consult      appointments"
                "tips         tips         appointments"
              `,
            },
            gap: 2,
          }}
        >
          {/* Start Consultation — large card */}
          <Card
            sx={{
              gridArea: 'consult',
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: `1px solid ${sageBorder}`,
              background: `linear-gradient(135deg, ${sagePrimary} 0%, #5C7A55 100%)`,
              overflow: 'hidden',
            }}
          >
            <CardActionArea
              onClick={() => navigate('/chat')}
              sx={{ height: '100%', p: 0 }}
            >
              <CardContent sx={{ p: 3, height: '100%' }}>
                <Stack
                  direction="column"
                  justifyContent="space-between"
                  sx={{ height: '100%', minHeight: 180 }}
                >
                  <Box>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.20)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      <ChatIcon sx={{ color: '#FFFFFF', fontSize: 28 }} />
                    </Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                        color: '#FFFFFF',
                        mb: 1,
                      }}
                    >
                      Start Consultation
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}
                    >
                      Describe your symptoms and receive AI-powered analysis, diagnosis suggestions, and personalized health advice.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      mt: 2,
                      bgcolor: '#FFFFFF',
                      color: sagePrimary,
                      fontWeight: 700,
                      borderRadius: 2.5,
                      px: 3,
                      alignSelf: 'flex-start',
                      '&:hover': {
                        bgcolor: '#F0F5EE',
                      },
                    }}
                  >
                    Begin
                  </Button>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>

          {/* Latest Reports */}
          <Card
            sx={{
              gridArea: 'reports',
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: `1px solid ${sageBorder}`,
            }}
          >
            <CardActionArea onClick={() => navigate('/records')} sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <ScienceOutlinedIcon sx={{ color: '#7B6F9B', fontSize: 32, mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: sageText, mb: 0.5 }}>
                  Latest Reports
                </Typography>
                <Typography variant="body2" sx={{ color: '#6B7D6B', lineHeight: 1.5 }}>
                  View your recent lab results, imaging reports, and test summaries.
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 1.5, color: sagePrimary, fontWeight: 600 }}
                >
                  View records &rarr;
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>

          {/* Upcoming Appointments */}
          <Card
            sx={{
              gridArea: 'appointments',
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: `1px solid ${sageBorder}`,
            }}
          >
            <CardActionArea onClick={() => navigate('/followups')} sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <EventIcon sx={{ color: '#F57C00', fontSize: 32, mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: sageText, mb: 0.5 }}>
                  Upcoming Appointments
                </Typography>
                <Typography variant="body2" sx={{ color: '#6B7D6B', lineHeight: 1.5 }}>
                  Track your follow-up plans, doctor visits, and scheduled check-ins.
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 1.5, color: sagePrimary, fontWeight: 600 }}
                >
                  View plans &rarr;
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>

          {/* Health Tips — wide, shorter card */}
          <Card
            sx={{
              gridArea: 'tips',
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: `1px solid ${sageBorder}`,
              bgcolor: '#FFFFFF',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <TipsAndUpdatesIcon sx={{ color: '#5B8C89', fontSize: 24 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: sageText }}>
                  Health Tips
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {healthTips.map((tip, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: sagePrimary,
                        mt: 0.7,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" sx={{ color: '#6B7D6B', lineHeight: 1.5 }}>
                      {tip}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Bottom quick links */}
        <Stack
          direction="row"
          justifyContent="center"
          spacing={3}
          sx={{ mt: 4, mb: 2 }}
        >
          <Button
            startIcon={<MedicationOutlinedIcon />}
            onClick={() => navigate('/reminders')}
            sx={{
              color: sageText,
              fontWeight: 600,
              fontSize: '0.85rem',
              '&:hover': { bgcolor: '#E8F0E6' },
            }}
          >
            Medications
          </Button>
          <Button
            startIcon={<ScienceOutlinedIcon />}
            onClick={() => navigate('/records')}
            sx={{
              color: sageText,
              fontWeight: 600,
              fontSize: '0.85rem',
              '&:hover': { bgcolor: '#E8F0E6' },
            }}
          >
            All Records
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
