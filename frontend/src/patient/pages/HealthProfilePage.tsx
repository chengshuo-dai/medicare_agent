import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Card, CardContent, TextField, Button, Chip,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Grid, Stack, FormControl, InputLabel, Select, MenuItem, OutlinedInput, Checkbox, ListItemText, CircularProgress,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { getProfile, updateProfile } from '../../api/patient';
import type { PatientProfile } from '../../api/patient';
import { flexRowBetweenMb2, pageHeader } from '../../styles/sxUtils';


const sageText = '#2C3E2D';
const sagePrimary = '#7D9B76';
const sageBg = '#F8F5F0';

const CHRONIC_DISEASES: { code: string; name: string; category: string }[] = [
  { code: 'E11', name: 'Type 2 Diabetes', category: 'Endocrine' },
  { code: 'I10', name: 'Essential Hypertension', category: 'Cardiovascular' },
  { code: 'I25', name: 'Coronary Heart Disease', category: 'Cardiovascular' },
  { code: 'I50', name: 'Chronic Heart Failure', category: 'Cardiovascular' },
  { code: 'I48', name: 'Atrial Fibrillation', category: 'Cardiovascular' },
  { code: 'I63', name: 'Cerebral Infarction (Stroke)', category: 'Neurology' },
  { code: 'E78', name: 'Hyperlipidemia', category: 'Endocrine' },
  { code: 'J44', name: 'COPD', category: 'Respiratory' },
  { code: 'J45', name: 'Bronchial Asthma', category: 'Respiratory' },
  { code: 'N18', name: 'Chronic Kidney Disease (CKD)', category: 'Nephrology' },
  { code: 'K76.0', name: 'Fatty Liver', category: 'Gastroenterology' },
  { code: 'B18.1', name: 'Chronic Hepatitis B', category: 'Infectious Disease' },
  { code: 'E05', name: 'Hyperthyroidism', category: 'Endocrine' },
  { code: 'E03', name: 'Hypothyroidism', category: 'Endocrine' },
  { code: 'M81', name: 'Osteoporosis', category: 'Musculoskeletal' },
  { code: 'M06', name: 'Rheumatoid Arthritis', category: 'Immunology' },
  { code: 'M17', name: 'Knee Osteoarthritis', category: 'Musculoskeletal' },
  { code: 'G20', name: 'Parkinson\'s Disease', category: 'Neurology' },
  { code: 'F32', name: 'Depression', category: 'Psychiatry' },
  { code: 'F41', name: 'Anxiety Disorder', category: 'Psychiatry' },
];

export default function HealthProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editProfile, setEditProfile] = useState<PatientProfile | null>(null);
  const [newAllergy, setNewAllergy] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getProfile();
      setProfile(data);
      setEditProfile(data);
    } catch {
      setError('Failed to load, please refresh and try again');
      setProfile(null);
      setEditProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleToggleEdit = () => {
    if (isEditing) {
      // Cancel editing, restore original data
      setEditProfile(profile);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!editProfile) return;
    try {
      const updated = await updateProfile(editProfile);
      setProfile(updated);
      setEditProfile(updated);
      setIsEditing(false);
    } catch {
      setIsEditing(false);
    }
  };

  const handleChange = (field: keyof PatientProfile, value: string | number) => {
    setEditProfile((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleAddAllergy = () => {
    const val = newAllergy.trim();
    if (!val) return;
    setEditProfile((prev) => ({
      ...prev,
      allergies: [...(prev.allergies || []), val],
    }));
    setNewAllergy('');
  };

  const handleRemoveAllergy = (index: number) => {
    setEditProfile((prev) => ({
      ...prev,
      allergies: (prev.allergies || []).filter((_, i) => i !== index),
    }));
  };

  const handleAddDisease = (code: string, name: string) => {
    setEditProfile((prev) => ({
      ...prev,
      chronic_diseases: [...(prev.chronic_diseases || []), { code, name }],
    }));
  };

  const handleRemoveDisease = (code: string) => {
    setEditProfile((prev) => ({
      ...prev,
      chronic_diseases: (prev.chronic_diseases || []).filter((d) => d.code !== code),
    }));
  };

  const handleMedicationChange = (
    index: number,
    field: 'name' | 'dosage' | 'frequency' | 'start_date',
    value: string
  ) => {
    setEditProfile((prev) => {
      const meds = [...(prev.medications || [])];
      meds[index] = { ...meds[index], [field]: value };
      return { ...prev, medications: meds };
    });
  };

  const handleAddMedication = () => {
    setEditProfile((prev) => ({
      ...prev,
      medications: [...(prev.medications || []), { name: '', dosage: '', frequency: '' }],
    }));
  };

  const handleRemoveMedication = (index: number) => {
    setEditProfile((prev) => ({
      ...prev,
      medications: (prev.medications || []).filter((_, i) => i !== index),
    }));
  };

  const display = isEditing ? editProfile : profile;

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: sageBg }}>
      <CircularProgress sx={{ color: sagePrimary }} />
    </Box>
  );

  if (error || !profile) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: sageBg, gap: 2 }}>
      <Typography sx={{ color: '#6B7D6B' }}>{error || 'Failed to load'}</Typography>
      <Button variant="outlined" onClick={fetchProfile} sx={{ color: sagePrimary, borderColor: sagePrimary }}>
        Retry
      </Button>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: sageBg, pb: 6 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={pageHeader}>
          <IconButton onClick={() => navigate('/records')} sx={{ color: sageText }}>
            <ArrowBackIosNewIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700, color: sageText, flex: 1 }}>
            Health Profile
          </Typography>
          <Button
            variant={isEditing ? 'outlined' : 'contained'}
            startIcon={isEditing ? undefined : <EditIcon />}
            onClick={handleToggleEdit}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              color: isEditing ? sagePrimary : '#fff',
              borderColor: sagePrimary,
              bgcolor: isEditing ? 'transparent' : sagePrimary,
              '&:hover': {
                bgcolor: isEditing ? 'rgba(125,155,118,0.08)' : '#5C7A55',
                borderColor: sagePrimary,
              },
            }}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          {isEditing && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                bgcolor: sagePrimary,
                '&:hover': { bgcolor: '#5C7A55' },
              }}
            >
              Save
