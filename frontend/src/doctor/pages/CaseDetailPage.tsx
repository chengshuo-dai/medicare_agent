import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  SmartToy as SmartToyIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Healing as HealingIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { getCaseDetail, addComment, sendPlanInstruction } from '../../api/doctor';
import type { CaseDetail } from '../../api/doctor';
import { flexRowGap05Mb05, flexRowGap1, flexRowGap15, flexRowGap1Mb1 } from '../../styles/sxUtils';


interface PatientInfo {
  age: number;
  gender: string;
  allergies: string[];
  height?: string;
  weight?: string;
  bloodType?: string;
}

interface TimelineEvent {
  label: string;
  date: string;
  description?: string;
}

interface StructuredReport {
  primary_diagnosis: string;
  confidence: string;
  differential_diagnoses: Array<{ name: string; probability: string }>;
  suggested_exams: string[];
  key_findings: string[];
}

/** Demo data */
const MOCK_CASE: CaseDetail & {
  patient_info: PatientInfo;
  timeline: TimelineEvent[];
  structured_report: StructuredReport;
} = {
  id: 'case-001',
  patient_id: 'p-101',
  patient_name: 'Zhang Wei',
  title: 'Persistent chest pain with dyspnea',
  description: 'Patient presents with persistent chest pain over the past 3 days, worsening with activity, accompanied by dyspnea and palpitations. History of hypertension for 5 years.',
  diagnosis: 'Coronary heart disease, unstable angina',
  agent_summary: 'AI analysis suggests high likelihood of acute coronary syndrome. Recommend prompt cardiac enzyme panel and coronary CTA.',
  structured_report: {
    primary_diagnosis: 'Acute coronary syndrome (unstable angina)',
    confidence: '82%',
    differential_diagnoses: [
      { name: 'Acute myocardial infarction', probability: '65%' },
      { name: 'Aortic dissection', probability: '15%' },
      { name: 'Pulmonary embolism', probability: '12%' },
      { name: 'Pneumothorax', probability: '8%' },
    ],
    suggested_exams: [
      'Cardiac enzyme panel (Troponin I/T, CK-MB)',
      '12-lead ECG',
      'Chest CTA or Coronary CTA',
      'D-dimer',
      'Arterial blood gas analysis',
    ],
    key_findings: [
      'Crushing chest pain, lasting >20 minutes',
      'Worsens with activity, slightly relieved by rest',
      'Accompanied by diaphoresis and nausea',
      'BP 160/95mmHg, HR 102 bpm',
    ],
  },
  comments: [
    {
      id: 'c1',
      author: 'Dr. Li',
      content: 'Patient symptoms are typical. Recommend immediate CCU admission, complete relevant tests, and rule out STEMI.',
      created_at: '2025-04-28T09:30:00Z',
    },
    {
      id: 'c2',
      author: 'Dr. Wang',
      content: 'Agree with Dr. Li. Cardiac enzyme panel and ECG have been ordered; results pending.',
      created_at: '2025-04-28T10:15:00Z',
    },
    {
      id: 'c3',
      author: 'AI Assistant',
      content: 'Preliminary treatment plan generated. Recommend repeat ECG within 30 minutes and monitor troponin trends.',
      created_at: '2025-04-28T10:20:00Z',
    },
  ],
  created_at: '2025-04-28T08:00:00Z',
  updated_at: '2025-04-28T10:20:00Z',
  patient_info: {
    age: 58,
    gender: 'Male',
    allergies: ['Penicillin', 'Sulfonamides'],
    height: '172cm',
    weight: '78kg',
    bloodType: 'Type A',
  },
  timeline: [
    { label: 'Triage', date: '2025-04-28 08:00', description: 'ER triage, chief complaint recorded' },
    { label: 'Initial Exam', date: '2025-04-28 08:20', description: 'Vital signs collected, ECG performed' },
    { label: 'AI Assessment', date: '2025-04-28 08:45', description: 'Agent generated structured summary' },
    { label: 'Consultation', date: '2025-04-28 09:30', description: 'Cardiology consultation, treatment plan developed' },
    { label: 'Management', date: '2025-04-28 10:15', description: 'Tests ordered, medication initiated' },
  ],
};

