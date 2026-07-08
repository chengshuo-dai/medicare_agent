import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Rating, CircularProgress, Alert, Pagination,
  Card, CardContent, Divider, Grid,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import type { ReviewQueueItem, DocumentReviewLog, ReviewAction } from '../../types/admin';
import { listReviewQueue, reviewDocument, getDocumentReviewHistory } from '../../api/admin';
import { flexRowBetween, flexRowGap1 } from '../../styles/sxUtils';
import { PageHeader } from "../../components/layout/PageHeader";



const REVIEW_STATUS_LABELS: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  pending: { label: 'Pending Review', color: 'warning' },
  agent_reviewed: { label: 'AI Reviewed', color: 'info' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
  revision_requested: { label: 'Revision Needed', color: 'warning' },
};

export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewAction>({ action: 'approve', comments: '', score: undefined });
  const [history, setHistory] = useState<DocumentReviewLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listReviewQueue({
        skip: (page - 1) * pageSize,
        limit: pageSize,
      });
      setItems(res);
      setTotal(res.length);
      if (res.length === pageSize) setTotal(page * pageSize + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch review queue');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const openReview = async (item: ReviewQueueItem) => {
    setSelectedItem(item);
    setReviewForm({ action: 'approve', comments: '', score: item.agent_review_score ?? undefined });
    setDialogOpen(true);
    setHistoryLoading(true);
    try {
      const h = await getDocumentReviewHistory(item.id);
      setHistory(h);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await reviewDocument(selectedItem.id, reviewForm);
      setDialogOpen(false);
      fetchQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const statusChip = (status: string) => {
    const s = REVIEW_STATUS_LABELS[status] || { label: status, color: 'default' };
    return <Chip size="small" label={s.label} color={s.color} variant="outlined" />;
  };

  return (
    <Box>
      <PageHeader title="Case Review Queue" actions={<Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchQueue}>
          Refresh
        </Button>} />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#EDF0F4' }}>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Review Status</TableCell>
              <TableCell>AI Initial Score</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No cases pending review
              </TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Typography sx={{ fontWeight: 500 }}>{item.title}</Typography>
                </TableCell>
                <TableCell><Chip size="small" label="Case Report" /></TableCell>
                <TableCell>{statusChip(item.review_status)}</TableCell>
                <TableCell>
                  {item.agent_review_score !== null ? (
                    <Box sx={flexRowGap1}>
                      <Rating value={item.agent_review_score / 20} readOnly precision={0.5} size="small" />
                      <Typography variant="body2">{item.agent_review_score.toFixed(1)}</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Not scored</Typography>
                  )}
                </TableCell>
                <TableCell>{new Date(item.created_at).toLocaleString('zh-CN')}</TableCell>
                <TableCell align="right">
                  <Button size="small" variant="outlined" onClick={() => openReview(item)}>
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {total > pageSize && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_, p) => setPage(p)} />
        </Box>
      )}

      {/* Review Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={flexRowGap1}>
            <HistoryIcon />
            Case Review — {selectedItem?.title}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedItem?.agent_review_notes && (
            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#EDF0F4' }}>
              <CardContent>
                <Typography variant="subtitle2" color="primary" gutterBottom>AI Initial Review Notes</Typography>
                <Typography variant="body2">{selectedItem.agent_review_notes}</Typography>
                {selectedItem.agent_review_score !== null && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Initial Score: </Typography>
                    <Rating value={selectedItem.agent_review_score / 20} readOnly precision={0.5} size="small" />
                    <Typography variant="body2">{selectedItem.agent_review_score.toFixed(1)}/100</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" gutterBottom>Review Decision</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant={reviewForm.action === 'approve' ? 'contained' : 'outlined'}
                  color="success" startIcon={<CheckCircleIcon />}
                  onClick={() => setReviewForm(f => ({ ...f, action: 'approve' }))}
                  fullWidth
                >
                  Approve
                </Button>
                <Button
                  variant={reviewForm.action === 'reject' ? 'contained' : 'outlined'}
                  color="error" startIcon={<CancelIcon />}
                  onClick={() => setReviewForm(f => ({ ...f, action: 'reject' }))}
                  fullWidth
                >
                  Reject
                </Button>
                <Button
                  variant={reviewForm.action === 'request_revision' ? 'contained' : 'outlined'}
                  color="warning"
                  onClick={() => setReviewForm(f => ({ ...f, action: 'request_revision' }))}
                  fullWidth
                >
                  Revision Needed
                </Button>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" gutterBottom>Score (0-100)</Typography>
              <TextField
                fullWidth type="number" size="small"
                slotProps={{ htmlInput: { min: 0, max: 100 } }}
                value={reviewForm.score ?? ''}
                onChange={e => setReviewForm(f => ({ ...f, score: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth multiline rows={4} label="Review Comments"
                value={reviewForm.comments || ''}
                onChange={e => setReviewForm(f => ({ ...f, comments: e.target.value }))}
                placeholder="Enter review comments or revision suggestions..."
              />
            </Grid>
          </Grid>

          {history.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Review History</Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {history.map(h => (
                  <Card key={h.id} variant="outlined" sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                      <Box sx={flexRowBetween}>
                        <Chip size="small" label={h.action} color={h.action === 'approve' ? 'success' : h.action === 'reject' ? 'error' : 'warning'} />
                        <Typography variant="caption" color="text.secondary">{new Date(h.reviewed_at).toLocaleString('zh-CN')}</Typography>
                      </Box>
                      {h.comments && <Typography variant="body2" sx={{ mt: 0.5 }}>{h.comments}</Typography>}
                      {h.score !== null && <Typography variant="caption" color="text.secondary">Score: {h.score}</Typography>}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </>
          )}
          {historyLoading && <CircularProgress size={20} sx={{ mt: 1 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'Submit Review'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}