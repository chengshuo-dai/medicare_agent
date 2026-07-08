import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Chip } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SettingsIcon from '@mui/icons-material/Settings';
import { fetchDashboardStats } from '../../api/admin';
import type { DashboardStats } from '../../types/admin';

/* ──────────────────────────────────────────────
   Steel-indigo colour tokens
   ────────────────────────────────────────────── */
const COL = {
  primary: '#2D3748',
  accent: '#4A5568',
  green: '#2F855A',
  amber: '#C05621',
  bg: '#EDF0F4',
  cardBg: '#fff',
  text: '#1A202C',
  textSec: '#718096',
};

/* ──────────────────────────────────────────────
   Stat card sub-component
   ────────────────────────────────────────────── */
function StatCard({
  title,
  value,
  icon,
  color,
  large,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  large?: boolean;
}) {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: '18px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        border: '1px solid #EDF0F4',
        transition: 'box-shadow 0.2s, transform 0.15s',
        '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.08)', transform: 'translateY(-1px)' },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography
              variant="body2"
              sx={{ color: COL.textSec, mb: 0.75, fontWeight: 500, fontSize: '0.85rem' }}
            >
              {title}
            </Typography>
            <Typography
              variant={large ? 'h3' : 'h4'}
              sx={{
                fontWeight: 800,
                color,
                fontSize: large ? '2.75rem' : '2rem',
                lineHeight: 1.1,
              }}
            >
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: large ? 56 : 48,
              height: large ? 56 : 48,
              borderRadius: '14px',
              bgcolor: `${color}14`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────
   Role distribution pill colours
   ────────────────────────────────────────────── */
const rolePill: Record<string, { label: string; color: string; bg: string }> = {
  patient: { label: 'Patient', color: '#2B6CB0', bg: '#EBF4FF' },
  doctor: { label: 'Doctor', color: '#2F855A', bg: '#F0FFF4' },
  admin: { label: 'Admin', color: '#C05621', bg: '#FFF5F0' },
};

/* ──────────────────────────────────────────────
   DashboardPage
   ────────────────────────────────────────────── */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress sx={{ color: COL.primary }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Failed to load: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: COL.text }}>
        Dashboard
      </Typography>

      {/* ── Bento stats: asymmetric grid ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr', md: '1.5fr 1fr 1fr' },
          gap: 2,
          mb: 3,
        }}
      >
        {/* Total Users — large card spans its column */}
        <Box sx={{ gridRow: { sm: 'span 1' } }}>
          <StatCard
            title="Total Users"
            value={stats?.users.total ?? 0}
            icon={<PeopleIcon sx={{ fontSize: 32 }} />}
            color={COL.primary}
            large
          />
        </Box>

        <StatCard
          title="LLM Providers"
          value={stats?.llm_providers.total ?? 0}
          icon={<SmartToyIcon sx={{ fontSize: 28 }} />}
          color={COL.green}
        />

        <StatCard
          title="System Settings"
          value={stats?.system_settings ?? 0}
          icon={<SettingsIcon sx={{ fontSize: 28 }} />}
          color={COL.amber}
        />
      </Box>

      {/* ── User Role Distribution ── */}
      {stats?.users.by_role && Object.keys(stats.users.by_role).length > 0 && (
        <Card
          sx={{
            borderRadius: '18px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            border: '1px solid #EDF0F4',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700, color: COL.text }}>
              User Role Distribution
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {Object.entries(stats.users.by_role).map(([role, count]) => {
                const pill = rolePill[role] || { label: role, color: COL.primary, bg: COL.bg };
                const total = stats.users.total || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <Box
                    key={role}
                    sx={{
                      flex: { xs: '1 1 100%', sm: '1 1 calc(33% - 16px)' },
                      minWidth: 140,
                    }}
                  >
                    {/* Label row */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, color: COL.text }}>
                        {pill.label}
                      </Typography>
                      <Chip
                        label={count}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          bgcolor: pill.bg,
                          color: pill.color,
                          borderRadius: '8px',
                          minWidth: 40,
                        }}
                      />
                    </Box>

                    {/* Percentage bar */}
                    <Box
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: COL.bg,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${Math.max(pct, 4)}%`,
                          borderRadius: 5,
                          bgcolor: pill.color,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </Box>

                    <Typography
                      variant="caption"
                      sx={{ color: COL.textSec, mt: 0.5, display: 'block' }}
                    >
                      {pct}% of total users
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
