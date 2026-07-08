import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Skeleton,
  Stack,
} from '@mui/material';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import MessageIcon from '@mui/icons-material/Message';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ShareIcon from '@mui/icons-material/Share';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { fetchDashboardStats, listPatients } from '../../api/doctor';
import type { DoctorStats, PatientSummary } from '../../api/doctor';

/* ──────────────────────────────────────────────
   Demo / fallback data — preserved from original
   ────────────────────────────────────────────── */

const demoStats: DoctorStats = {
  pending_count: 12,
  new_messages: 5,
  followup_due: 3,
  data_shares: 8,
};

const demoPatients: PatientSummary[] = [
  {
    id: 'p-001',
    name: 'Zhang Wei',
    avatar: '',
    last_activity: 'Submitted blood pressure record 2 minutes ago',
    agent_summary:
      'Blood pressure slightly elevated, recommend continued monitoring, no significant discomfort.',
    status: 'followup',
    risk_level: 'medium',
  },
  {
    id: 'p-002',
    name: 'Li Fang',
    avatar: '',
    last_activity: 'Asked about medication 1 hour ago',
    agent_summary:
      'Blood sugar well controlled, good medication compliance, recommend continuing current regimen.',
    status: 'stable',
    risk_level: 'low',
  },
  {
    id: 'p-003',
    name: 'Wang Qiang',
    avatar: '',
    last_activity: 'Uploaded exam report yesterday',
    agent_summary: 'ECG abnormal, recommend prompt follow-up and rest.',
    status: 'pending',
    risk_level: 'high',
  },
  {
    id: 'p-004',
    name: 'Zhao Min',
    avatar: '',
    last_activity: 'Completed follow-up 3 hours ago',
    agent_summary:
      'Good post-operative recovery, normal wound healing, no signs of infection.',
    status: 'stable',
    risk_level: 'low',
  },
  {
    id: 'p-005',
    name: 'Chen Hong',
    avatar: '',
    last_activity: 'Sent a message this morning',
    agent_summary:
      'Headache frequency increased, recommend ruling out sleep factors and evaluating need for medication adjustment.',
    status: 'pending',
    risk_level: 'medium',
  },
];

const statusMap: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  pending: { label: 'Pending', color: 'warning' },
  followup: { label: 'In Follow-up', color: 'primary' },
  stable: { label: 'Stable', color: 'success' },
};

const riskMap: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  low: { label: 'Low Risk', color: 'success' },
  medium: { label: 'Medium Risk', color: 'warning' },
  high: { label: 'High Risk', color: 'error' },
};

/* ──────────────────────────────────────────────
   Stat card config
   ────────────────────────────────────────────── */

interface StatCardDef {
  key: keyof DoctorStats;
  label: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

const statCards: StatCardDef[] = [
  {
    key: 'pending_count',
    label: 'Pending Reviews',
    icon: <PendingActionsIcon sx={{ fontSize: 32 }} />,
    color: '#C05621',
    badge: 'urgent',
  },
  {
    key: 'new_messages',
    label: 'New Messages',
    icon: <MessageIcon sx={{ fontSize: 32 }} />,
    color: '#3B82F6',
  },
  {
    key: 'data_shares',
    label: 'Data Shares',
    icon: <ShareIcon sx={{ fontSize: 32 }} />,
    color: '#2F855A',
  },
  {
    key: 'followup_due',
    label: 'Follow-up Due',
    icon: <EventBusyIcon sx={{ fontSize: 32 }} />,
    color: '#C53030',
    badge: 'overdue',
  },
];

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DoctorStats>(demoStats);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoadingStats(true);
    setLoadingPatients(true);

    fetchDashboardStats()
      .then((data) => {
        if (mounted) setStats(data);
      })
      .catch(() => {
        if (mounted) setStats(demoStats);
      })
      .finally(() => {
        if (mounted) setLoadingStats(false);
      });

