import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Typography, Switch, FormControlLabel, Tooltip, CircularProgress, Alert, Paper,
  Select, MenuItem, FormControl, InputLabel, Collapse, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Block';
import TestIcon from '@mui/icons-material/NetworkCheck';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import {
  listLLMProviders, createLLMProvider, updateLLMProvider, deleteLLMProvider, testLLMProvider,
} from '../../api/admin';
import type { LLMProvider, LLMProviderCreate, LLMProviderUpdate } from '../../types/admin';
import { flexRowGap1 } from '../../styles/sxUtils';
import { PROVIDER_DOMAINS } from '../../config/providers';


const emptyForm: LLMProviderCreate = {
  provider: '',
  platform: null,
  name: '',
  base_url: '',
  api_key: '',
  default_model: '',
  model_type: 'diagnosis',
  is_active: true,
  is_default: false,
};

const MODEL_TYPE_OPTIONS = [
  { value: 'diagnosis', label: 'Diagnosis/Chat — General LLM' },
  { value: 'multimodal', label: 'Multimodal — Vision-language model' },
  { value: 'embedding', label: 'Embedding — Text vectorization' },
  { value: 'reranking', label: 'Reranking — RAG result refinement' },
  { value: 'extraction', label: 'Extraction — Document field parsing' },
  { value: 'summarization', label: 'Summarization — Text summarization' },
  { value: 'classify', label: 'Classification — Doc classification & intent' },
  { value: 'vision', label: 'Medical Imaging — Image analysis' },
];

// Official API configuration reference (OpenAI-compatible format, focused on domestic models)
interface ProviderGuide {
  name: string;
  baseUrl: string;
  models: { id: string; label: string; type: string }[];
  notes: string[];
}

