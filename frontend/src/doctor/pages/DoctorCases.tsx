import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Avatar,
  Chip,
  Button,
  IconButton,
  Skeleton,
  Stack,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MessageOutlined from '@mui/icons-material/MessageOutlined';
import { listPatients } from '../../api/doctor';
import type { PatientSummary } from '../../api/doctor';
import { flexRowBetweenMb2 } from '../../styles/sxUtils';


type FilterTag = 'all' | 'pending' | 'followup' | 'new' | 'high';

const filterTabs: { key: FilterTag; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending Reply' },
  { key: 'followup', label: 'In Follow-up' },
  { key: 'new', label: 'New Patients' },
  { key: 'high', label: 'High Risk' },
];

const demoPatients: PatientSummary[] = [
  {
    id: 'p-001',
    name: 'Zhang Wei',
    avatar: '',
    last_activity: 'Submitted blood pressure record 2 minutes ago',
    agent_summary: 'Blood pressure slightly elevated, recommend continued monitoring, no significant discomfort.',
    status: 'followup',
    risk_level: 'medium',
  },
  {
    id: 'p-002',
    name: 'Li Fang',
    avatar: '',
    last_activity: 'Asked about medication 1 hour ago',
    agent_summary: 'Blood sugar well controlled, good medication compliance, recommend continuing current regimen.',
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
    agent_summary: 'Good post-operative recovery, normal wound healing, no signs of infection.',
    status: 'stable',
    risk_level: 'low',
  },
  {
    id: 'p-005',
    name: 'Chen Hong',
    avatar: '',
    last_activity: 'Sent a message this morning',
    agent_summary: 'Headache frequency increased, recommend ruling out sleep factors and evaluating need for medication adjustment.',
    status: 'pending',
    risk_level: 'medium',
  },
  {
    id: 'p-006',
    name: 'Liu Yang',
    avatar: '',
    last_activity: 'New registration today',
    agent_summary: 'Newly diagnosed hypertension, prescribed antihypertensive medication, recommend follow-up in one week.',
    status: 'pending',
    risk_level: 'high',
  },
];

const statusMap: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  pending: { label: 'Pending', color: 'warning' },
  followup: { label: 'In Follow-up', color: 'primary' },
  stable: { label: 'Stable', color: 'success' },
};

const riskMap: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  low: { label: 'Low Risk', color: 'success' },
  medium: { label: 'Medium Risk', color: 'warning' },
  high: { label: 'High Risk', color: 'error' },
};

export default function DoctorCases() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTag>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listPatients()
      .then((data) => {
        if (mounted) setPatients(data);
      })
      .catch(() => {
        if (mounted) setPatients([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredPatients = useMemo(() => {
    let result = patients;
    if (activeFilter === 'pending') {
      result = result.filter((p) => p.status === 'pending');
    } else if (activeFilter === 'followup') {
      result = result.filter((p) => p.status === 'followup');
    } else if (activeFilter === 'new') {
      result = result.filter((p) => p.last_activity.toLowerCase().includes('new registration') || p.last_activity.toLowerCase().includes('new'));
    } else if (activeFilter === 'high') {
      result = result.filter((p) => p.risk_level === 'high');
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.last_activity.toLowerCase().includes(q) ||
          p.agent_summary.toLowerCase().includes(q)
      );
    }
    return result;
  }, [patients, activeFilter, search]);

  const handleViewCase = (caseId: string) => {
    navigate(`/doctor/cases/${caseId}`);
  };

  return (
    <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
      {/* Filter sidebar */}
      <Box sx={{ width: { xs: '100%', md: 220 }, flexShrink: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>
          Patient List
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ color: 'secondary.light', mr: 1, fontSize: '1.1rem' }} />,
            },
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: '#fff',
            },
          }}
        />
        <Stack spacing={1}>
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <Button
                key={tab.key}
                fullWidth
                onClick={() => setActiveFilter(tab.key)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  bgcolor: isActive ? 'primary.light' : 'transparent',
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  '&:hover': {
                    bgcolor: isActive ? '#D0D8E4' : 'rgba(33,150,243,0.04)',
                  },
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Stack>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, borderColor: 'secondary.light' }} />

      {/* Patient list */}
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={flexRowBetweenMb2}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {filteredPatients.length} patients total
          </Typography>
        </Box>

        <Stack spacing={2}>
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <Card key={idx} sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Skeleton variant="rectangular" height={100} />
                  </CardContent>
                </Card>
              ))
            : filteredPatients.map((p) => (
                <Card
                  key={p.id}
                  sx={{
                    borderRadius: 3,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 600 }}>
                        {p.name[0]}
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {p.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={statusMap[p.status]?.label || p.status}
                            color={statusMap[p.status]?.color || 'default'}
                          />
                          {p.risk_level && (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={riskMap[p.risk_level]?.label || p.risk_level}
                              color={riskMap[p.risk_level]?.color || 'default'}
                            />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                          {p.last_activity}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.primary', mb: 1 }}>
                          {p.agent_summary}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon fontSize="small" />}
                            onClick={() => handleViewCase(p.id)}
                            sx={{
                              textTransform: 'none',
                              borderRadius: 2,
                              borderColor: 'primary.main',
                              color: 'primary.main',
                              '&:hover': { bgcolor: 'rgba(33,150,243,0.04)' },
                            }}
                          >
                            View Case
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<MessageOutlinedIcon fontSize="small" />}
                            onClick={() => navigate('/doctor/messages')}
                            sx={{
                              textTransform: 'none',
                              borderRadius: 2,
                              color: 'text.secondary',
                              '&:hover': { color: 'primary.main', bgcolor: 'rgba(33,150,243,0.04)' },
                            }}
                          >
                            Send Message
                          </Button>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleViewCase(p.id)}
                        sx={{ color: 'secondary.light', mt: 0.5 }}
                      >
                        <ArrowForwardIosIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
          {!loading && filteredPatients.length === 0 && (
            <Card sx={{ borderRadius: 3, textAlign: 'center', py: 6 }}>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                No matching patients found
              </Typography>
            </Card>
          )}
        </Stack>
      </Box>
    </Box>
  );
}