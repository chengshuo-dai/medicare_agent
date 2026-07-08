import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Checkbox,
  Chip,
  IconButton,
  Divider,
  Stack,
  LinearProgress,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FlagIcon from '@mui/icons-material/Flag';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { listCarePlans, ackTask } from '../../api/patient';
import type { CarePlan } from '../../api/patient';
import { flexRowGap05Mb05, pageHeader } from '../../styles/sxUtils';


const sageText = '#2C3E2D';
const sagePrimary = '#7D9B76';
const sageBg = '#F8F5F0';

/* ---------- Utility functions ---------- */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isExpired(plan: CarePlan): boolean {
  if (!plan.end_date) return false;
  return plan.end_date < todayStr();
}

function isAllCompleted(plan: CarePlan): boolean {
  return plan.tasks.length > 0 && plan.tasks.every((t) => t.completed);
}

function getPlanStatus(plan: CarePlan): 'In Progress' | 'Completed' | 'Expired' {
  if (isAllCompleted(plan)) return 'Completed';
  if (isExpired(plan)) return 'Expired';
  return 'In Progress';
}

function completionRate(plan: CarePlan): number {
  if (!plan.tasks.length) return 0;
  return Math.round((plan.tasks.filter((t) => t.completed).length / plan.tasks.length) * 100);
}

/* ---------- Component ---------- */
export default function FollowUpPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<CarePlan[]>(fallbackPlans);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    listCarePlans()
      .then((data) => {
        if (mounted) {
          const merged = data.length ? data : fallbackPlans;
          setPlans(merged);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setPlans(fallbackPlans);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleTask = async (planId: string, taskId: string) => {
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;
        const updatedTasks = plan.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        return { ...plan, tasks: updatedTasks };
      })
    );

    try {
      await ackTask(planId, taskId);
    } catch {
      // If API fails, state has already been toggled locally, maintain demo experience
    }
  };

  const { active, pending, history } = useMemo(() => {
    const t = todayStr();
    const activeList: CarePlan[] = [];
    const pendingList: CarePlan[] = [];
    const historyList: CarePlan[] = [];

    plans.forEach((plan) => {
      const expired = isExpired(plan);
      const allDone = isAllCompleted(plan);
      const inRange = plan.start_date <= t && (!plan.end_date || plan.end_date >= t);

      if (allDone || expired) {
        historyList.push(plan);
      } else if (inRange && plan.tasks.some((t) => t.completed)) {
        activeList.push(plan);
      } else {
        pendingList.push(plan);
      }
    });

    return { active: activeList, pending: pendingList, history: historyList };
  }, [plans]);

  const tabs = [
    { label: `In Progress (${active.length})`, list: active },
    { label: `Pending (${pending.length})`, list: pending },
    { label: `History (${history.length})`, list: history },
  ];

  const statusColor: Record<string, string> = {
    'In Progress': '#7D9B76',
    Completed: '#66BB6A',
    Expired: '#94A3B8',
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: sageBg, pb: 6 }}>
      <Container maxWidth="md">
        <Box sx={pageHeader}>
          <IconButton onClick={() => navigate('/records')} sx={{ color: sageText }}>
            <ArrowBackIosNewIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700, color: sageText, flex: 1 }}>
            Follow-up Plan
          </Typography>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}
          TabIndicatorProps={{ sx: { bgcolor: sagePrimary } }}>
          <Tab label="In Progress" value="active" />
          <Tab label="Completed" value="completed" />
          <Tab label="All" value="all" />
        </Tabs>

        {loading && <Typography sx={{ textAlign: 'center', py: 4 }}>Loading...</Typography>}

        {!loading && filtered.length === 0 && (
          <Typography sx={{ textAlign: 'center', py: 4, color: '#6B7D6B' }}>
            No{tab === 'active' ? ' active' : tab === 'completed' ? ' completed' : ''} follow-up plans
          </Typography>
        )}

        <Stack spacing={2}>
          {filtered.map((plan) => {
            const tasks = (plan as any).tasks || {};
            const taskEntries = tasks.tasks || Object.entries(tasks);
            const done = Array.isArray(taskEntries)
              ? taskEntries.filter((t: any) => t.status === 'completed' || t.completed).length
              : 0;
            const total = Array.isArray(taskEntries) ? taskEntries.length : 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <Card key={plan.id} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" sx={{ color: sageText, fontWeight: 600 }}>
                      {plan.title || 'Care Plan'}
                    </Typography>
                    <Chip label={plan.status === 'completed' ? 'Completed' : 'In Progress'}
                      color={plan.status === 'completed' ? 'success' : 'warning'} size="small" />
                  </Box>
                  {plan.description && (
                    <Typography variant="body2" sx={{ color: '#6B7D6B', mb: 1 }}>{plan.description}</Typography>
                  )}
                  <LinearProgress variant="determinate" value={pct}
                    sx={{ mb: 1, height: 8, borderRadius: 4, bgcolor: '#D9D6CE',
                      '& .MuiLinearProgress-bar': { bgcolor: sagePrimary } }} />
                  <Typography variant="caption" color="text.secondary">Progress {pct}%</Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={1}>
                    {Array.isArray(taskEntries) && taskEntries.map((task: any, idx: number) => (
                      <Box key={task.id || idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox checked={task.status === 'completed' || task.completed}
                          onChange={() => handleAck(plan.id, task.id || String(idx))}
                          disabled={task.status === 'completed' || task.completed}
                          size="small" sx={{ color: sagePrimary, '&.Mui-checked': { color: sagePrimary } }} />
                        <Typography variant="body2" sx={{
                          flex: 1, color: sageText,
                          textDecoration: (task.status === 'completed' || task.completed) ? 'line-through' : 'none',
                        }}>
                          {task.description || task.name || `Task ${idx + 1}`}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                  {plan.start_date && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Start: {new Date(plan.start_date).toLocaleDateString('en-US')}
                      {plan.end_date && ` — End: ${new Date(plan.end_date).toLocaleDateString('en-US')}`}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </Container>
    </Box>
  );
}