const PROVIDER_GUIDES: Record<string, ProviderGuide> = {
  moonshot: {
    name: 'Moonshot AI (Kimi)',
    baseUrl: `${PROVIDER_DOMAINS.moonshot.api}/v1`,
    models: [
      { id: 'kimi-k2.5', label: 'kimi-k2.5 (Recommended, long-context general model)', type: 'diagnosis' },
      { id: 'kimi-k2.6', label: 'kimi-k2.6 (Recommended, latest flagship model)', type: 'diagnosis' },
    ],
    notes: [
      'OpenAI-compatible API format',
      `Base URL: ${PROVIDER_DOMAINS.moonshot.api}/v1`,
      `API Key: apply at ${PROVIDER_DOMAINS.moonshot.platform}`,
      'Default rate limit: 60 RPM',
      'Legacy moonshot-v1 models: enter manually',
    ],
  },
  opencode: {
    name: 'OpenCode Go',
    baseUrl: `${PROVIDER_DOMAINS.opencode.api}/zen/go/v1`,
    models: [
      { id: 'kimi-k2.5', label: 'kimi-k2.5 (Kimi K2.5, long-context general)', type: 'diagnosis' },
      { id: 'kimi-k2.6', label: 'kimi-k2.6 (Kimi K2.6, flagship model)', type: 'diagnosis' },
      { id: 'glm-5.1', label: 'glm-5.1 (GLM-5.1, high-end model)', type: 'diagnosis' },
      { id: 'glm-5', label: 'glm-5 (GLM-5, balanced performance)', type: 'diagnosis' },
      { id: 'deepseek-v4-pro', label: 'deepseek-v4-pro (DeepSeek V4 Pro, strong reasoning)', type: 'diagnosis' },
      { id: 'deepseek-v4-flash', label: 'deepseek-v4-flash (DeepSeek V4 Flash, fast speed)', type: 'diagnosis' },
      { id: 'mimo-v2-pro', label: 'mimo-v2-pro (MiMo-V2-Pro)', type: 'diagnosis' },
      { id: 'mimo-v2-omni', label: 'mimo-v2-omni (MiMo-V2-Omni, multimodal)', type: 'multimodal' },
      { id: 'mimo-v2.5-pro', label: 'mimo-v2.5-pro (MiMo-V2.5-Pro)', type: 'diagnosis' },
      { id: 'mimo-v2.5', label: 'mimo-v2.5 (MiMo-V2.5, 256K context)', type: 'diagnosis' },
      { id: 'qwen3.6-plus', label: 'qwen3.6-plus (Qwen 3.6 Plus)', type: 'diagnosis' },
      { id: 'qwen3.5-plus', label: 'qwen3.5-plus (Qwen 3.5 Plus)', type: 'diagnosis' },
    ],
    notes: [
      'OpenAI-compatible API format',
      `Base URL: ${PROVIDER_DOMAINS.opencode.api}/zen/go/v1`,
      `API Key: subscribe at ${PROVIDER_DOMAINS.opencode.zen}`,
      'First month $5, then $10/month',
      'Note: MiniMax M2.5/M2.7 use Anthropic format, not included',
    ],
  },
  zhipu: {
    name: 'Zhipu AI',
    baseUrl: `${PROVIDER_DOMAINS.zhipu.api}/api/paas/v4/`,
    models: [
      { id: 'glm-4', label: 'glm-4 (Flagship model, best overall capability)', type: 'diagnosis' },
      { id: 'glm-4v', label: 'glm-4v (Multimodal, supports image understanding)', type: 'multimodal' },
      { id: 'glm-4-flash', label: 'glm-4-flash (Lite version, fast and low-cost)', type: 'diagnosis' },
      { id: 'glm-4-plus', label: 'glm-4-plus (Plus version, stronger performance)', type: 'diagnosis' },
      { id: 'glm-4-air', label: 'glm-4-air (Air version, cost-optimized)', type: 'diagnosis' },
    ],
    notes: ['OpenAI-compatible API', 'API Key: apply at open.bigmodel.cn', 'glm-4v supports image input'],
  },
  jina: {
    name: 'Jina AI',
    baseUrl: `${PROVIDER_DOMAINS.jina.api}/v1`,
    models: [
      { id: 'jina-reranker-v2-base-multilingual', label: 'jina-reranker-v2-base-multilingual (Multilingual reranking)', type: 'reranking' },
      { id: 'jina-embeddings-v3', label: 'jina-embeddings-v3 (Text embeddings)', type: 'embedding' },
      { id: 'jina-colbert-v2', label: 'jina-colbert-v2 (ColBERT reranking)', type: 'reranking' },
    ],
    notes: ['OpenAI-compatible API', 'API Key: apply at jina.ai', 'Focused on RAG enhancement', 'Generous free tier'],
  },
  'custom-openai': {
    name: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    models: [
      { id: 'gpt-4o', label: 'gpt-4o (OpenAI multimodal flagship)', type: 'diagnosis' },
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini (OpenAI lite version)', type: 'diagnosis' },
    ],
    notes: [
      'OpenAI API format compatible (/v1/chat/completions)',
      'Base URL must be OpenAI-compatible format',
      'Works with third-party OpenAI-compatible platforms',
      'Model name: use actual platform value',
    ],
  },
  'custom-anthropic': {
    name: 'Custom (Anthropic-compatible)',
    baseUrl: `${PROVIDER_DOMAINS.anthropic.api}/v1`,
    models: [
      { id: 'claude-3-5-sonnet-20241022', label: 'claude-3-5-sonnet (Anthropic multimodal)', type: 'diagnosis' },
      { id: 'claude-3-opus-20240229', label: 'claude-3-opus (Anthropic strongest reasoning)', type: 'diagnosis' },
    ],
    notes: [
      '⚠️ Note: Anthropic format differs from OpenAI',
      'Backend needs /v1/messages endpoint adapter',
      'Current version may not support direct calls',
      'Model name: use actual platform value',
    ],
  },
};

