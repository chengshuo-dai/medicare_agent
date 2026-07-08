import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import type { LabReportResult } from '../types/agent';

interface Props {
  report: LabReportResult;
  onConfirm?: () => void;
  confirmed?: boolean;
}

const sagePrimary = '#7D9B76';
const abnormalColor = '#D32F2F';
const normalColor = '#2F855A';

export default function LabReportCard({ report, onConfirm, confirmed }: Props) {
  const hasError = !!report.error;
  const needsReview = report.requires_manual_review;

  return (
    <Paper
      elevation={1}
      sx={{
        border: '1px solid',
        borderColor: hasError ? '#FFCDD2' : needsReview ? '#FEF9F2' : '#B8D9BA',
        mb: 1.5,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: hasError ? '#FFEBEE' : needsReview ? '#FFF8E1' : '#F0F7F0',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {hasError ? (
          <ErrorIcon fontSize="small" sx={{ color: '#D32F2F' }} />
        ) : needsReview ? (
          <WarningIcon fontSize="small" sx={{ color: '#F57C00' }} />
        ) : (
          <CheckCircleIcon fontSize="small" sx={{ color: normalColor }} />
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {hasError ? 'Parse Failed' : needsReview ? 'Needs Manual Review' : 'Parse Complete'}
        </Typography>
        {!hasError && (
          <Chip
            label={`Confidence: ${Math.round(report.overall_confidence * 100)}%`}
            size="small"
            sx={{
              ml: 'auto',
              fontSize: 12,
              height: 22,
              bgcolor: report.overall_confidence >= 0.7 ? '#B8D9BA' : '#FFE0B2',
              color: report.overall_confidence >= 0.7 ? normalColor : '#C05621',
            }}
          />
        )}
      </Box>

      {hasError ? (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" color="error">
            {report.error}
          </Typography>
        </Box>
      ) : report.indicators.length > 0 ? (
        <TableContainer>
          <Table size="small" sx={{ minWidth: 480 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>Indicator</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>Result</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>Reference Range</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.indicators.map((ind, i) => (
                <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ fontSize: 13 }}>
                    {ind.indicator_name}
                    {ind.loinc_code && (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                        ({ind.loinc_code})
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 500 }}>
                    {ind.value}{ind.unit && ` ${ind.unit}`}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {ind.reference_range || '-'}
                  </TableCell>
                  <TableCell>
                    {ind.abnormal ? (
                      <Chip
                        label={ind.abnormal_direction === 'high' ? '↑ High' : '↓ Low'}
                        size="small"
                        sx={{ fontSize: 11, height: 20, bgcolor: '#FFEBEE', color: abnormalColor }}
                      />
                    ) : (
                      <Chip
                        label="Normal"
                        size="small"
                        sx={{ fontSize: 11, height: 20, bgcolor: '#F0F7F0', color: normalColor }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Unable to extract indicator data from report
          </Typography>
        </Box>
      )}

      {onConfirm && !confirmed && !hasError && (
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0' }}>
          <Button
            size="small"
            variant="contained"
            onClick={onConfirm}
            sx={{
              bgcolor: sagePrimary,
              '&:hover': { bgcolor: '#5C7A55' },
              textTransform: 'none',
              fontSize: 13,
            }}
          >
            Confirm Report
          </Button>
        </Box>
      )}

      {confirmed && (
        <Box sx={{ px: 2, py: 1, borderTop: '1px solid #E2E8F0' }}>
          <Typography variant="caption" color="text.secondary">
            ✓ Report confirmed, data included in diagnosis analysis
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