    listPatients()
      .then((data) => {
        if (mounted) setPatients(data);
      })
      .catch(() => {
        if (mounted) setPatients([]);
      })
      .finally(() => {
        if (mounted) setLoadingPatients(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handlePatientClick = (id: string) => {
    navigate(`/doctor/cases/${id}`);
  };

  /* ── Bento grid: 2-col, first column 1.5× wider ── */
  const bentoGrid = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr' },
    gap: 2,
    mb: 4,
  };

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1A202C', mb: 3 }}>
        Dashboard
      </Typography>

      {/* ── Bento stats grid ── */}
      <Box sx={bentoGrid}>
        {statCards.map((s) => {
          const isPending = s.key === 'pending_count';
          return (
            <Card
              key={s.key}
              sx={{
                borderRadius: '18px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                border: '1px solid #EDF0F4',
                transition: 'box-shadow 0.2s, transform 0.15s',
                '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.08)', transform: 'translateY(-1px)' },
                ...(isPending
                  ? {
                      gridRow: { sm: 'span 1' },
                      // Make the pending card visually taller
                      minHeight: { sm: 160 },
                    }
                  : {}),
              }}
            >
              <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: '14px',
                      bgcolor: `${s.color}14`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: s.color,
                    }}
                  >
                    {s.icon}
                  </Box>
                  {s.badge && (
                    <Chip
                      label={s.badge}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderRadius: '8px',
                        bgcolor: s.badge === 'urgent' ? '#FFF5F0' : '#FFF5F5',
                        color: s.badge === 'urgent' ? '#C05621' : '#C53030',
                        border: `1px solid ${s.badge === 'urgent' ? '#FBD38D' : '#FEB2B2'}`,
                      }}
                    />
                  )}
                </Box>

                <Typography
                  variant="body2"
                  sx={{ color: '#718096', mb: 0.5, fontWeight: 500, fontSize: '0.85rem' }}
                >
                  {s.label}
                </Typography>

                {loadingStats ? (
                  <Skeleton variant="text" width={60} height={isPending ? 56 : 40} />
                ) : (
                  <Typography
                    variant={isPending ? 'h2' : 'h4'}
                    sx={{
                      fontWeight: 800,
                      color: '#1A202C',
                      fontSize: isPending ? '3rem' : '2rem',
                      lineHeight: 1.1,
                    }}
                  >
                    {stats[s.key]}
                  </Typography>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* ── Recent Patients ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1A202C' }}>
          Recent Patients
        </Typography>
        <IconButton
          size="small"
          onClick={() => navigate('/doctor/cases')}
          sx={{ color: '#4A5568' }}
        >
          <ArrowForwardIosIcon fontSize="small" />
        </IconButton>
      </Box>

      <Stack spacing={2}>
        {loadingPatients
          ? Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} sx={{ borderRadius: '18px' }}>
                <CardContent>
                  <Skeleton variant="rectangular" height={80} sx={{ borderRadius: '12px' }} />
                </CardContent>
              </Card>
            ))
          : patients.map((p) => (
              <Card
                key={p.id}
                sx={{
                  borderRadius: '18px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  border: '1px solid #EDF0F4',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, transform 0.15s',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                    transform: 'translateY(-1px)',
                  },
                }}
                onClick={() => handlePatientClick(p.id)}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: '#4A5568',
                        fontWeight: 600,
                        width: 44,
                        height: 44,
                        borderRadius: '14px',
                      }}
                    >
                      {p.name[0]}
                    </Avatar>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600, color: '#1A202C' }}
                        >
                          {p.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={statusMap[p.status]?.label || p.status}
                          color={statusMap[p.status]?.color || 'default'}
                          sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.7rem' }}
                        />
                        {p.risk_level && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={riskMap[p.risk_level]?.label || p.risk_level}
                            color={riskMap[p.risk_level]?.color || 'default'}
                            sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: '#718096', mb: 0.5, fontSize: '0.8rem' }}
                      >
                        {p.last_activity}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#1A202C', lineHeight: 1.5 }}>
                        {p.agent_summary}
                      </Typography>
                    </Box>
                    <IconButton size="small" sx={{ color: '#CBD5E0', mt: 0.5 }}>
                      <ArrowForwardIosIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
      </Stack>
    </Box>
  );
}
