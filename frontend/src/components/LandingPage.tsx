import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import BiotechIcon from '@mui/icons-material/Biotech';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { agentApi } from '../api/agent';
import { getToken } from '../api/client';

const sagePrimary = '#7D9B76';
const sagePrimaryDark = '#5C7A55';
const sageText = '#2C3E2D';
const sageBg = '#F8F5F0';
const sageBorder = '#D9D6CE';
const sageLight = '#F0F3EE';
const textSecondary = '#6B7D6B';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleTryNow = async () => {
    if (!getToken()) {
      try {
        await agentApi.createGuestSession();
      } catch (e) {
        console.error('Failed to create guest session:', e);
      }
    }
    navigate('/chat');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: sageBg, pb: 8 }}>
      {/* Top Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, md: 6 },
          py: 2,
          bgcolor: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${sageBorder}`,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MedicalServicesIcon sx={{ fontSize: 32, color: sagePrimary }} />
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1.25rem',
              color: sageText,
              letterSpacing: '-0.02em',
            }}
          >
            MediCareAI
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/login')}
            sx={{
              borderColor: sagePrimary,
              color: sagePrimary,
              px: 3,
              py: 1,
              borderRadius: 2.5,
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { borderColor: sagePrimaryDark, bgcolor: 'rgba(125,155,118,0.06)' },
            }}
          >
            Sign In
          </Button>
          <Button
            variant="contained"
            onClick={handleTryNow}
            sx={{
              bgcolor: sagePrimary,
              color: '#fff',
              px: 3,
              py: 1,
              borderRadius: 2.5,
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: sagePrimaryDark, boxShadow: 'none' },
            }}
          >
            Get Started
          </Button>
        </Box>
      </Box>

      {/* Bento Grid */}
      <Box
        sx={{
          maxWidth: 1100,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          pt: { xs: 4, md: 6 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gridTemplateRows: { xs: 'auto', md: 'auto auto' },
          gap: 2.5,
        }}
      >
        {/* Hero Card — spans 2 columns */}
        <Paper
          elevation={0}
          sx={{
            gridColumn: { md: '1 / 3' },
            gridRow: { md: '1' },
            p: { xs: 4, md: 6 },
            borderRadius: 4,
            background: `linear-gradient(135deg, ${sagePrimary} 0%, ${sagePrimaryDark} 100%)`,
            color: '#fff',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 3,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative circles */}
          <Box
            sx={{
              position: 'absolute',
              top: -60,
              right: -40,
              width: 200,
              height: 200,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.08)',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -80,
              left: '20%',
              width: 260,
              height: 260,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.05)',
              pointerEvents: 'none',
            }}
          />
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.75rem', md: '2.5rem' },
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                mb: 1.5,
              }}
            >
              MediCareAI Agent
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '1rem', md: '1.15rem' },
                fontWeight: 400,
                opacity: 0.9,
                lineHeight: 1.6,
                mb: 3,
                maxWidth: 500,
              }}
            >
              Your Intelligent Medical Assistant — AI-powered diagnosis, symptom analysis,
              and health checkup report interpretation, available anytime.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleTryNow}
              sx={{
                bgcolor: '#fff',
                color: sagePrimary,
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: '1rem',
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                '&:hover': { bgcolor: sageLight, boxShadow: '0 6px 20px rgba(0,0,0,0.15)' },
              }}
            >
              Start Free Consultation
            </Button>
          </Box>
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MedicalServicesIcon
              sx={{
                fontSize: 140,
                opacity: 0.25,
                color: '#fff',
              }}
            />
          </Box>
        </Paper>

        {/* Smart Diagnosis Card */}
        <Paper
          elevation={0}
          sx={{
            p: 3.5,
            borderRadius: 4,
            bgcolor: '#fff',
            border: `1px solid ${sageBorder}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.06)' },
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              bgcolor: sageLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 26, color: sagePrimary }} />
          </Box>
          <Typography
            sx={{ fontWeight: 700, fontSize: '1.1rem', color: sageText }}
          >
            Smart Diagnosis
          </Typography>
          <Typography
            sx={{ fontSize: '0.9rem', color: textSecondary, lineHeight: 1.7, flex: 1 }}
          >
            LLM-powered medical Q&A with comprehensive symptom analysis.
            Describe your symptoms and get an AI-driven preliminary diagnosis.
          </Typography>
        </Paper>

        {/* Lab Analysis Card */}
        <Paper
          elevation={0}
          sx={{
            p: 3.5,
            borderRadius: 4,
            bgcolor: '#fff',
            border: `1px solid ${sageBorder}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.06)' },
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              bgcolor: sageLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BiotechIcon sx={{ fontSize: 26, color: sagePrimary }} />
          </Box>
          <Typography
            sx={{ fontWeight: 700, fontSize: '1.1rem', color: sageText }}
          >
            Lab Report Analysis
          </Typography>
          <Typography
            sx={{ fontSize: '0.9rem', color: textSecondary, lineHeight: 1.7, flex: 1 }}
          >
            Upload your lab reports and get instant interpretation.
            Supports blood work, imaging reports, and more.
          </Typography>
        </Paper>

        {/* Bottom stat cards — 3 across */}
        <Box
          sx={{
            gridColumn: { md: '1 / 3' },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
            gap: 2.5,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              bgcolor: '#fff',
              border: `1px solid ${sageBorder}`,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 28, color: sagePrimary }} />
            <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: sageText }}>
              99.7%
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: textSecondary }}>
              Diagnostic Accuracy
            </Typography>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              bgcolor: '#fff',
              border: `1px solid ${sageBorder}`,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <PeopleIcon sx={{ fontSize: 28, color: sagePrimary }} />
            <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: sageText }}>
              50K+
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: textSecondary }}>
              Patients Served
            </Typography>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              bgcolor: '#fff',
              border: `1px solid ${sageBorder}`,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <AccessTimeIcon sx={{ fontSize: 28, color: sagePrimary }} />
            <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: sageText }}>
              24/7
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: textSecondary }}>
              Always Available
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
