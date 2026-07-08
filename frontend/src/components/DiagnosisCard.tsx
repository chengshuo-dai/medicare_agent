import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Collapse,
  IconButton,
  Divider,
  Stack,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ScienceIcon from '@mui/icons-material/Science';
import MedicationIcon from '@mui/icons-material/Medication';
import EventNoteIcon from '@mui/icons-material/EventNote';
import type { DiagnosisReport } from '../types/agent';
import { flexRowGap1, flexRowGap1Mb05 } from '../styles/sxUtils';


interface Props { report: DiagnosisReport; }

function ConfidenceStars({ level }: { level: string }) {
  const count = level === 'high' ? 5 : level === 'medium' ? 3 : 1;
  return (
    <Box sx={{ color: '#F57C00', fontSize: 14 }}>
      {'⭐'.repeat(count)}{'☆'.repeat(5 - count)}
    </Box>
  );
}

export default function DiagnosisCard({ report }: Props) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card sx={{ mt: 1.5, borderLeft: '4px solid #7D9B76', background: '#F0F3EE', '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }, transition: 'box-shadow 0.2s' }}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={flexRowGap1}>
            <LocalHospitalIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>Diagnosis Report</Typography>
          </Box>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>Preliminary Diagnosis</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>{report.primary_diagnosis}</Typography>
              {report.icd11_code && (
                <Chip label={report.icd11_code} size="small" variant="outlined" sx={{ borderColor: '#D9D6CE', color: 'text.secondary' }} />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Confidence:</Typography>
              <ConfidenceStars level={report.confidence} />
              <Chip label={report.confidence === 'high' ? 'High' : report.confidence === 'medium' ? 'Medium' : 'Low'} size="small"
                color={report.confidence === 'high' ? 'success' : report.confidence === 'medium' ? 'warning' : 'error'}
                sx={{ height: 20, fontSize: 12 }} />
            </Box>
          </Box>

          {report.differential_diagnoses && report.differential_diagnoses.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>Differential Diagnosis</Typography>
              <Stack spacing={1}>
                {report.differential_diagnoses.map((d, i) => (
                  <Box key={i} sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 2, border: '1px solid #D9D6CE' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {d.diagnosis}
                      {d.icd11_code ? <span style={{ color: 'text.secondary', fontSize: 12 }}> (ICD-11: {d.icd11_code})</span> : null}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{d.reasoning}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {report.recommended_exams && report.recommended_exams.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={flexRowGap1Mb05}>
                <ScienceIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>Recommended Exams</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {report.recommended_exams.map((exam, i) => (
                  <Chip key={i} label={exam} size="small" sx={{ bgcolor: '#D9D6CE', color: 'text.primary' }} />
                ))}
              </Box>
            </Box>
          )}

          {report.treatment_suggestions && report.treatment_suggestions.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={flexRowGap1Mb05}>
                <MedicationIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>Treatment Suggestions</Typography>
              </Box>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {report.treatment_suggestions.map((s, i) => (
                  <li key={i}><Typography variant="body2" sx={{ color: 'text.primary' }}>{s}</Typography></li>
                ))}
              </ul>
            </Box>
          )}

          {report.follow_up_plan && (
            <Box sx={{ mb: 2 }}>
              <Box sx={flexRowGap1Mb05}>
                <EventNoteIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>Follow-up Plan</Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.primary', bgcolor: 'background.paper', p: 1.5, borderRadius: 2 }}>{report.follow_up_plan}</Typography>
            </Box>
          )}

          {(report.red_flags && report.red_flags.length > 0) || report.referral_needed ? (
            <>
              <Divider sx={{ my: 1.5, borderColor: '#D9D6CE' }} />
              <Box>
                {report.red_flags && report.red_flags.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                    <WarningAmberIcon sx={{ color: 'error.main', fontSize: 18, mt: 0.2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'error.main' }}>Warning Signs</Typography>
                      {report.red_flags.map((flag, i) => (
                        <Typography key={i} variant="body2" sx={{ color: 'error.main', fontSize: 13 }}>• {flag}</Typography>
                      ))}
                    </Box>
                  </Box>
                )}
                {report.referral_needed && (
                  <Button size="small" variant="contained" color="error" startIcon={<LocalHospitalIcon />} sx={{ borderRadius: 2, textTransform: 'none' }}>
                    Referral suggested: {report.referral_reason || 'Please seek medical attention promptly'}
                  </Button>
                )}
              </Box>
            </>
          ) : null}
        </Collapse>
      </CardContent>
    </Card>
  );
}