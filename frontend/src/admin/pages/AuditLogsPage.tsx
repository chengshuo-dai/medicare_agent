import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert, Pagination, Grid, Card, CardContent,
  IconButton, Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import type { AuditLogItem, AuditLogStats, AuditActionType, AuditResourceType } from '../../types/admin';
import { listAuditLogs, getAuditLogStats } from '../../api/admin';
import { PageHeader } from "../../components/layout/PageHeader";



const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  PASSWORD_CHANGE: 'Password Change',
  ROLE_SWITCH: 'Role Switch',
  DOCTOR_VERIFY: 'Verify Doctor',
  DOCTOR_REJECT: 'Reject Doctor',
  DOCUMENT_CREATE: 'Create Document',
  DOCUMENT_UPDATE: 'Update Document',
  DOCUMENT_DELETE: 'Delete Document',
  DOCUMENT_REVIEW: 'Review Document',
  DOCUMENT_TOGGLE: 'Toggle Document Status',
  SETTINGS_CHANGE: 'Change Settings',
  LLM_CONFIG_CREATE: 'Create LLM Config',
  LLM_CONFIG_UPDATE: 'Update LLM Config',
  LLM_CONFIG_DELETE: 'Delete LLM Config',
  LLM_CONFIG_TEST: 'Test LLM Config',
  USER_CREATE: 'Create User',
  USER_UPDATE: 'Update User',
  USER_DELETE: 'Delete User',
  AGENT_SESSION: 'Agent Session',
  TOOL_CALL: 'Tool Call',
};

const RESOURCE_LABELS: Record<string, string> = {
  USER: 'User',
  DOCTOR: 'Doctor',
  DOCUMENT: 'Document',
  SYSTEM_SETTING: 'System Setting',
  LLM_PROVIDER: 'LLM Provider',
  AGENT_SESSION: 'Agent Session',
  UNKNOWN: 'Unknown',
};

const ACTION_OPTIONS: AuditActionType[] = [
  'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'ROLE_SWITCH',
  'DOCTOR_VERIFY', 'DOCTOR_REJECT',
  'DOCUMENT_CREATE', 'DOCUMENT_UPDATE', 'DOCUMENT_DELETE', 'DOCUMENT_REVIEW', 'DOCUMENT_TOGGLE',
  'SETTINGS_CHANGE',
  'LLM_CONFIG_CREATE', 'LLM_CONFIG_UPDATE', 'LLM_CONFIG_DELETE', 'LLM_CONFIG_TEST',
  'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
];

const RESOURCE_OPTIONS: AuditResourceType[] = [
  'USER', 'DOCTOR', 'DOCUMENT', 'SYSTEM_SETTING', 'LLM_PROVIDER', 'AGENT_SESSION', 'UNKNOWN',
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [filters, setFilters] = useState({
    action: '',
    resource_type: '',
    date_from: '',
    date_to: '',
    success: '',
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAuditLogs({
        action: filters.action || undefined,
        resource_type: filters.resource_type || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        success: filters.success === '' ? undefined : filters.success === 'true',
        skip: (page - 1) * pageSize,
        limit: pageSize,
      });
      setLogs(res);
      setTotal(res.length);
      if (res.length === pageSize) setTotal(page * pageSize + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, filters.action, filters.resource_type, filters.date_from, filters.date_to, filters.success]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getAuditLogStats();
      setStats(res);
    } catch {
      // silently ignore stats errors
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  const openDetail = (log: AuditLogItem) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  const actionColor = (action: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    if (action.includes('CREATE') || action.includes('VERIFY')) return 'success';
    if (action.includes('DELETE') || action.includes('REJECT')) return 'error';
    if (action.includes('UPDATE') || action.includes('CHANGE')) return 'warning';
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'info';
    return 'default';
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Box>
      {/* Header */}
      <PageHeader title="Audit Logs" actions={<Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { fetchLogs(); fetchStats(); }}>
          Refresh
        </Button>} />

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Today's Operations</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                {statsLoading ? <CircularProgress size={24} /> : (stats?.total_today ?? 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">This Week's Operations</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                {statsLoading ? <CircularProgress size={24} /> : (stats?.total_week ?? 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Today's Failures</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: 'error.main' }}>
                {statsLoading ? <CircularProgress size={24} /> : (stats?.failed_today ?? 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Action Type</InputLabel>
              <Select
                value={filters.action}
                label="Action Type"
                onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                {ACTION_OPTIONS.map((a) => (
                  <MenuItem key={a} value={a}>{ACTION_LABELS[a] || a}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Resource Type</InputLabel>
              <Select
                value={filters.resource_type}
                label="Resource Type"
                onChange={(e) => setFilters((f) => ({ ...f, resource_type: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                {RESOURCE_OPTIONS.map((r) => (
                  <MenuItem key={r} value={r}>{RESOURCE_LABELS[r] || r}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField
              type="date"
              label="Start Date"
              size="small"
              fullWidth
              value={filters.date_from}
              onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField
              type="date"
              label="End Date"
              size="small"
              fullWidth
              value={filters.date_to}
              onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.success}
                label="Status"
                onChange={(e) => setFilters((f) => ({ ...f, success: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Success</MenuItem>
                <MenuItem value="false">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={160}>Time</TableCell>
              <TableCell width={120}>Operator</TableCell>
              <TableCell width={140}>Action</TableCell>
              <TableCell width={100}>Resource</TableCell>
              <TableCell>Resource ID</TableCell>
              <TableCell width={80}>Status</TableCell>
              <TableCell width={60}>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>{formatDate(log.created_at)}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{log.user_email || 'System'}</Typography>
                  {log.user_role && (
                    <Typography variant="caption" color="text.secondary">{log.user_role}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={ACTION_LABELS[log.action] || log.action}
                    color={actionColor(log.action)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{RESOURCE_LABELS[log.resource_type] || log.resource_type}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {log.resource_id ? log.resource_id.slice(0, 8) + '...' : '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {log.success ? (
                    <CheckCircleIcon fontSize="small" color="success" />
                  ) : (
                    <ErrorIcon fontSize="small" color="error" />
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => openDetail(log)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No audit logs</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Pagination
          count={Math.ceil(total / pageSize)}
          page={page}
          onChange={(_, p) => setPage(p)}
          color="primary"
        />
      </Box>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Audit Details</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Action</Typography>
                  <Typography variant="body1">{ACTION_LABELS[selectedLog.action] || selectedLog.action}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Time</Typography>
                  <Typography variant="body1">{new Date(selectedLog.created_at).toLocaleString('en-US')}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Operator</Typography>
                  <Typography variant="body1">{selectedLog.user_email || 'System'} ({selectedLog.user_role || 'unknown'})</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">Resource</Typography>
                  <Typography variant="body1">{RESOURCE_LABELS[selectedLog.resource_type] || selectedLog.resource_type}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Resource ID</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{selectedLog.resource_id || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">IP Address</Typography>
                  <Typography variant="body1">{selectedLog.ip_address || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">User Agent</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{selectedLog.user_agent || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Details</Typography>
                  <Box component="pre" sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1, fontSize: '0.8rem', overflow: 'auto' }}>
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </Box>
                </Grid>
                {selectedLog.error_message && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="error">Error Message</Typography>
                    <Typography variant="body2" color="error">{selectedLog.error_message}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}