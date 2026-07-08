import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Tabs, Tab, Tooltip, CircularProgress,
  Alert, Pagination, FormControlLabel, Grid, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { DocumentItem, DocumentCreate, DocumentUpdate, DocumentType } from '../../types/admin';
import { PageHeader } from "../../components/layout/PageHeader";
import {
  listDocuments, createDocument, updateDocument, deleteDocument, toggleDocumentActive,
} from '../../api/admin';

const DOC_TYPE_OPTIONS: DocumentType[] = ['platform_guideline', 'drug_reference'];

const DEPARTMENT_OPTIONS = [
  'Internal Medicine', 'Surgery', 'Obstetrics & Gynecology', 'Pediatrics', 'Orthopedics', 'Neurology', 'Cardiology',
  'Pulmonology', 'Gastroenterology', 'Endocrinology', 'Oncology', 'Emergency Medicine', 'ICU',
  'Dermatology', 'Ophthalmology', 'ENT', 'Stomatology', 'Psychiatry', 'Rehabilitation', 'General Practice',
];

interface TabState {
  tab: number;
  page: number;
  search: string;
  isActive: boolean | null;
}

export default function KnowledgeBasePage() {
  const [tabs, setTabs] = useState<TabState>({ tab: 0, page: 1, search: '', isActive: null });
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [form, setForm] = useState<DocumentCreate>({
    title: '', content: '', doc_type: 'platform_guideline',
    source_url: null, department: null, disease_tags: [], drug_name: null,
    language: 'zh', is_featured: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentDocType = DOC_TYPE_OPTIONS[tabs.tab];

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDocuments({
        doc_type: currentDocType,
        search: tabs.search || undefined,
        is_active: tabs.isActive ?? undefined,
        skip: (tabs.page - 1) * pageSize,
        limit: pageSize,
      });
      setDocs(res);
      setTotal(res.length);
      if (res.length === pageSize) {
        setTotal(tabs.page * pageSize + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, [tabs.tab, tabs.page, tabs.search, tabs.isActive, currentDocType]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleTabChange = (_: React.SyntheticEvent, newTab: number) => {
    setTabs({ tab: newTab, page: 1, search: '', isActive: null });
  };

  const openCreate = () => {
    setEditingDoc(null);
    setForm({
      title: '', content: '', doc_type: currentDocType,
      source_url: null, department: null, disease_tags: [], drug_name: null,
      language: 'zh', is_featured: false,
    });
    setFile(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (doc: DocumentItem) => {
    setEditingDoc(doc);
    setForm({
      title: doc.title,
      content: '', // content not in list view, will fetch if needed
      doc_type: doc.doc_type,
      source_url: doc.source_url || null,
      department: doc.department,
      disease_tags: doc.disease_tags || [],
      drug_name: doc.drug_name,
      language: 'zh',
      is_featured: doc.is_featured,
    });
    setFile(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    // Validation: need title + (content or file)
    if (!form.title.trim()) {
      setFormError('Title cannot be empty');
      return;
    }
    if (!editingDoc && !file && !form.content.trim()) {
      setFormError('Please upload a file or enter content');
      return;
    }
    if (editingDoc && !form.content.trim()) {
      setFormError('Content cannot be empty');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editingDoc) {
        const update: DocumentUpdate = {};
        if (form.title) update.title = form.title;
        if (form.content) update.content = form.content;
        if (form.source_url !== undefined) update.source_url = form.source_url;
        if (form.department !== undefined) update.department = form.department;
        if (form.disease_tags !== undefined) update.disease_tags = form.disease_tags;
        if (form.drug_name !== undefined) update.drug_name = form.drug_name;
        if (form.is_featured !== undefined) update.is_featured = form.is_featured;
        await updateDocument(editingDoc.id, update);
      } else {
        await createDocument({ ...form, file: file || undefined });
      }
      setDialogOpen(false);
      fetchDocs();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirm delete this document? This cannot be undone.')) return;
    try {
      await deleteDocument(id);
      fetchDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleToggle = async (doc: DocumentItem) => {
    try {
      await toggleDocumentActive(doc.id);
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, is_active: !d.is_active } : d));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  const statusChip = (isActive: boolean) => (
    <Chip size="small" label={isActive ? 'Enabled' : 'Disabled'}
      color={isActive ? 'success' : 'default'} variant="outlined" />
  );

  const reviewChip = (status: string) => {
    const map: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
      approved: { label: 'Reviewed', color: 'success' },
      pending: { label: 'Pending Review', color: 'warning' },
      agent_reviewed: { label: 'AI Reviewed', color: 'info' },
      rejected: { label: 'Rejected', color: 'error' },
      revision_requested: { label: 'Revision Needed', color: 'warning' },
    };
    const s = map[status] || { label: status, color: 'default' };
    return <Chip size="small" label={s.label} color={s.color} variant="outlined" />;
  };

  return (
    <Box>
      <PageHeader title="Knowledge Base" actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Document
        </Button>} />

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabs.tab} onChange={handleTabChange}>
          <Tab label="Platform Guidelines" />
          <Tab label="Core Drug Reference" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth size="small" placeholder="Search by title..."
              value={tabs.search} onChange={e => setTabs(t => ({ ...t, search: e.target.value, page: 1 }))}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={tabs.isActive === null ? '' : String(tabs.isActive)}
                onChange={e => {
                  const v = e.target.value;
                  setTabs(t => ({ ...t, isActive: v === '' ? null : v === 'true', page: 1 }));
                }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Enabled</MenuItem>
                <MenuItem value="false">Disabled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchDocs} fullWidth>
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#EDF0F4' }}>
              <TableCell>Title</TableCell>
              <TableCell>Dept./Tags</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Review Status</TableCell>
              <TableCell>Chunks</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && docs.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : docs.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No documents
              </TableCell></TableRow>
            ) : docs.map(doc => (
              <TableRow key={doc.id} hover>
                <TableCell>
                  <Typography sx={{ fontWeight: 500 }}>{doc.title}</Typography>
                  {doc.is_featured && <Chip size="small" label="Featured" color="primary" sx={{ mt: 0.5 }} />}
                </TableCell>
                <TableCell>
                  {doc.department && <Chip size="small" label={doc.department} sx={{ mr: 0.5 }} />}
                  {doc.disease_tags?.slice(0, 2).map(tag => (
                    <Chip key={tag} size="small" label={tag} variant="outlined" sx={{ mr: 0.5 }} />
                  ))}
                  {doc.drug_name && <Chip size="small" label={doc.drug_name} color="secondary" />}
                </TableCell>
                <TableCell>{statusChip(doc.is_active)}</TableCell>
                <TableCell>{reviewChip(doc.review_status)}</TableCell>
                <TableCell>{doc.chunk_count}</TableCell>
                <TableCell>{new Date(doc.updated_at).toLocaleString('en-US')}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(doc)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Toggle"><Switch size="small" checked={doc.is_active} onChange={() => handleToggle(doc)} /></Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(doc.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {total > pageSize && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={Math.ceil(total / pageSize)} page={tabs.page}
            onChange={(_, p) => setTabs(t => ({ ...t, page: p }))} />
        </Box>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingDoc ? 'Edit Document' : 'New Document'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}

          {/* ── Top upload zone: between title bar and form fields ── */}
          {!editingDoc && (
            <Box sx={{
              border: '2px dashed',
              borderColor: 'primary.main',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              mb: 2,
              bgcolor: 'action.hover',
            }}>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                style={{ display: 'none' }}
                id="doc-upload-input"
                onChange={e => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  if (f && !form.title.trim()) {
                    const name = f.name.replace(/\.(pdf|docx|txt)$/i, '');
                    setForm(prev => ({ ...prev, title: name }));
                  }
                }}
              />
              <label htmlFor="doc-upload-input">
                <Button component="span" variant="contained" size="small">
                  {file ? 'Change File' : '📎 Upload Document'}
                </Button>
              </label>
              {file ? (
                <Typography variant="body2" sx={{ mt: 1.5 }}>
                  Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                  <br />
                  <Typography component="span" variant="caption" color="text.secondary">
                    Content will be auto-parsed, chunked, and indexed below
                  </Typography>
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                  Supports PDF, Word (.docx), plain text (.txt)
                </Typography>
              )}
            </Box>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Title" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                freeSolo options={DEPARTMENT_OPTIONS}
                value={form.department || ''}
                onChange={(_, v) => setForm(f => ({ ...f, department: v || null }))}
                renderInput={params => <TextField {...params} label="Department" />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Source URL" value={form.source_url || ''}
                onChange={e => setForm(f => ({ ...f, source_url: e.target.value || null }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                multiple freeSolo options={[]}
                value={form.disease_tags || []}
                onChange={(_, v) => setForm(f => ({ ...f, disease_tags: v }))}
                renderInput={params => <TextField {...params} label="Disease Tags" placeholder="Press Enter to add" />}
              />
            </Grid>
            {currentDocType === 'drug_reference' && (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Drug Name" value={form.drug_name || ''}
                  onChange={e => setForm(f => ({ ...f, drug_name: e.target.value || null }))} />
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Switch checked={form.is_featured}
                  onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />}
                label="Set as Featured"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={8} label={file ? 'Content (optional supplement)' : 'Content (Markdown supported)'}
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder={file ? 'File uploaded, you can add supplementary content here...' : 'Enter document content, system will auto-chunk and build vector index...'}
                disabled={!!file && !editingDoc}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}