export default function LLMProvidersPage() {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [form, setForm] = useState<LLMProviderCreate>(emptyForm);
  const [testResults, setTestResults] = useState<Record<string, { status: string; msg?: string }>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const providerKey = form.provider.toLowerCase().trim();
  const providerGuide = PROVIDER_GUIDES[providerKey];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listLLMProviders();
      setProviders(data);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOpenAdd = () => {
    setEditingProvider(null);
    setForm(emptyForm);
    setOpenDialog(true);
  };

  const handleOpenEdit = (p: LLMProvider) => {
    setEditingProvider(p);
    setForm({
      provider: p.provider,
      platform: p.platform,
      name: p.name,
      base_url: p.base_url,
      api_key: '',
      default_model: p.default_model,
      model_type: p.model_type,
      is_active: p.is_active,
      is_default: p.is_default,
    });
    setOpenDialog(true);
  };

  const handleAutoFill = () => {
    if (!providerGuide || editingProvider) return;
    const firstModel = providerGuide.models[0];
    setForm((prev) => ({
      ...prev,
      name: providerGuide.name,
      base_url: providerGuide.baseUrl,
      default_model: firstModel?.id || '',
      model_type: firstModel?.type || 'diagnosis',
    }));
  };

  const handleSave = async () => {
    try {
      if (editingProvider) {
        const update: LLMProviderUpdate = {
          name: form.name,
          base_url: form.base_url,
          default_model: form.default_model,
          model_type: form.model_type,
          platform: form.platform,
          is_active: form.is_active,
          is_default: form.is_default,
        };
        if (form.api_key) update.api_key = form.api_key;
        await updateLLMProvider(editingProvider.id, update);
      } else {
        await createLLMProvider(form);
      }
      setOpenDialog(false);
      load();
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (p: LLMProvider) => {
    if (!window.confirm(`Confirm delete ${p.name} (${p.provider})?`)) return;
    try {
      await deleteLLMProvider(p.id);
      load();
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  };

  const handleTest = async (p: LLMProvider) => {
    const key = `${p.provider}-${p.platform || 'global'}`;
    setTestingId(key);
    try {
      const result = await testLLMProvider(p.id);
      setTestResults((prev) => ({
        ...prev,
        [key]: { status: result.status, msg: result.detail || `Models: ${result.available_models?.join(', ') || 'N/A'}` },
      }));
    } catch (e: unknown) {
      setTestResults((prev) => ({ ...prev, [key]: { status: 'error', msg: (e as Error).message } }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>LLM Providers Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          New Provider
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#EDF0F4' }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Platform</TableCell>
                  <TableCell>Base URL</TableCell>
                  <TableCell>Default Model</TableCell>
                  <TableCell>Model Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Default</TableCell>
                  <TableCell>API Key</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                ) : providers.length === 0 ? (
                  <TableRow><TableCell colSpan={10} align="center">No data</TableCell></TableRow>
                ) : (
                  providers.map((p) => {
                    const testKey = `${p.provider}-${p.platform || 'global'}`;
                    const testRes = testResults[testKey];
                    return (
                      <TableRow key={testKey} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{p.name}</TableCell>
                        <TableCell><Chip label={p.provider} size="small" /></TableCell>
                        <TableCell>{p.platform || 'global'}</TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.base_url}</TableCell>
                        <TableCell>{p.default_model}</TableCell>
                        <TableCell>
                          <Chip
                            label={MODEL_TYPE_OPTIONS.find((o) => o.value === p.model_type)?.label || p.model_type}
                            size="small"
                            variant="outlined"
                            color={p.model_type === 'diagnosis' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          {p.is_active ? (
                            <Chip icon={<CheckCircleIcon />} label="Active" color="success" size="small" />
                          ) : (
                            <Chip icon={<CancelIcon />} label="Disabled" color="default" size="small" />
                          )}
                        </TableCell>
                        <TableCell>{p.is_default ? <Chip label="Default" color="primary" size="small" /> : '—'}</TableCell>
                        <TableCell>
                          <Box sx={flexRowGap1}>
                            <code style={{ fontSize: 12 }}>{p.api_key_masked}</code>
                            {testingId === testKey ? (
                              <CircularProgress size={16} />
                            ) : testRes ? (
                              <Tooltip title={testRes.msg || testRes.status}>
                                <Chip
                                  label={testRes.status === 'ok' ? 'Test Passed' : 'Test Failed'}
                                  color={testRes.status === 'ok' ? 'success' : 'error'}
                                  size="small"
                                />
                              </Tooltip>
                            ) : (
                              <Tooltip title="Test Connectivity">
                                <IconButton size="small" onClick={() => handleTest(p)}><TestIcon fontSize="small" /></IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleOpenEdit(p)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete(p)}><DeleteIcon fontSize="small" /></IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProvider ? 'Edit Provider' : 'New Provider'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              freeSolo
              options={Object.keys(PROVIDER_GUIDES)}
              value={form.provider}
              onChange={(_, newValue) => setForm({ ...form, provider: newValue || '' })}
              onInputChange={(_, newInput) => setForm({ ...form, provider: newInput })}
              disabled={!!editingProvider}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Provider Identifier"
                  required
                  size="small"
                  helperText="Enter moonshot / opencode / zhipu / jina for auto-suggest, or custom-openai / custom-anthropic for custom"
                />
              )}
            />
            {providerGuide && !editingProvider && (
              <Alert
                severity="info"
                icon={false}
                sx={{ py: 0.5 }}
                action={
                  <Button
                    color="primary"
                    size="small"
                    startIcon={<AutoFixHighIcon />}
                    onClick={handleAutoFill}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    Auto-fill
                  </Button>
                }
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  ✅ Detected:  {providerGuide.name} Official Config
                </Typography>
                <Typography variant="caption" component="div">
                  Base URL: {providerGuide.baseUrl}
                </Typography>
                <Typography variant="caption" component="div">
                  Available models:  {providerGuide.models.length} models
                </Typography>
              </Alert>
            )}
            <TextField
              label="Platform (empty=global)"
              value={form.platform || ''}
              onChange={(e) => setForm({ ...form, platform: e.target.value || null })}
              size="small"
            />
            <TextField
              label="Display Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              size="small"
            />
            <TextField
              label="Base URL"
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              required
              size="small"
            />
            <TextField
              label={editingProvider ? 'API Key (leave empty to keep current)' : 'API Key'}
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              required={!editingProvider}
              type="password"
              size="small"
            />
            {providerGuide && !editingProvider ? (
              <FormControl size="small" fullWidth>
                <InputLabel id="model-select-label">Default Model</InputLabel>
                <Select
                  labelId="model-select-label"
                  label="Default Model"
                  value={form.default_model}
                  onChange={(e) => {
                    const modelId = e.target.value;
                    const modelInfo = providerGuide.models.find((m) => m.id === modelId);
                    setForm({
                      ...form,
                      default_model: modelId,
                      model_type: modelInfo?.type || form.model_type,
                    });
                  }}
                  required
                >
                  {providerGuide.models.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                label="Default Model"
                value={form.default_model}
                onChange={(e) => setForm({ ...form, default_model: e.target.value })}
                required
                size="small"
              />
            )}
            <FormControl size="small" fullWidth>
              <InputLabel id="model-type-label">Model Type</InputLabel>
              <Select
                labelId="model-type-label"
                label="Model Type"
                value={form.model_type}
                onChange={(e) => setForm({ ...form, model_type: e.target.value })}
              >
                {MODEL_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
                label="Active"
              />
              <FormControlLabel
                control={<Switch checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />}
                label="Set as Default"
              />
            </Box>
            <Box>
              <Button size="small" onClick={() => setShowGuide(!showGuide)} sx={{ textTransform: 'none' }}>
                {showGuide ? 'Hide' : 'View'}Full Configuration Guide
              </Button>
              <Collapse in={showGuide}>
                <Alert severity="info" icon={false} sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    📖 Official API Configuration Reference (OpenAI-compatible)
                  </Typography>
                  {Object.entries(PROVIDER_GUIDES).map(([key, guide]) => (
                    <Box key={key} sx={{ mb: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {key} ({guide.name}):
                      </Typography>
                      <Typography variant="caption" component="div">
                        Base URL: {guide.baseUrl}
                      </Typography>
                      <Typography variant="caption" component="div">
                        Models: {guide.models.map((m) => m.id).join(', ')}
                      </Typography>
                      {guide.notes.map((note, i) => (
                        <Typography key={i} variant="caption" component="div" color="text.secondary">
                          • {note}
                        </Typography>
                      ))}
                    </Box>
                  ))}
                </Alert>
              </Collapse>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}