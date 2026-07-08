import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Stack,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EventNoteIcon from '@mui/icons-material/EventNote';
import MedicationIcon from '@mui/icons-material/Medication';
import ScienceIcon from '@mui/icons-material/Science';
import HistoryIcon from '@mui/icons-material/History';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const sagePrimary = '#7D9B76';
const sageText = '#2C3E2D';
const sageBg = '#F8F5F0';
const sageBorder = '#D9D6CE';

interface RecordCard {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  path: string;
  area: string;
}

const RECORD_CARDS: RecordCard[] = [
  {
    title: 'Health Profile',
    subtitle: 'Personal info, allergies, chronic conditions',
    icon: <FavoriteIcon sx={{ fontSize: 36, color: '#D32F2F' }} />,
    path: '/health',
    area: 'profile',
  },
  {
    title: 'Follow-up Plans',
    subtitle: 'Your active treatment and recovery plans',
    icon: <EventNoteIcon sx={{ fontSize: 36, color: '#F57C00' }} />,
    path: '/followups',
    area: 'followup',
  },
  {
    title: 'Medications',
    subtitle: 'Current prescriptions and reminders',
    icon: <MedicationIcon sx={{ fontSize: 36, color: '#5B8C89' }} />,
    path: '/reminders',
    area: 'meds',
  },
  {
    title: 'Lab Reports',
    subtitle: 'Blood work, imaging, and test results',
    icon: <ScienceIcon sx={{ fontSize: 36, color: '#7B6F9B' }} />,
    path: '/chat',
    area: 'labs',
  },
  {
    title: 'Diagnosis History',
    subtitle: 'Past diagnoses and consultation records',
    icon: <HistoryIcon sx={{ fontSize: 36, color: '#9B8E7E' }} />,
    path: '/chat',
    area: 'history',
  },
];

function RecordGridCard({ card }: { card: RecordCard }) {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        gridArea: card.area,
        borderRadius: 3,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        border: `1px solid ${sageBorder}`,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
        },
      }}
    >
      <CardActionArea
        onClick={() => navigate(card.path)}
        sx={{ height: '100%', p: 0 }}
      >
        <CardContent
          sx={{
            p: 3,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Box sx={{ mb: 1.5 }}>{card.icon}</Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: sageText, mb: 0.5 }}
            >
              {card.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7D6B', lineHeight: 1.5 }}>
              {card.subtitle}
            </Typography>
          </Box>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="flex-end"
            sx={{ mt: 1.5 }}
          >
            <ArrowForwardIosIcon
              sx={{ fontSize: 16, color: sagePrimary, opacity: 0.7 }}
            />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function RecordsPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: sageBg }}>
      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Page header */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: sageText,
              fontSize: { xs: '1.6rem', sm: '2rem' },
            }}
          >
            Health Records
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7D6B', mt: 0.5 }}>
            View and manage all your health information
          </Typography>
        </Box>

        {/* Bento grid — asymmetric CSS grid layout */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gridTemplateRows: 'auto',
            gridTemplateAreas: {
              xs: `
                "profile"
                "followup"
                "meds"
                "labs"
                "history"
              `,
              sm: `
                "profile followup"
                "meds    followup"
                "labs    history"
              `,
              md: `
                "profile followup followup"
                "meds    labs     history"
              `,
            },
            gap: 2,
          }}
        >
          {RECORD_CARDS.map((card) => (
            <RecordGridCard key={card.area} card={card} />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
