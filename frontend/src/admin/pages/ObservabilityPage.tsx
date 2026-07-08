/** Admin Observability Dashboard — LLM metrics, circuit breakers, error tracking. */

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, CircularProgress,
  Alert, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, LinearProgress, Button, Stack,
} from '@mui/material';
import {
  getMetricsSummary,
  getCircuitStatus,
  getRecentErrors,
  type MetricsSummary,
  type CircuitState,
  type ErrorEntry,
} from '../../api/metrics';

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function CircuitChip({ state }: { state: string }) {
  const color = state === 'closed' ? 'success' : state === 'open' ? 'error' : 'warning';
  return <Chip label={state.replace('_', ' ').toUpperCase()} color={color} size="small" />;
}

export default function ObservabilityPage() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [circuits, setCircuits] = useState<Record<string, CircuitState>>({});
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [m, c, e] = await Promise.all([
        getMetricsSummary(),
        getCircuitStatus(),
        getRecentErrors(10),
      ]);
      setMetrics(m);
      setCircuits(c);
      setErrors(e);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !metrics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2D3748' }}>
            Observability
          </Typography>
          <Typography variant="body2" color="text.secondary">
            LLM latency, token usage, circuit breakers &mdash; auto-refreshes every 30s
          </Typography>
        </Box>
        <Button variant="outlined" size="small" onClick={fetchData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Latency Cards */}
      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600, color: '#2D3748' }}>
        Latency
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'P50', value: metrics?.latency.p50, color: '#7D9B76' },
          { label: 'P95', value: metrics?.latency.p95, color: '#D4A853' },
          { label: 'P99', value: metrics?.latency.p99, color: '#C06050' },
          { label: 'Avg', value: metrics?.latency.avg, color: '#4A5568' },
          { label: 'Total Calls', value: metrics?.latency.count, color: '#6B7D8E', isCount: true },
        ].map((stat) => (
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={stat.label}>
            <Card sx={{ borderLeft: `4px solid ${stat.color}` }}>
              <CardContent sx={{ py: 2, px: 2.5 }}>
                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#2D3748' }}>
                  {stat.isCount ? (stat.value ?? 0) : formatMs(stat.value ?? 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Token Usage & Success Rate */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#2D3748' }}>
                Token Usage
              </Typography>
              <Stack spacing={1.5}>
                {[
                  { label: 'Prompt Tokens', value: metrics?.tokens.prompt_tokens ?? 0 },
                  { label: 'Completion Tokens', value: metrics?.tokens.completion_tokens ?? 0 },
                  { label: 'Total Tokens', value: metrics?.tokens.total_tokens ?? 0 },
                ].map((t) => (
                  <Box key={t.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">{t.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {formatTokens(t.value)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#2D3748' }}>
                Success Rate
              </Typography>
              <Box sx={{ mb: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {metrics?.success_rate.success ?? 0} / {metrics?.success_rate.total_calls ?? 0} calls
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#7D9B76' }}>
                    {metrics?.success_rate.success_rate ?? 100}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={metrics?.success_rate.success_rate ?? 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#FED7D7',
                    '& .MuiLinearProgress-bar': { bgcolor: '#7D9B76', borderRadius: 4 },
                  }}
                />
              </Box>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Successful</Typography>
                  <Typography variant="body2" sx={{ color: '#7D9B76', fontWeight: 600 }}>
                    {metrics?.success_rate.success ?? 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Failed</Typography>
                  <Typography variant="body2" sx={{ color: '#C06050', fontWeight: 600 }}>
                    {metrics?.success_rate.error ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Provider Breakdown */}
      {metrics?.provider_breakdown && Object.keys(metrics.provider_breakdown).length > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600, color: '#2D3748' }}>
            Provider Breakdown
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Provider</TableCell>
                  <TableCell align="right">Calls</TableCell>
                  <TableCell align="right">P50</TableCell>
                  <TableCell align="right">P95</TableCell>
                  <TableCell align="right">P99</TableCell>
                  <TableCell align="right">Success Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(metrics.provider_breakdown).map(([name, stats]) => (
                  <TableRow key={name}>
                    <TableCell sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{name}</TableCell>
                    <TableCell align="right">{stats.total_calls}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatMs(stats.latency.p50)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatMs(stats.latency.p95)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatMs(stats.latency.p99)}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${stats.success_rate}%`}
                        color={stats.success_rate >= 99 ? 'success' : stats.success_rate >= 95 ? 'warning' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Circuit Breakers */}
      {Object.keys(circuits).length > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600, color: '#2D3748' }}>
            Circuit Breakers
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {Object.entries(circuits).map(([name, state]) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={name}>
                <Card>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                      {name}
                    </Typography>
                    <CircuitChip state={state.state} />
                    {state.failures > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {state.failures} failures
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Recent Errors */}
      {errors.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600, color: '#C06050' }}>
            Recent Errors
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Operation</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {errors.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {new Date(e.ts * 1000).toLocaleTimeString()}
                    </TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{e.provider}</TableCell>
                    <TableCell>{e.operation}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#C06050' }}>
                        {e.error_type}: {(e.error_message || '').slice(0, 100)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
