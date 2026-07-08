import { useEffect, useState, useCallback, startTransition } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider,
  FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Select, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Typography, Alert, Paper, CircularProgress, Tooltip, Grid,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import CancelIcon from '@mui/icons-material/Cancel';
import { listUsers, updateUser, kickUser } from '../../api/admin';
import type { UserItem, UserAdminUpdate } from '../../types/admin';
import { PageHeader } from '../../components/layout/PageHeader';


const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  patient: { label: 'Patient', color: '#3B82F6' },
  doctor: { label: 'Doctor', color: '#10B981' },
  admin: { label: 'Admin', color: '#EF4444' },
};

function getStatusChip(user: UserItem) {
  if (user.status === 'inactive') {
    return <Chip size="small" label="Disabled" color="error" sx={{ fontWeight: 500 }} />;
  }
  if (user.role === 'patient' && !user.email_verified) {
    return <Chip size="small" label="Pending Verification" color="warning" sx={{ fontWeight: 500 }} />;
  }
  if (user.role === 'doctor' && !user.is_verified) {
    return <Chip size="small" label="Pending Review" color="warning" sx={{ fontWeight: 500 }} />;
  }
  return <Chip size="small" label="Active" color="success" sx={{ fontWeight: 500 }} />;
}

function getRoleLabel(role: string) {
  return ROLE_LABELS[role]?.label || role;
}

function getRoleColor(role: string) {
  return ROLE_LABELS[role]?.color || '#64748B';
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Edit dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState<UserAdminUpdate>({});
  const [saving, setSaving] = useState(false);

  const [kickOpen, setKickOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<UserItem | null>(null);
  const [kickReason, setKickReason] = useState('');
  const [kickReasonOther, setKickReasonOther] = useState('');
  const [kicking, setKicking] = useState(false);

  const KICK_REASONS = ['Violation: unauthorized medical advice', 'Violation: platform resource abuse', 'Violation: inappropriate content', 'User requested account deletion'];

  // Data fetch: inline in effect
  useEffect(() => {
    let cancelled = false;

    startTransition(() => {
      setLoading(true);
      setError('');
    });

    listUsers({
      search: search || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      limit: 100,
    })
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, roleFilter, statusFilter]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    const cancelled = false;

    startTransition(() => {
      setLoading(true);
      setError('');
    });

    listUsers({
      search: search || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      limit: 100,
    })
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }, [search, roleFilter, statusFilter]);

  const handleOpenEdit = (u: UserItem) => {
    setEditingUser(u);
    setForm({
      full_name: u.full_name,
      status: u.status,
      is_verified: u.is_verified,
      license_number: u.license_number,
      hospital: u.hospital,
      department: u.department,
      title: u.title,
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateUser(editingUser.id, form);
      setSuccess('User info updated');
      setOpenDialog(false);
      handleRefresh();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenKick = (u: UserItem) => {
    setKickTarget(u);
    setKickReason(KICK_REASONS[0]);
    setKickReasonOther('');
    setKickOpen(true);
  };

  const handleKick = async () => {
    if (!kickTarget) return;
    setKicking(true);
    setError('');
    const reason = kickReason === 'Other' ? kickReasonOther : kickReason;
    if (!reason.trim()) { setError('Please enter the reason'); setKicking(false); return; }
    try {
      const res = await kickUser(kickTarget.id, reason);
      setSuccess(res.email_sent ? 'User has been removed, notification email sent' : 'User removed, but notification email failed to send');
      setKickOpen(false);
      handleRefresh();
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setKicking(false);
    }
  };

  const isInactive = (u: UserItem) => u.status === 'inactive';

  return (
    <Box>
      <PageHeader title="User Management" subtitle={`Total: ${users.length}  users`} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: <SearchIcon fontSize="small" color="action" />,
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Role</InputLabel>
              <Select value={roleFilter} label="Role" onChange={(e) => setRoleFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="patient">Patient</MenuItem>
                <MenuItem value="doctor">Doctor</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Disabled</MenuItem>
                <MenuItem value="pending">Pending Review</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Button variant="outlined" fullWidth onClick={handleRefresh} disabled={loading}>
              {loading ? <CircularProgress size={16} /> : 'Refresh'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#EDF0F4' }}>
                  <TableCell>Name / Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Verified</TableCell>
                  <TableCell>Hospital / Dept.</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress size={24} sx={{ my: 2 }} />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      No user data
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {u.full_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {u.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={getRoleLabel(u.role)}
                          sx={{
                            bgcolor: getRoleColor(u.role) + '20',
                            color: getRoleColor(u.role),
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>{getStatusChip(u)}</TableCell>
                      <TableCell>
                        {u.is_verified ? (
                          <Chip size="small" label="Verified" color="success" variant="outlined" />
                        ) : (
                          <Chip size="small" label="Unverified" color="default" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        {u.role === 'doctor' ? (
                          <Box>
                            {u.hospital && (
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {u.hospital}
                              </Typography>
                            )}
                            {u.department && (
                              <Typography variant="caption" color="text.secondary">
                                {u.department} {u.title && `· ${u.title}`}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(u.created_at).toLocaleDateString('en-US')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenEdit(u)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {u.status !== 'inactive' && (
                          <Tooltip title="Kick">
                            <IconButton size="small" color="error" onClick={() => handleOpenKick(u)}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User: {editingUser?.full_name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={form.full_name || ''}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              size="small"
              fullWidth
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={form.status || ''}
                label="Status"
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Disabled</MenuItem>
                <MenuItem value="pending">Pending Review</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_verified || false}
                  onChange={(e) => setForm({ ...form, is_verified: e.target.checked })}
                />
              }
              label={form.is_verified ? 'Verified' : 'Unverified'}
            />

            {editingUser?.role === 'doctor' && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 1, color: 'text.secondary' }}>
                  Doctor-specific Information
                </Typography>
                <TextField
                  label="License No."
                  value={form.license_number || ''}
                  onChange={(e) => setForm({ ...form, license_number: e.target.value || null })}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Hospital"
                  value={form.hospital || ''}
                  onChange={(e) => setForm({ ...form, hospital: e.target.value || null })}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Department"
                  value={form.department || ''}
                  onChange={(e) => setForm({ ...form, department: e.target.value || null })}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Title"
                  value={form.title || ''}
                  onChange={(e) => setForm({ ...form, title: e.target.value || null })}
                  size="small"
                  fullWidth
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={16} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={kickOpen} onClose={() => setKickOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>
          🚫 Kick User: {kickTarget?.full_name} ({getRoleLabel(kickTarget?.role || '')})
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Email: {kickTarget?.email}
            </Typography>
            <Divider />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Kick Reason (required)</Typography>
            <FormControl fullWidth size="small">
              <Select value={KICK_REASONS.includes(kickReason) ? kickReason : 'Other'} onChange={(e) => {
                setKickReason(e.target.value);
                if (e.target.value !== 'Other') setKickReasonOther('');
              }}>
                {KICK_REASONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                <MenuItem value="Other">Other (please specify)</MenuItem>
              </Select>
            </FormControl>
            {kickReason === 'Other' && (
              <TextField size="small" fullWidth placeholder="Please enter the reason" value={kickReasonOther}
                onChange={(e) => setKickReasonOther(e.target.value)} />
            )}
            <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
              ✉️ An email will be sent notifying the user of account deletion. This action is irreversible.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKickOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleKick} disabled={kicking}>
            {kicking ? <CircularProgress size={16} /> : 'Confirm Kick and Send Email'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}