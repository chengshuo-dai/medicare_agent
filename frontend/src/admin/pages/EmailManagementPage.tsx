import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Tabs, Tab, Tooltip, Alert, Grid, Card, CardContent,
  Link as MuiLink,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import TemplateIcon from '@mui/icons-material/Description';
import HistoryIcon from '@mui/icons-material/History';
import PresetIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SendIcon from '@mui/icons-material/Send';
import type {
  EmailConfig, EmailTemplate, EmailLog, EmailProviderPreset,
  SmtpSecurity,
} from '../../types/admin';
import { flexRowGap1Mb1 } from '../../styles/sxUtils';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  listEmailConfigs, createEmailConfig, updateEmailConfig, deleteEmailConfig,
  testEmailConfig, setDefaultEmailConfig,
  listEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate,
  listEmailLogs, getEmailProviderPresets,
} from '../../api/admin';

const SECURITY_LABELS: Record<string, string> = {
  starttls: 'STARTTLS',
  ssl: 'SSL/TLS',
  none: 'None',
};

const STATUS_COLORS: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  success: 'success',
  failed: 'error',
  untested: 'warning',
  pending: 'default',
};

export default function EmailManagementPage() {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EmailConfig | null>(null);
  const [configForm, setConfigForm] = useState({
    smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '',
    smtp_from_email: '', smtp_from_name: 'MediCareAI-Agent',
    smtp_security: 'starttls' as SmtpSecurity, description: '', is_default: false,
  });
  const [testEmail, setTestEmail] = useState('');
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testingConfigId, setTestingConfigId] = useState<string | null>(null);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '', description: '', subject: '', html_body: '', text_body: '',
    variables: '', is_active: true,
  });

  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const [logsPageSize, setLogsPageSize] = useState(20);
  const [logsLoading, setLogsLoading] = useState(false);

  const [presets, setPresets] = useState<EmailProviderPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<EmailProviderPreset | null>(null);

  const handlePresetSelect = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId) || null;
    setSelectedPreset(preset);
    if (preset && preset.id !== 'custom') {
      setConfigForm((f) => ({
        ...f,
        smtp_host: preset.smtp.host,
        smtp_port: preset.smtp.port,
        smtp_security: preset.smtp.security,
        smtp_from_email: f.smtp_user || f.smtp_from_email,
      }));
    }
  };

  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(null), 5000); };
  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 5000); };

  const fetchConfigs = useCallback(async () => {
    setConfigsLoading(true);
    try {
      const res = await listEmailConfigs();
      setConfigs(res.items);
    } catch (e: any) { showError(e.message); }
    finally { setConfigsLoading(false); }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await listEmailTemplates();
      setTemplates(res.items);
    } catch (e: any) { showError(e.message); }
    finally { setTemplatesLoading(false); }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await listEmailLogs({ page: logsPage + 1, page_size: logsPageSize });
      setLogs(res.items);
      setLogsTotal(res.total);
    } catch (e: any) { showError(e.message); }
    finally { setLogsLoading(false); }
  }, [logsPage, logsPageSize]);

  const fetchPresets = useCallback(async () => {
    try {
      const res = await getEmailProviderPresets();
      setPresets(res.providers);
    } catch (e: any) { showError(e.message); }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);
  useEffect(() => { if (tab === 1) fetchTemplates(); }, [tab, fetchTemplates]);
  useEffect(() => { if (tab === 2) fetchLogs(); }, [tab, fetchLogs]);
  useEffect(() => { if (tab === 3) fetchPresets(); }, [tab, fetchPresets]);

  const openConfigDialog = (cfg?: EmailConfig) => {
    fetchPresets();
    if (cfg) {
      setEditingConfig(cfg);
      setConfigForm({
        smtp_host: cfg.smtp_host, smtp_port: cfg.smtp_port, smtp_user: cfg.smtp_user,
        smtp_password: '', smtp_from_email: cfg.smtp_from_email,
        smtp_from_name: cfg.smtp_from_name, smtp_security: cfg.smtp_security,
        description: cfg.description || '', is_default: cfg.is_default,
      });
    } else {
      setEditingConfig(null);
      setConfigForm({
        smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '',
        smtp_from_email: '', smtp_from_name: 'MediCareAI-Agent',
        smtp_security: 'starttls', description: '', is_default: false,
      });
    }
    setConfigDialogOpen(true);
    setSelectedPreset(null);
  };

  const handleSaveConfig = async () => {
    try {
      if (editingConfig) {
        const updateData: any = { ...configForm };
        if (!updateData.smtp_password) delete updateData.smtp_password;
        await updateEmailConfig(editingConfig.id, updateData);
        showSuccess('Config updated');
      } else {
        await createEmailConfig(configForm);
        showSuccess('Config created');
      }
      setConfigDialogOpen(false);
      fetchConfigs();
    } catch (e: any) { showError(e.message); }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!window.confirm('Confirm delete this configuration?')) return;
    try { await deleteEmailConfig(id); fetchConfigs(); showSuccess('Deleted'); }
    catch (e: any) { showError(e.message); }
  };

  const handleTestConfig = async () => {
    if (!testingConfigId || !testEmail) return;
    try {
      const res = await testEmailConfig(testingConfigId, testEmail);
      if (res.success) showSuccess(res.message);
      else showError(res.message);
      setTestDialogOpen(false);
      fetchConfigs();
    } catch (e: any) { showError(e.message); }
  };

  const handleSetDefault = async (id: string) => {
    try { await setDefaultEmailConfig(id); fetchConfigs(); showSuccess('Set as Default'); }
    catch (e: any) { showError(e.message); }
  };

  const openTemplateDialog = (tpl?: EmailTemplate) => {
    if (tpl) {
      setEditingTemplate(tpl);
      setTemplateForm({
        name: tpl.name, description: tpl.description || '', subject: tpl.subject,
        html_body: tpl.html_body, text_body: tpl.text_body || '',
        variables: tpl.variables || '', is_active: tpl.is_active,
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ name: '', description: '', subject: '', html_body: '', text_body: '', variables: '', is_active: true });
    }
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        await updateEmailTemplate(editingTemplate.id, templateForm);
        showSuccess('Template updated');
      } else {
        await createEmailTemplate(templateForm);
        showSuccess('Template created');
      }
      setTemplateDialogOpen(false);
      fetchTemplates();
    } catch (e: any) { showError(e.message); }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Confirm delete this template?')) return;
    try { await deleteEmailTemplate(id); fetchTemplates(); showSuccess('Deleted'); }
    catch (e: any) { showError(e.message); }
  };

  return (
    <Box>
      <PageHeader
        title="Email Management"
        icon={<EmailIcon sx={{ verticalAlign: 'middle', color: '#2D3748' }} />}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab icon={<SettingsIcon fontSize="small" />} label="SMTP Config" />
          <Tab icon={<TemplateIcon fontSize="small" />} label="Email Templates" />
          <Tab icon={<HistoryIcon fontSize="small" />} label="Send History" />
          <Tab icon={<PresetIcon fontSize="small" />} label="Preset Providers" />
        </Tabs>
      </Paper>

      {/* === SMTP Configs Tab === */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openConfigDialog()}>
              New Config
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F3F4F6' }}>
                  <TableCell>Default</TableCell>
                  <TableCell>SMTP Server</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>Encryption</TableCell>
                  <TableCell>Test Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {configs.map((cfg) => (
                  <TableRow key={cfg.id}>
                    <TableCell>{cfg.is_default ? <CheckCircleIcon color="success" /> : '—'}</TableCell>
                    <TableCell>{cfg.smtp_host}:{cfg.smtp_port}</TableCell>
                    <TableCell>{cfg.smtp_user}</TableCell>
                    <TableCell>{cfg.smtp_from_name} &lt;{cfg.smtp_from_email}&gt;</TableCell>
                    <TableCell>{SECURITY_LABELS[cfg.smtp_security]}</TableCell>
                    <TableCell><Chip label={cfg.test_status} color={STATUS_COLORS[cfg.test_status] || 'default'} size="small" /></TableCell>
                    <TableCell align="right">
                      {!cfg.is_default && <Tooltip title="Set as Default"><IconButton size="small" onClick={() => handleSetDefault(cfg.id)}><SettingsIcon fontSize="small" /></IconButton></Tooltip>}
                      <Tooltip title="Test"><IconButton size="small" onClick={() => { setTestingConfigId(cfg.id); setTestDialogOpen(true); }}><SendIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openConfigDialog(cfg)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDeleteConfig(cfg.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {configs.length === 0 && !configsLoading && (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: '#9CA3AF' }}>No configuration, please add SMTP config</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* === Templates Tab === */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openTemplateDialog()}>
              New Template
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F3F4F6' }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Variables</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell>
                      <strong>{tpl.name}</strong>
                      <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">{tpl.description}</Typography>
                    </TableCell>
                    <TableCell>{tpl.subject}</TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{tpl.variables || '—'}</Typography></TableCell>
                    <TableCell><Chip label={tpl.is_active ? 'Enabled' : 'Disabled'} color={tpl.is_active ? 'success' : 'default'} size="small" /></TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openTemplateDialog(tpl)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDeleteTemplate(tpl.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {templates.length === 0 && !templatesLoading && (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: '#9CA3AF' }}>No templates</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* === Logs Tab === */}
      {tab === 2 && (
        <Box>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F3F4F6' }}>
                  <TableCell>Status</TableCell>
                  <TableCell>Recipient</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Retries</TableCell>
                  <TableCell>Error</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.status === 'sent' ? <Chip icon={<CheckCircleIcon />} label="Sent" color="success" size="small" /> :
                       log.status === 'failed' ? <Chip icon={<ErrorIcon />} label="Failed" color="error" size="small" /> :
                       <Chip label={log.status} size="small" />}
                    </TableCell>
                    <TableCell>{log.recipient_email}</TableCell>
                    <TableCell>{log.subject}</TableCell>
                    <TableCell>{log.retry_count}</TableCell>
                    <TableCell><Typography variant="caption" color="error">{log.error_message || '—'}</Typography></TableCell>
                    <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && !logsLoading && (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: '#9CA3AF' }}>No send records</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div" count={logsTotal} page={logsPage}
            onPageChange={(_, p) => setLogsPage(p)}
            rowsPerPage={logsPageSize}
            onRowsPerPageChange={(e) => { setLogsPageSize(parseInt(e.target.value, 10)); setLogsPage(0); }}
            rowsPerPageOptions={[10, 20, 50]} labelRowsPerPage="Per page"
          />
        </Box>
      )}

      {/* === Presets Tab === */}
      {tab === 3 && (
        <Box>
          <Grid container spacing={2}>
            {presets.map((preset) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={preset.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={flexRowGap1Mb1}>
                      <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>{preset.icon} {preset.name}</Typography>
                      <Chip label={preset.category_label} size="small" variant="outlined" />
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>{preset.description}</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: '#F3F4F6', p: 1, borderRadius: 1 }}>
                      {preset.smtp.host}:{preset.smtp.port} ({SECURITY_LABELS[preset.smtp.security]})
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {preset.help_text}
                    </Typography>
                    {preset.help_link && (
                      <MuiLink href={preset.help_link} target="_blank" rel="noreferrer" variant="caption">
                        View Help →
                      </MuiLink>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingConfig ? 'Edit SMTP Config' : 'New SMTP Config'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {!editingConfig && (
              <FormControl fullWidth>
                <InputLabel>Preset Providers</InputLabel>
                <Select
                  value={selectedPreset?.id || ''}
                  label="Preset Providers"
                  onChange={(e) => handlePresetSelect(e.target.value)}
                >
                  <MenuItem value="">Please select...</MenuItem>
                  {presets.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.icon} {p.name} — {p.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {selectedPreset && selectedPreset.id !== 'custom' && (
              <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
                {selectedPreset.help_text}
                {selectedPreset.help_link && (
                  <> <MuiLink href={selectedPreset.help_link} target="_blank">View Official Help →</MuiLink></>
                )}
              </Alert>
            )}

            <TextField
              label="Email Account"
              fullWidth
              value={configForm.smtp_user}
              onChange={(e) => {
                const val = e.target.value;
                setConfigForm((f) => ({
                  ...f,
                  smtp_user: val,
                  smtp_from_email: selectedPreset && selectedPreset.id !== 'custom' ? val : f.smtp_from_email,
                }));
              }}
              placeholder="your@email.com"
            />

            <TextField
              label={editingConfig ? 'Auth Code (leave empty to keep current)' : 'Auth Code'}
              type="password"
              fullWidth
              value={configForm.smtp_password}
              onChange={(e) => setConfigForm({ ...configForm, smtp_password: e.target.value })}
              placeholder={selectedPreset?.id === 'qq' ? '16-digit QQ Mail auth code' : selectedPreset?.id === '163' ? '16-digit NetEase auth code' : 'App-specific password / Auth code'}
            />

            <TextField
              label="From Name"
              fullWidth
              value={configForm.smtp_from_name}
              onChange={(e) => setConfigForm({ ...configForm, smtp_from_name: e.target.value })}
            />

            {(!selectedPreset || selectedPreset.id === 'custom') && (
              <>
                <TextField label="SMTP Server Address" fullWidth value={configForm.smtp_host} onChange={(e) => setConfigForm({ ...configForm, smtp_host: e.target.value })} />
                <TextField label="Port" type="number" fullWidth value={configForm.smtp_port} onChange={(e) => setConfigForm({ ...configForm, smtp_port: parseInt(e.target.value) || 0 })} />
                <TextField label="From Email" fullWidth value={configForm.smtp_from_email} onChange={(e) => setConfigForm({ ...configForm, smtp_from_email: e.target.value })} />
                <FormControl fullWidth>
                  <InputLabel>Encryption</InputLabel>
                  <Select value={configForm.smtp_security} label="Encryption" onChange={(e) => setConfigForm({ ...configForm, smtp_security: e.target.value as SmtpSecurity })}>
                    <MenuItem value="starttls">STARTTLS</MenuItem>
                    <MenuItem value="ssl">SSL/TLS</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}

            {selectedPreset && selectedPreset.id !== 'custom' && (
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F5F5F5' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Auto-configured (from preset)
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {configForm.smtp_host}:{configForm.smtp_port} · {SECURITY_LABELS[configForm.smtp_security] || configForm.smtp_security}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  From Email: {configForm.smtp_from_email || '(same as Email Account)'}
                </Typography>
              </Paper>
            )}

            <TextField label="Description (optional)" fullWidth value={configForm.description} onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveConfig} disabled={!configForm.smtp_host || !configForm.smtp_user || (!editingConfig && !configForm.smtp_password)}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Test Email Configuration</DialogTitle>
        <DialogContent>
          <TextField label="Recipient email for test" fullWidth value={testEmail} onChange={(e) => setTestEmail(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleTestConfig} disabled={!testEmail}>Send Test Email</Button>
        </DialogActions>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingTemplate ? 'Edit Email Template' : 'New Email Template'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Template Name" fullWidth value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} />
            <TextField label="Description" fullWidth value={templateForm.description} onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })} />
            <TextField label="Email Subject" fullWidth value={templateForm.subject} onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} />
            <TextField label="HTML Content" fullWidth multiline rows={8} value={templateForm.html_body} onChange={(e) => setTemplateForm({ ...templateForm, html_body: e.target.value })} />
            <TextField label="Plain Text Content (optional)" fullWidth multiline rows={4} value={templateForm.text_body} onChange={(e) => setTemplateForm({ ...templateForm, text_body: e.target.value })} />
            <TextField label="Variables (comma-separated, e.g.: user_name, reset_url)" fullWidth value={templateForm.variables} onChange={(e) => setTemplateForm({ ...templateForm, variables: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTemplate} disabled={!templateForm.name || !templateForm.subject || !templateForm.html_body}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}