</Button>
          )}
        </Box>
        {/* Basic information */}
        <Card sx={{ mb: 2, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: sageText, mb: 2, fontWeight: 600 }}>
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              {[
                { label: 'Name', field: 'name' as const, type: 'text' },
                { label: 'Email', field: 'email' as const, type: 'email' },
                { label: 'Phone', field: 'phone' as const, type: 'tel' },
              ].map((item) => (
                <Grid size={{ xs: 12, sm: 6 }} key={item.field}>
                  {isEditing ? (
                    <TextField fullWidth label={item.label} type={item.type}
                      value={display[item.field] ?? ''}
                      onChange={(e) => handleChange(item.field, e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  ) : (
                    <Box>
                      <Typography variant="caption" sx={{ color: '#6B7D6B' }}>{item.label}</Typography>
                      <Typography variant="body1" sx={{ color: sageText, fontWeight: 500 }}>{display[item.field] ?? '—'}</Typography>
                    </Box>
                  )}
                </Grid>
              ))}

              <Grid size={{ xs: 12, sm: 6 }}>
                {isEditing ? (
                  <FormControl fullWidth>
                    <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary' }}>
                      Date of Birth
                    </Typography>
                    <TextField fullWidth type="date"
                      value={display.date_of_birth ?? ''}
                      onChange={(e) => handleChange('date_of_birth', e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </FormControl>
                ) : (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6B7D6B' }}>Date of Birth</Typography>
                    <Typography variant="body1" sx={{ color: sageText, fontWeight: 500 }}>{display.date_of_birth ?? '—'}</Typography>
                  </Box>
                )}
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                {isEditing ? (
                  <FormControl fullWidth>
                    <InputLabel>Gender</InputLabel>
                    <Select value={display.gender || ''} label="Gender"
                      onChange={(e) => handleChange('gender', e.target.value)}
                      sx={{ borderRadius: 2 }}>
                      <MenuItem value=""><em>Please select</em></MenuItem>
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6B7D6B' }}>Gender</Typography>
                    <Typography variant="body1" sx={{ color: sageText, fontWeight: 500 }}>
                      {{ male: 'Male', female: 'Female' }[display.gender || ''] || display.gender || '—'}
                    </Typography>
                  </Box>
                )}
              </Grid>

              {[
                { label: 'Height (cm)', field: 'height' as const, type: 'number' },
                { label: 'Weight (kg)', field: 'weight' as const, type: 'number' },
              ].map((item) => (
                <Grid size={{ xs: 12, sm: 6 }} key={item.field}>
                  {isEditing ? (
                    <TextField fullWidth label={item.label} type={item.type}
                      value={display[item.field] ?? ''}
                      onChange={(e) => handleChange(item.field, Number(e.target.value))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  ) : (
                    <Box>
                      <Typography variant="caption" sx={{ color: '#6B7D6B' }}>{item.label}</Typography>
                      <Typography variant="body1" sx={{ color: sageText, fontWeight: 500 }}>{display[item.field] ?? '—'}</Typography>
                    </Box>
                  )}
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card sx={{ mb: 2, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: sageText, mb: 2, fontWeight: 600 }}>
              Allergies
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {(display.allergies || []).map((allergy, idx) => (
                <Chip
                  key={`${allergy}-${idx}`}
                  label={allergy}
                  onDelete={isEditing ? () => handleRemoveAllergy(idx) : undefined}
                  sx={{
                    bgcolor: 'rgba(125,155,118,0.15)',
                    color: sagePrimary,
                    fontWeight: 500,
                    '& .MuiChip-deleteIcon': { color: sagePrimary },
                  }}
                />
              ))}
              {!(display.allergies || []).length && !isEditing && (
                <Typography variant="body2" sx={{ color: '#6B7D6B' }}>
                  No data
                </Typography>
              )}
            </Stack>
            {isEditing && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Add allergen"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddAllergy();
                  }}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddAllergy}
                  sx={{
                    bgcolor: sagePrimary,
                    '&:hover': { bgcolor: '#5C7A55' },
                    borderRadius: 2,
                    textTransform: 'none',
                  }}
                >
                  Add
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Chronic diseases */}
        <Card sx={{ mb: 2, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: sageText, mb: 2, fontWeight: 600 }}>
              Chronic Diseases
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {(display.chronic_diseases || []).map((d) => (
                <Chip
                  key={d.code}
                  label={`${d.name} (${d.code})`}
                  onDelete={isEditing ? () => handleRemoveDisease(d.code) : undefined}
                  sx={{
                    bgcolor: 'rgba(107,125,107,0.12)',
                    color: '#6B7D6B',
                    fontWeight: 500,
                    '& .MuiChip-deleteIcon': { color: '#6B7D6B' },
                  }}
                />
              ))}
              {!(display.chronic_diseases || []).length && !isEditing && (
                <Typography variant="body2" sx={{ color: '#6B7D6B' }}>No data</Typography>
              )}
            </Stack>
            {isEditing && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Select Chronic Diseases</InputLabel>
                <Select
                  multiple
                  value={(editProfile.chronic_diseases || []).map((d) => d.code)}
                  onChange={(e) => {
                    const codes = e.target.value as string[];
                    const selected = CHRONIC_DISEASES.filter((d) => codes.includes(d.code));
                    setEditProfile((prev) => ({ ...prev, chronic_diseases: selected.map((s) => ({ code: s.code, name: s.name })) }));
                  }}
                  input={<OutlinedInput label="Select Chronic Diseases" />}
                  renderValue={(selected) => selected.map((c) => CHRONIC_DISEASES.find((d) => d.code === c)?.name).join(', ')}
                  sx={{ borderRadius: 2 }}
                >
                  {CHRONIC_DISEASES.map((d) => (
                    <MenuItem key={d.code} value={d.code}>
                      <Checkbox checked={(editProfile.chronic_diseases || []).some((cd) => cd.code === d.code)} />
                      <ListItemText primary={`${d.name} (${d.code})`} secondary={d.category} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </CardContent>
        </Card>

        {/* Medication records */}
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Box sx={flexRowBetweenMb2}>
              <Typography variant="h6" sx={{ color: sageText, fontWeight: 600 }}>
                Medication Records
              </Typography>
              {isEditing && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddMedication}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    color: sagePrimary,
                    borderColor: sagePrimary,
                    '&:hover': { borderColor: '#5C7A55', bgcolor: 'rgba(125,155,118,0.06)' },
                  }}
                >
                  Add Medication
                </Button>
              )}
            </Box>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(125,155,118,0.08)' }}>
                    <TableCell sx={{ color: sageText, fontWeight: 600 }}>Medication Name</TableCell>
                    <TableCell sx={{ color: sageText, fontWeight: 600 }}>Dosage</TableCell>
                    <TableCell sx={{ color: sageText, fontWeight: 600 }}>Frequency</TableCell>
                    {isEditing && <TableCell sx={{ color: sageText, fontWeight: 600 }}>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(display.medications || []).map((med, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            size="small"
                            fullWidth
                            value={med.name}
                            onChange={(e) => handleMedicationChange(idx, 'name', e.target.value)}
                            placeholder="Medication name"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                          />
                        ) : (
                          <Typography variant="body2" sx={{ color: sageText }}>
                            {med.name || '—'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            size="small"
                            fullWidth
                            value={med.dosage}
                            onChange={(e) => handleMedicationChange(idx, 'dosage', e.target.value)}
                            placeholder="Dosage"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                          />
                        ) : (
                          <Typography variant="body2" sx={{ color: sageText }}>
                            {med.dosage || '—'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            size="small"
                            fullWidth
                            value={med.frequency}
                            onChange={(e) => handleMedicationChange(idx, 'frequency', e.target.value)}
                            placeholder="Frequency"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                          />
                        ) : (
                          <Typography variant="body2" sx={{ color: sageText }}>
                            {med.frequency || '—'}
                          </Typography>
                        )}
                      </TableCell>
                      {isEditing && (
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveMedication(idx)}
                            sx={{ color: '#D32F2F' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {!(display.medications || []).length && (
                    <TableRow>
                      <TableCell colSpan={isEditing ? 4 : 3} align="center">
                        <Typography variant="body2" sx={{ color: '#6B7D6B', py: 2 }}>
                          No medication records
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}