const EXAMPLE_INSTRUCTIONS = ['Schedule follow-up', 'Adjust medication', 'Generate trend report'];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<typeof MOCK_CASE | null>(null);
  const [error, setError] = useState('');
  const [comments, setComments] = useState(MOCK_CASE.comments);
  const [commentInput, setCommentInput] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Plan instruction
  const [instructionInput, setInstructionInput] = useState('');
  const [sendingInstruction, setSendingInstruction] = useState(false);
  const [instructionResult, setInstructionResult] = useState<{
    tasks_created: Array<{ description: string; due_date?: string }>;
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getCaseDetail(caseId || '');
        if (!cancelled) {
          // Map backend timeline format to frontend format
          const mappedTimeline = (data.timeline || []).map((t: any) => ({
            label: t.type || t.intent || 'Event',
            date: t.time ? new Date(t.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
            description: t.summary || t.intent || '',
          }));

          // Build structured report from backend data if available
          const structuredReport = data.structured_report || {
            primary_diagnosis: data.diagnosis || 'Pending diagnosis',
            confidence: 'N/A',
            differential_diagnoses: [],
            suggested_exams: [],
            key_findings: [],
          };

          setCaseData({
            ...MOCK_CASE,
            ...data,
            timeline: mappedTimeline.length ? mappedTimeline : MOCK_CASE.timeline,
            structured_report: structuredReport.primary_diagnosis ? structuredReport : MOCK_CASE.structured_report,
            patient_info: MOCK_CASE.patient_info, // Keep demo patient info until backend provides it
          });
          if (data.comments) setComments(data.comments);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load case details, please try again later');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [caseId]);

  const handleAddComment = async () => {
    if (!commentInput.trim() || !caseId) return;
    setSendingComment(true);
    try {
      await addComment(caseId, commentInput.trim());
      const newComment = {
        id: `c-${Date.now()}`,
        author: 'Current Doctor',
        content: commentInput.trim(),
        created_at: new Date().toISOString(),
      };
      setComments((prev) => [...prev, newComment]);
      setCommentInput('');
    } catch {
      // Demo mode: add locally
      const newComment = {
        id: `c-${Date.now()}`,
        author: 'Current Doctor',
        content: commentInput.trim(),
        created_at: new Date().toISOString(),
      };
      setComments((prev) => [...prev, newComment]);
      setCommentInput('');
    } finally {
      setSendingComment(false);
    }
  };

  const handleSendInstruction = async () => {
    if (!instructionInput.trim() || !caseId) return;
    setSendingInstruction(true);
    setInstructionResult(null);
    try {
      const res = await sendPlanInstruction(caseId, instructionInput.trim());
      setInstructionResult(res);
      setInstructionInput('');
    } catch {
      // Demo mode: simulate response
      setTimeout(() => {
        setInstructionResult({
          message: 'The following tasks have been generated from your instructions:',
          tasks_created: [
            { description: `${instructionInput.trim()} - Task created`, due_date: '2025-05-05' },
            { description: 'Notify patient and schedule appointment', due_date: '2025-05-03' },
            { description: 'Update electronic medical record', due_date: '2025-05-02' },
          ],
        });
        setSendingInstruction(false);
      }, 1200);
      return;
    }
    setSendingInstruction(false);
  };

  const activeStep = caseData ? caseData.timeline.length - 1 : 0;

  return (
    <Box sx={{ bgcolor: '#EDF0F4', minHeight: '100vh', pb: 4 }}>
      {/* Top navigation */}
      <Paper
        elevation={0}
        sx={{
          px: { xs: 2, md: 3 },
          py: 2,
          borderRadius: 0,
          borderBottom: '1px solid #CBD5E0',
          bgcolor: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={flexRowGap15}>
          <IconButton onClick={() => navigate('/doctor/cases')} sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, lineHeight: 1.3 }}>
              {loading ? <Skeleton width={220} /> : caseData?.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
              <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {loading ? <Skeleton width={120} /> : `Patient: ${caseData?.patient_name}`}
              </Typography>
              {!loading && caseData && (
                <Chip
                  label={caseData.diagnosis || 'Pending diagnosis'}
                  size="small"
                  color="primary"
                  sx={{ height: 22, fontSize: '0.75rem', fontWeight: 500 }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 3 }, pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

 <Grid container spacing={3}>
          {/* Left main area */}
 <Grid size={{ xs: 12, md: 8 }}>
            {/* Agent summary card */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <SmartToyIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Agent Structured Summary
                  </Typography>
                </Box>

                {loading ? (
                  <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
                ) : caseData?.structured_report ? (
 <Grid container spacing={2}>
 <Grid>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'primary.light' }}>
                        <Typography variant="caption" sx={{ color: '#2D3748', fontWeight: 600 }}>
                          Primary Diagnosis
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.5 }}>
                          {caseData.structured_report.primary_diagnosis}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={`Confidence: ${caseData.structured_report.confidence}`}
                            size="small"
                            sx={{ bgcolor: '#2D3748', color: '#fff', fontWeight: 500 }}
                          />
                        </Box>
                      </Paper>
                    </Grid>

 <Grid>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#FEF9F2' }}>
                        <Typography variant="caption" sx={{ color: '#C05621', fontWeight: 600 }}>
                          Differential Diagnosis (Probability)
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                          {caseData.structured_report.differential_diagnoses.map((d) => (
                            <Chip
                              key={d.name}
                              label={`${d.name} ${d.probability}`}
                              size="small"
                              variant="outlined"
                              sx={{ borderColor: '#C05621', color: '#C05621', fontWeight: 500 }}
                            />
                          ))}
                        </Box>
                      </Paper>
                    </Grid>

 <Grid>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Key Findings
                        </Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
                          {caseData.structured_report.key_findings.map((f, idx) => (
                            <Typography component="li" variant="body2" key={idx} sx={{ color: 'text.primary', py: 0.25 }}>
                              {f}
                            </Typography>
                          ))}
                        </Box>
                      </Paper>
                    </Grid>

 <Grid>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F0F7F0' }}>
                        <Box sx={flexRowGap05Mb05}>
                          <ScienceIcon sx={{ fontSize: 16, color: '#2F855A' }} />
                          <Typography variant="caption" sx={{ color: '#2F855A', fontWeight: 600 }}>
                            Recommended Tests
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                          {caseData.structured_report.suggested_exams.map((exam) => (
                            <Chip
                              key={exam}
                              label={exam}
                              size="small"
                              sx={{ bgcolor: '#B8D9BA', color: '#2F855A', fontWeight: 500 }}
                            />
                          ))}
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                ) : null}
              </CardContent>
            </Card>

            {/* Medical timeline */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>
                  Medical Timeline
                </Typography>
                {loading ? (
                  <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
                ) : (
                  <Stepper activeStep={activeStep} alternativeLabel>
                    {caseData?.timeline.map((event, index) => (
                      <Step key={index}>
                        <StepLabel>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {event.label}
                          </Typography>
                          <Typography variant="caption" display="block" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                            {event.date}
                          </Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                )}
                {!loading && caseData && (
                  <Box sx={{ mt: 2, px: 1 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Latest: {caseData.timeline[caseData.timeline.length - 1].description}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Doctor comments section */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>
                  Doctor Comments
                </Typography>

                <List sx={{ py: 0 }}>
                  {comments.map((c) => (
                    <ListItem
                      key={c.id}
                      alignItems="flex-start"
                      sx={{ px: 0, py: 1.5, borderBottom: '1px solid #E8EBF0' }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: c.author === 'AI Assistant' ? 'primary.light' : '#EDE8F6',
                            color: c.author === 'AI Assistant' ? '#2D3748' : '#4A5568',
                            width: 36,
                            height: 36,
                            fontSize: '0.875rem',
                          }}
                        >
                          {c.author === 'AI Assistant' ? <SmartToyIcon sx={{ fontSize: 18 }} /> : c.author[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={flexRowGap1}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                              {c.author}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'secondary.light' }}>
                              {formatDate(c.created_at)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ color: '#4A5568', mt: 0.25, whiteSpace: 'pre-wrap' }}>
                            {c.content}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>

                <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Add comment..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#EDF0F4',
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    disabled={!commentInput.trim() || sendingComment}
                    onClick={handleAddComment}
                    endIcon={sendingComment ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                    sx={{ minWidth: 100, whiteSpace: 'nowrap' }}
                  >
                    Send
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right sidebar */}
 <Grid>
            {/* Patient basic info */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>
                  Patient Info
                </Typography>
                {loading ? (
                  <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={flexRowGap15}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                        {caseData?.patient_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {caseData?.patient_name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          ID: {caseData?.patient_id}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 0.5 }} />

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'secondary.light' }}>
                          Age
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {caseData?.patient_info.age} yrs
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'secondary.light' }}>
                          Gender
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {caseData?.patient_info.gender}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'secondary.light' }}>
                          Height
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {caseData?.patient_info.height}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'secondary.light' }}>
                          Weight
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {caseData?.patient_info.weight}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'secondary.light' }}>
                          Blood Type
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {caseData?.patient_info.bloodType}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 0.5 }} />

                    <Box>
                      <Typography variant="caption" sx={{ color: 'secondary.light', display: 'block', mb: 0.5 }}>
                        Allergies
</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {caseData?.patient_info.allergies.map((a) => (
                          <Chip
                            key={a}
                            label={a}
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ fontWeight: 500 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Natural language instruction entry */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <HealingIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Natural Language Instructions
                  </Typography>
                </Box>

                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                  Tell the Agent your treatment plan in natural language, e.g.:
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                  {EXAMPLE_INSTRUCTIONS.map((text) => (
                    <Button
                      key={text}
                      size="small"
                      variant="outlined"
                      onClick={() => setInstructionInput(text)}
                      sx={{
                        borderColor: 'secondary.light',
                        color: 'text.secondary',
                        textTransform: 'none',
                        fontWeight: 500,
                        borderRadius: 2,
                        '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'primary.light' },
                      }}
                    >
                      {text}
                    </Button>
                  ))}
                </Box>

                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={4}
                  placeholder="Enter instruction, e.g.: Schedule a follow-up CBC in one week..."
                  value={instructionInput}
                  onChange={(e) => setInstructionInput(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#EDF0F4',
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          color="primary"
                          disabled={!instructionInput.trim() || sendingInstruction}
                          onClick={handleSendInstruction}
                          edge="end"
                        >
                          {sendingInstruction ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {sendingInstruction && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, color: 'text.secondary' }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2">Agent is processing instructions...</Typography>
                  </Box>
                )}

                {instructionResult && !sendingInstruction && (
                  <Box sx={{ mt: 2 }}>
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2, bgcolor: 'primary.light', borderColor: '#A0B8D4' }}
                    >
                      <Box sx={flexRowGap1Mb1}>
                        <AssignmentTurnedInIcon color="primary" sx={{ fontSize: 20 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D3748' }}>
                          Agent has generated tasks
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'text.primary', mb: 1 }}>
                        {instructionResult.message}
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {instructionResult.tasks_created.map((task, idx) => (
                          <Box component="li" key={idx} sx={{ mb: 0.5 }}>
                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                              {task.description}
                              {task.due_date && (
                                <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                                  <ScheduleIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.25 }} />
                                  {task.due_date}
                                </Typography>
                              )}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}