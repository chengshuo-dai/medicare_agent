import { useEffect, useState, useCallback, startTransition } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Select, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Typography, Alert, Paper, CircularProgress, Tooltip, Grid, Tabs, Tab, Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import { listDoctors, verifyDoctor, updateUser } from '../../api/admin';
import type { UserItem, UserAdminUpdate } from '../../types/admin';
import { PageHeader } from '../../components/layout/PageHeader';


const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

function getStatusChip(status: string, isVerified: boolean) {
  if (status === 'inactive') {
    return <Chip size="small" label="Rejected" color="error" sx={{ fontWeight: 500 }} />;
  }
  if (isVerified) {
    return <Chip size="small" label="Verified" color="success" sx={{ fontWeight: 500 }} />;
  }
  return <Chip size="small" label="Pending Review" color="warning" sx={{ fontWeight: 500 }} />;
}

export default function DoctorVerificationPage() {
  const [doctors, setDoctors] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tabs: all | pending | verified | rejected
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  // Verify dialog
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyUser, setVerifyUser] = useState<UserItem | null>(null);
  const [verifyAction, setVerifyAction] = useState<'approve' | 'reject'>('approve');
  const [verifyReason, setVerifyReason] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState<UserAdminUpdate>({});
  const [saving, setSaving] = useState(false);

  // Data fetch: inline in effect to avoid indirect setState
  useEffect(() => {
    let cancelled = false;

    startTransition(() => {
      setLoading(true);
      setError('');
    });

    const params: Record<string, unknown> = { role: 'doctor', limit: 100 };
    if (search) params.search = search;

    if (tab === 'pending') {
      params.is_verified = false;
    } else if (tab === 'verified') {
      params.is_verified = true;
    } else if (tab === 'rejected') {
      params.status = 'inactive';
      params.is_verified = false;
    }

    listDoctors(params)
      .then((data) => {
        if (!cancelled) setDoctors(data);
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
  }, [tab, search]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    const cancelled = false;

    startTransition(() => {
      setLoading(true);
      setError('');
    });

    const params: Record<string, unknown> = { role: 'doctor', limit: 100 };
    if (search) params.search = search;

    if (tab === 'pending') {
      params.is_verified = false;
    } else if (tab === 'verified') {
      params.is_verified = true;
    } else if (tab === 'rejected') {
      params.status = 'inactive';
      params.is_verified = false;
    }

    listDoctors(params)
      .then((data) => {
        if (!cancelled) setDoctors(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }, [tab, search]);

  const handleOpenVerify = async (u: UserItem, action: 'approve' | 'reject') => {
    setVerifyUser(u);
    setVerifyAction(action);
    setVerifyReason('');
    setAttachments([]);
    setVerifyOpen(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${window.location.origin}/api/v1/admin/users/${u.id}/attachments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAttachments(await res.json());
    } catch {}
  };

  const handleVerify = async () => {
    if (!verifyUser) return;
    setVerifying(true);
    setError('');
    setSuccess('');
    try {
      await verifyDoctor(verifyUser.id, {
        action: verifyAction,
        reason: verifyReason || undefined,
      });
      setSuccess(verifyAction === 'approve' ? 'Doctor verification approved' : 'Doctor verification rejected');
      setVerifyOpen(false);
      handleRefresh();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setVerifying(false);
    }
  };

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
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateUser(editingUser.id, form);
      setSuccess('Doctor info updated');
      setEditOpen(false);
      handleRefresh();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    all: doctors.length,
    pending: doctors.filter((d) => !d.is_verified && d.status !== 'inactive').length,
    verified: doctors.filter((d) => d.is_verified).length,
    rejected: doctors.filter((d) => d.status === 'inactive' && !d.is_verified).length,
  };

  return (
    <Box>
      <PageHeader title="Doctor Verification" subtitle={`Total: ${doctors.length}  doctors`} />

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

      {/* Search + Tabs */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
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
          <Grid size={{ xs: 12, md: 3 }}>
            <Button variant="outlined" fullWidth onClick={handleRefresh} disabled={loading}>
              {loading ? <CircularProgress size={16} /> : 'Refresh'}
            </Button>
          </Grid>
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary">
          {STATUS_TABS.map((t) => (
            <Tab
              key={t.value}
              value={t.value}
              label={`${t.label} (${counts[t.value as keyof typeof counts]})`}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#EDF0F4' }}>
                  <TableCell>Name / Email</TableCell>
                  <TableCell>License No.</TableCell>
                  <TableCell>Hospital / Dept.</TableCell>
                  <TableCell>Verification</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={24} sx={{ my: 2 }} />
                    </TableCell>
                  </TableRow>
                ) : doctors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      No doctor data
                    </TableCell>
                  </TableRow>
                ) : (
                  doctors.map((d) => (
                    <TableRow key={d.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {d.full_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {d.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {d.license_number || <span style={{ color: '#94a3b8' }}>—</span>}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {d.hospital && (
                            <Typography variant="body2">{d.hospital}</Typography>
                          )}
                          {d.department && (
                            <Typography variant="caption" color="text.secondary">
                              {d.department} {d.title && `· ${d.title}`}
                            </Typography>
                          )}
                          {!d.hospital && !d.department && (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{getStatusChip(d.status, d.is_verified)}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(d.created_at).toLocaleDateString('en-US')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          {!d.is_verified && d.status !== 'inactive' && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleOpenVerify(d, 'approve')}
                                >
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleOpenVerify(d, 'reject')}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenEdit(d)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Verify Dialog */}
      <Dialog open={verifyOpen} onClose={() => setVerifyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {verifyAction === 'approve' ? 'Approve Doctor Verification' : 'Reject Doctor Verification'}
          {verifyUser && ` — ${verifyUser.full_name}`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Doctor: {verifyUser?.full_name} ({verifyUser?.email})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              License No.: {verifyUser?.license_number || 'Not provided'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hospital: {verifyUser?.hospital || 'Not provided'} / Dept.: {verifyUser?.department || 'Not provided'}
            </Typography>
            <Divider />
            {attachments.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>📎 Documents ({attachments.length})</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {attachments.map((att: any) => (
                    <Chip
                      key={att.id}
                      label={`${att.file_name} (${att.file_size ? Math.round(att.file_size / 1024) + 'KB' : '?'})`}
                      component="a"
                      href={att.file_url}
                      target="_blank"
                      clickable
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
            <Divider />
            <TextField
              label={verifyAction === 'reject' ? 'Rejection Reason (optional)' : 'Notes (optional)'}
              value={verifyReason}
              onChange={(e) => setVerifyReason(e.target.value)}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerifyOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={verifyAction === 'approve' ? 'success' : 'error'}
            onClick={handleVerify}
            disabled={verifying}
          >
            {verifying ? <CircularProgress size={16} /> : verifyAction === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Doctor Info: {editingUser?.full_name}</DialogTitle>
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={16} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}