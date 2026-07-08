import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Alert, CircularProgress,
  Link, ToggleButton, ToggleButtonGroup, InputAdornment, IconButton,
  FormControl, InputLabel, Select, MenuItem, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Person, Phone, LocalHospital } from '@mui/icons-material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { useNavigate } from 'react-router-dom';
import { register, registerDoctor, type RegisterRequest } from '../api/auth';

type Gender = 'male' | 'female';
type Role = 'patient' | 'doctor';

interface ProvinceData { [city: string]: string[] }

interface FormData {
  full_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
  age_years: string;
  age_months: string;
  gender: Gender | '';
  province: string;
  city: string;
  district: string;
  street: string;
  phone: string;
  education: string;
  hospital: string;
  department: string;
  license_number: string;
  title: string;
  years_of_practice: string;
  specialties: string;
  terms: boolean;
}

interface FormErrors { [key: string]: string }

const sagePrimary = '#7D9B76';
const sagePrimaryDark = '#5C7A55';
const sageText = '#2C3E2D';
const sageBg = '#F8F5F0';

const EDUCATION_OPTIONS = ['High School', 'Associate', 'Bachelor', 'Master', 'Doctorate'];
const TITLE_OPTIONS = ['Chief Physician', 'Associate Chief Physician', 'Attending Physician', 'Resident Physician'];

function checkPasswordStrength(password: string): { score: number; label: string; color: 'error' | 'warning' | 'success' } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return { score, label: 'Weak', color: 'error' };
  if (score <= 4) return { score, label: 'Medium', color: 'warning' };
  return { score, label: 'Strong', color: 'success' };
}

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.full_name.trim()) errors.full_name = 'Please enter your name';
  if (!data.email.trim()) errors.email = 'Please enter your email address';
  else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(data.email)) errors.email = 'Please enter a valid email address';
  if (!data.password) errors.password = 'Please enter your password';
  else if (data.password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (!data.confirmPassword) errors.confirmPassword = 'Please confirm your password';
  else if (data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  if (!data.province) errors.province = 'Please select a province';
  if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) errors.phone = 'Please enter a valid phone number';
  if (data.age_years && (parseInt(data.age_years) < 0 || parseInt(data.age_years) > 120)) errors.age_years = 'Age range 0-120';
  if (data.role === 'doctor') {
    if (!data.hospital?.trim()) errors.hospital = 'Please enter your hospital';
    if (!data.department?.trim()) errors.department = 'Please enter your department';
    if (!data.license_number?.trim()) errors.license_number = 'Please enter your license number';
    if (!data.title) errors.title = 'Please select your title';
  }
  if (!data.terms) errors.terms = 'Please agree to the Terms of Service and Privacy Policy';
  return errors;
}

const emptyForm = (role: Role): FormData => ({
  full_name: '', email: '', password: '', confirmPassword: '', role,
  age_years: '', age_months: '', gender: '', province: '', city: '', district: '',
  street: '', phone: '', education: '', hospital: '', department: '',
  license_number: '', title: '', years_of_practice: '', specialties: '', terms: false,
});

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    '& fieldset': { borderColor: 'rgba(125,155,118,0.25)' },
    '&:hover fieldset': { borderColor: sagePrimary },
    '&.Mui-focused fieldset': { borderColor: sagePrimary },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: sagePrimaryDark },
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [provinceData, setProvinceData] = useState<Record<string, ProvinceData>>({});
  const [formData, setFormData] = useState<FormData>(emptyForm('patient'));
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [termsDialog, setTermsDialog] = useState(false);
  const [privacyDialog, setPrivacyDialog] = useState(false);

  const pwdStrength = checkPasswordStrength(formData.password);
  const strengthPct = Math.min((pwdStrength.score / 6) * 100, 100);
  const isDoctor = formData.role === 'doctor';

  useEffect(() => {
    fetch('/data/pca.json')
      .then((r) => r.json())
      .then(setProvinceData)
      .catch(() => {});
  }, []);

  const provinces = Object.keys(provinceData);
  const cities = formData.province ? Object.keys(provinceData[formData.province] || {}) : [];
  const districts = formData.province && formData.city
    ? (provinceData[formData.province]?.[formData.city] || [])
    : [];

  const setField = useCallback((field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((p) => ({ ...p, [field]: e.target.value }));
    setErrors((p) => { const n = { ...p }; delete n[field]; delete n.general; return n; });
  }, []);

  const setSelectField = useCallback((field: keyof FormData) => (e: { target: { value: string } }) => {
    const val = e.target.value;
    setFormData((p) => {
      const next = { ...p, [field]: val };
      if (field === 'province') { next.city = ''; next.district = ''; }
      if (field === 'city') { next.district = ''; }
      return next;
    });
  }, []);

  const handleRoleChange = useCallback((_: React.MouseEvent, newRole: Role | null) => {
    if (newRole) setFormData(emptyForm(newRole));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ve = validateForm(formData);
    if (Object.keys(ve).length > 0) { setErrors(ve); return; }
    setSubmitting(true);
    setGeneralError('');
    try {
      const payload: RegisterRequest = {
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        full_name: formData.full_name.trim(),
        phone: formData.phone || undefined,
        age_years: formData.age_years ? parseInt(formData.age_years) : null,
        age_months: formData.age_months ? parseInt(formData.age_months) : null,
        gender: formData.gender || null,
        province: formData.province,
        city: formData.city || undefined,
        district: formData.district || undefined,
        street: formData.street || undefined,
        education: formData.education || undefined,
      };
      if (isDoctor) {
        payload.hospital = formData.hospital;
        payload.department = formData.department;
        payload.license_number = formData.license_number;
        payload.title = formData.title;
        payload.years_of_practice = formData.years_of_practice ? parseInt(formData.years_of_practice) : null;
        payload.specialties = formData.specialties || undefined;
      }
      const files = isDoctor ? ((formData as any).uploadFiles as File[] | undefined) : undefined;
      const result = files && files.length > 0
        ? await registerDoctor(payload, files)
        : await register(payload);
      if (result.access_token) {
        navigate('/chat', { replace: true });
      } else {
        navigate('/login', { replace: true, state: { message: result.message || 'Registration successful, please wait for admin approval' } });
      }
    } catch (err) {
      setGeneralError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderTextField = (label: string, field: keyof FormData, opts?: { type?: string; placeholder?: string; required?: boolean; autoComplete?: string; multiline?: boolean; startIcon?: React.ReactNode }) => (
    <TextField
      fullWidth
      label={label}
      type={opts?.type || 'text'}
      placeholder={opts?.placeholder}
      autoComplete={opts?.autoComplete}
      multiline={opts?.multiline}
      minRows={opts?.multiline ? 2 : undefined}
      value={String(formData[field] ?? '')}
      onChange={setField(field)}
      error={!!errors[field]}
      helperText={errors[field]}
      disabled={submitting}
      required={opts?.required !== false}
      slotProps={{
        input: opts?.startIcon ? {
          startAdornment: <InputAdornment position="start">{opts.startIcon}</InputAdornment>,
        } : undefined,
      }}
      sx={textFieldSx}
    />
  );

  const renderSelectField = (label: string, field: keyof FormData, options: string[], opts?: { required?: boolean }) => (
    <FormControl fullWidth required={opts?.required !== false} sx={{ ...textFieldSx }}>
      <InputLabel>{label}</InputLabel>
      <Select value={String(formData[field])} label={label} onChange={setSelectField(field)} error={!!errors[field]} disabled={submitting}>
        <MenuItem value=""><em>Please select</em></MenuItem>
        {options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
      </Select>
    </FormControl>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: sageBg,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
        py: 4,
      }}
    >
      {/* Decorative background circles — same pattern as LoginPage */}
      <Box
        sx={{
          position: 'absolute',
          top: '-10%',
          left: '-6%',
          width: { xs: 220, md: 380 },
          height: { xs: 220, md: 380 },
          borderRadius: '50%',
          bgcolor: 'rgba(125,155,118,0.08)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '-8%',
          right: '-8%',
          width: { xs: 180, md: 300 },
          height: { xs: 180, md: 300 },
          borderRadius: '50%',
          bgcolor: 'rgba(125,155,118,0.06)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-10%',
          left: '15%',
          width: { xs: 240, md: 450 },
          height: { xs: 240, md: 450 },
          borderRadius: '50%',
          bgcolor: 'rgba(180,185,175,0.07)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-6%',
          right: '-4%',
          width: { xs: 160, md: 240 },
          height: { xs: 160, md: 240 },
          borderRadius: '50%',
          bgcolor: 'rgba(125,155,118,0.05)',
          pointerEvents: 'none',
        }}
      />

      {/* Centered Card */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 500,
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex',
          flexDirection: 'column',
          mx: 2,
          borderRadius: 5,
          bgcolor: '#fff',
          boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Fixed header */}
        <Box sx={{ px: { xs: 3, sm: 4.5 }, pt: { xs: 3, sm: 4.5 }, pb: 0 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${sagePrimary} 0%, ${sagePrimaryDark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(125,155,118,0.3)',
              }}
            >
              <MedicalServicesIcon sx={{ fontSize: 28, color: '#fff' }} />
            </Box>
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 0.5,
              color: sageText,
              textAlign: 'center',
              letterSpacing: '-0.02em',
              fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
            }}
          >
            Create Account
          </Typography>

          {/* Role Toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2.5 }}>
            <ToggleButtonGroup value={formData.role} exclusive onChange={handleRoleChange} disabled={submitting} size="small">
              <ToggleButton value="patient" sx={{ px: 3, py: 1, borderRadius: '8px !important', fontWeight: 600, fontSize: '0.85rem' }}>
                <Person sx={{ mr: 0.8, fontSize: 18 }} /> Patient
              </ToggleButton>
              <ToggleButton value="doctor" sx={{ px: 3, py: 1, borderRadius: '8px !important', fontWeight: 600, fontSize: '0.85rem' }}>
                <LocalHospital sx={{ mr: 0.8, fontSize: 18 }} /> Doctor
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {generalError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setGeneralError('')}>{generalError}</Alert>}
        </Box>

        {/* Scrollable form area */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: { xs: 3, sm: 4.5 },
            pb: { xs: 3, sm: 4.5 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {/* Shared fields */}
          {renderTextField(isDoctor ? 'Full Name' : 'Nickname', 'full_name', {
            placeholder: isDoctor ? 'Please enter your full name' : 'Please enter your nickname',
            autoComplete: 'name',
            required: true,
            startIcon: <Person sx={{ color: 'text.secondary', fontSize: 20 }} />,
          })}

          {renderTextField('Email address', 'email', {
            type: 'email',
            placeholder: 'example@email.com',
            autoComplete: 'email',
            required: true,
            startIcon: <Email sx={{ color: 'text.secondary', fontSize: 20 }} />,
          })}

          <TextField
            fullWidth
            label="Password"
            type={showPwd ? 'text' : 'password'}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={formData.password}
            onChange={setField('password')}
            error={!!errors.password}
            helperText={errors.password}
            disabled={submitting}
            required
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPwd(!showPwd)} edge="end" disabled={submitting}>{showPwd ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
              },
            }}
            sx={textFieldSx}
          />

          {formData.password && (
            <Box sx={{ px: 0.5 }}>
              <LinearProgress variant="determinate" value={strengthPct} color={pwdStrength.color} sx={{ height: 6, borderRadius: 3, mb: 0.5 }} />
              <Typography variant="caption" color="text.secondary">Password strength: {pwdStrength.label}</Typography>
            </Box>
          )}

          <TextField
            fullWidth
            label="Confirm password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Please confirm your password"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={setField('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            disabled={submitting}
            required
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end" disabled={submitting}>{showConfirm ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
              },
            }}
            sx={textFieldSx}
          />

          {/* Age + Gender row */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Age (years)"
              type="number"
              size="small"
              sx={{ flex: 1, ...textFieldSx }}
              value={formData.age_years}
              onChange={setField('age_years')}
              error={!!errors.age_years}
              helperText={errors.age_years}
              disabled={submitting}
              slotProps={{ htmlInput: { min: 0, max: 120 } }}
            />
            <TextField
              label="Month (optional)"
              type="number"
              size="small"
              sx={{ flex: 1, ...textFieldSx }}
              value={formData.age_months}
              onChange={setField('age_months')}
              disabled={submitting}
              slotProps={{ htmlInput: { min: 0, max: 11 } }}
            />
            <FormControl size="small" sx={{ flex: 1, ...textFieldSx }}>
              <InputLabel>Gender</InputLabel>
              <Select value={formData.gender} label="Gender" onChange={setSelectField('gender')} disabled={submitting}>
                <MenuItem value=""><em>Any</em></MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Address cascade */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            {renderSelectField('Province/Municipality', 'province', provinces, { required: true })}
            <FormControl fullWidth required sx={{ ...textFieldSx }}>
              <InputLabel>City</InputLabel>
              <Select value={formData.city} label="City" onChange={setSelectField('city')} disabled={submitting || !formData.province} error={!!errors.city}>
                <MenuItem value=""><em>Please select</em></MenuItem>
                {cities.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth required sx={{ ...textFieldSx }}>
              <InputLabel>District/County</InputLabel>
              <Select value={formData.district} label="District/County" onChange={setSelectField('district')} disabled={submitting || !formData.city} error={!!errors.district}>
                <MenuItem value=""><em>Please select</em></MenuItem>
                {districts.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {renderTextField('Street/Address (optional)', 'street', { required: false })}

          <TextField
            fullWidth
            label="Phone (optional)"
            placeholder="For doctor contact"
            autoComplete="tel"
            value={formData.phone}
            onChange={setField('phone')}
            error={!!errors.phone}
            helperText={errors.phone || 'Only for doctor contact, will not be public'}
            disabled={submitting}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><Phone sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
              },
            }}
            sx={textFieldSx}
          />

          {renderSelectField('Education (optional)', 'education', EDUCATION_OPTIONS, { required: false })}

          {/* Doctor-only fields */}
          {isDoctor && (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, color: sagePrimary }}>
                Practice Information
              </Typography>
              {renderTextField('Hospital', 'hospital', { placeholder: 'e.g., City Hospital', required: true })}
              {renderTextField('Department', 'department', { placeholder: 'e.g., Cardiology', required: true })}
              {renderTextField('License Number', 'license_number', { placeholder: 'Medical license certificate number', required: true })}
              {renderSelectField('Title', 'title', TITLE_OPTIONS, { required: true })}
              <FormControl fullWidth sx={{ ...textFieldSx }}>
                <InputLabel>Years of Practice (optional)</InputLabel>
                <Select value={formData.years_of_practice} label="Years of Practice (optional)" onChange={setSelectField('years_of_practice')} disabled={submitting}>
                  <MenuItem value=""><em>Please select</em></MenuItem>
                  {Array.from({ length: 61 }, (_, i) => <MenuItem key={i} value={String(i)}>{i} years</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Specialties (optional)"
                placeholder="e.g., Cardiology, Hypertension, CHD (comma separated, max 5)"
                value={formData.specialties}
                onChange={setField('specialties')}
                disabled={submitting}
                sx={textFieldSx}
              />
              <Alert severity="info" sx={{ fontSize: '0.8rem', borderRadius: 2 }}>
                Please upload your medical license photos (JPG/PNG/PDF, single file 5MB, total 20MB). A confirmation email will be sent after admin approval.
              </Alert>
              <Box sx={{ border: '2px dashed rgba(125,155,118,0.3)', borderRadius: 2.5, p: 2, textAlign: 'center', bgcolor: 'rgba(125,155,118,0.03)' }}>
                <input
                  type="file"
                  id="credential-files"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  disabled={submitting}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const flist = e.target.files;
                    if (flist && flist.length > 0) {
                      setFormData((p) => ({ ...p, uploadFiles: Array.from(flist) as unknown as FileList }));
                    }
                  }}
                />
                <label htmlFor="credential-files" style={{ cursor: submitting ? 'default' : 'pointer', display: 'block' }}>
                  <Typography variant="body2" color="text.secondary">
                    {(formData as any).uploadFiles?.length
                      ? `${(formData as any).uploadFiles.length} file(s) selected`
                      : 'Click to select credential files (Medical License + Practice Certificate)'}
                  </Typography>
                </label>
              </Box>
            </>
          )}

          {/* Terms */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <input
              type="checkbox"
              id="terms"
              checked={formData.terms}
              onChange={(e) => { setFormData((p) => ({ ...p, terms: e.target.checked })); }}
              style={{ width: 18, height: 18, marginTop: 2, accentColor: sagePrimary }}
            />
            <Typography variant="body2" sx={{ color: '#6B7D6B' }}>
              I have read and agree to{' '}
              <Link component="button" type="button" onClick={() => setTermsDialog(true)} sx={{ color: sagePrimary, fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link component="button" type="button" onClick={() => setPrivacyDialog(true)} sx={{ color: sagePrimary, fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                Privacy Policy
              </Link>
            </Typography>
          </Box>
          {errors.terms && <Typography variant="caption" color="error">{errors.terms}</Typography>}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={submitting}
            sx={{
              mt: 1,
              py: 1.5,
              borderRadius: 3,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              bgcolor: sagePrimary,
              boxShadow: '0 4px 14px rgba(125,155,118,0.3)',
              '&:hover': { bgcolor: sagePrimaryDark, boxShadow: '0 6px 20px rgba(125,155,118,0.4)' },
              fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
            }}
          >
            {submitting ? <CircularProgress size={24} sx={{ color: 'white' }} /> : isDoctor ? 'Submit for Review' : 'Sign Up'}
          </Button>

          <Typography align="center" variant="body2" sx={{ color: '#6B7D6B' }}>
            Already have an account?{' '}
            <Link href="/login" sx={{ color: sagePrimary, fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              Sign In
            </Link>
          </Typography>
        </Box>
      </Paper>

      {/* Terms Dialog */}
      <Dialog open={termsDialog} onClose={() => setTermsDialog(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ bgcolor: sagePrimary, color: 'white' }}>Terms of Service</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" paragraph sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
            Last updated: February 2025
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', color: 'error.main' }}>
            Important Notice
          </Typography>
          <Typography variant="body2" paragraph>
            Welcome to MediCareAI (hereinafter referred to as "the Service")! This agreement is between you (hereinafter "User") and the Service provider (hereinafter "We" or "Us") regarding the use of MediCareAI services. Please read and fully understand all terms of this agreement before using the Service. By clicking "Agree", registering an account, or otherwise using the Service in any way, you acknowledge that you have read, understood, and agree to be bound by all terms of this agreement. If you do not agree with any part of this agreement, please do not use the Service.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 1: Definitions
          </Typography>
          <Typography variant="body2" paragraph>
            1.1 <strong>The Service</strong>: Refers to the AI-powered intelligent disease management system developed and operated by us, including but not limited to patient record management, AI diagnosis, document processing, medical record management, knowledge base system, doctor collaboration platform, and other functional modules.<br /><br />
            1.2 <strong>User</strong>: Refers to natural persons, medical institutions, or organizations that register, log in to, and use the Service.<br /><br />
            1.3 <strong>Patient</strong>: Refers to natural persons whose personal information and health data are entered into the system for management.<br /><br />
            1.4 <strong>Doctor</strong>: Refers to professional physicians who have been verified and approved by us with appropriate medical qualifications.<br /><br />
            1.5 <strong>Admin</strong>: Refers to personnel authorized by us to be responsible for system operations, management, monitoring, and knowledge base maintenance.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 2: Acceptance and Application of Agreement
          </Typography>
          <Typography variant="body2" paragraph>
            2.1 <strong>Acceptance of Agreement</strong>: By clicking "Agree", registering an account, or otherwise using the Service, you are deemed to have fully read, understood, and agreed to accept all terms of this agreement.<br /><br />
            2.2 <strong>Agreement Updates</strong>: We reserve the right to modify this agreement based on changes in laws and regulations, technological development, and business needs. The modified agreement will be published on the platform and will take effect upon publication. Your continued use of the Service constitutes acceptance of the modified agreement.<br /><br />
            2.3 <strong>Separate Agreements</strong>: This agreement, together with the Privacy Policy and other relevant rules provided with the Service, constitutes the complete agreement between you and us.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 3: User Registration and Account Management
          </Typography>
          <Typography variant="body2" paragraph>
            3.1 <strong>Registration Requirements</strong>: Users must provide true, accurate, and complete information when registering, including but not limited to real name, ID number, contact information, etc. If the information provided is untrue, inaccurate, or incomplete, we have the right to suspend or terminate your account usage rights.<br /><br />
            3.2 <strong>Account Security</strong>: Users shall properly safeguard their account and password. You are responsible for all activities conducted through your account.<br /><br />
            3.3 <strong>Account Permissions</strong>: The Service supports three user roles: Patient, Doctor, and Admin, each with different permissions.<br /><br />
            3.4 <strong>Account Cancellation</strong>: You may apply to cancel your account at any time. After account cancellation, your personal information will be deleted or anonymized, unless otherwise required by laws and regulations.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 4: Personal Information Protection
          </Typography>
          <Typography variant="body2" paragraph>
            4.1 <strong>Information Collection Scope</strong>: In accordance with applicable laws and regulations, we may collect identity information, contact information, biometric information, health information, document information, etc.<br /><br />
            4.2 <strong>Sensitive Personal Information Processing</strong>: Health information is considered "sensitive personal information". Processing sensitive personal information requires your separate consent and strict protection measures.<br /><br />
            4.3 <strong>Purpose of Information Use</strong>: We collect and use your information solely for providing AI diagnosis services, maintaining patient records and medical history, enabling disease tracking and follow-up management, assisting doctor diagnosis and collaboration, and improving service quality. Without your consent, we will not use your personal information for purposes unrelated to those stated above.<br /><br />
            4.4 <strong>Information Sharing and Disclosure</strong>: We will not share your personal information with third parties except with your explicit consent, for third-party service providers necessary to complete the service, as required by law to report to relevant authorities or cooperate with law enforcement, or as necessary to protect public interest or national interest.<br /><br />
            4.5 <strong>Information Storage and Security</strong>: We will retain your personal information within the period required by laws and regulations, use encryption and anonymization techniques to protect your information security, conduct regular security audits and risk assessments, and establish emergency response mechanisms to prevent data breach risks.<br /><br />
            4.6 <strong>Your Rights</strong>: In accordance with applicable laws, you have the right to access, correct, delete, withdraw consent, and cancel your account.<br /><br />
            4.7 <strong>Minors Protection</strong>: We take the protection of minors very seriously. If you are a minor, please use the Service under the supervision of a guardian.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 5: User Conduct Guidelines
          </Typography>
          <Typography variant="body2" paragraph>
            5.1 <strong>Lawful and Compliant Use</strong>: You shall comply with national laws and regulations, and shall not use the Service to disseminate illegal or harmful information, infringe upon the intellectual property or other legitimate rights of others, conduct cyber attacks or hacking, maliciously register accounts, or engage in fraudulent activities.<br /><br />
            5.2 <strong>Content Authenticity</strong>: Medical records, diagnostic information, and other content you upload shall be true and accurate. You shall bear corresponding liability for damages caused by false information.<br /><br />
            5.3 <strong>No Abuse of AI Features</strong>: You shall not use AI diagnostic features for fraud, misleading purposes, or other improper purposes.<br /><br />
            5.4 <strong>No Dissemination of AI Diagnostic Results</strong>: AI diagnostic results are for reference only, shall not be used as the sole basis for medical diagnosis, and shall not be used for improper purposes in medical disputes.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 6: Intellectual Property Statement
          </Typography>
          <Typography variant="body2" paragraph>
            6.1 <strong>Software Intellectual Property</strong>: The intellectual property rights of the Service's software, code, documentation, data, etc. belong to us or relevant rights holders, protected by applicable laws.<br /><br />
            6.2 <strong>User Content Ownership</strong>: The intellectual property rights of documents, medical records, and other content you upload to the Service belong to you or relevant rights holders. You grant us a non-exclusive, royalty-free license to use such content within the scope of the Service.<br /><br />
            6.3 <strong>No Reverse Engineering</strong>: You shall not reverse engineer, decompile, disassemble, or otherwise reverse-operate the software.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2, color: 'error.main' }}>
            Article 7: Disclaimer and Limitation of Liability (Important)
          </Typography>
          <Typography variant="body2" paragraph>
            7.1 <strong>AI Diagnosis Disclaimer</strong>:<br />
            * AI diagnostic results are for reference only and do not constitute a formal medical diagnosis<br />
            * AI systems may have risks of misdiagnosis or missed diagnosis and shall not bear medical damage compensation liability<br />
            * Diagnosis of serious diseases should be based on professional doctors' diagnoses<br />
            * Any consequences arising from your use of AI diagnostic results shall be borne by you<br /><br />
            7.2 <strong>Service Interruption and Failure</strong>: We are not liable for service interruptions caused by force majeure (including but not limited to natural disasters, government actions, network failures, etc.). We are not liable for service anomalies caused by user device issues or network issues. We do not guarantee service continuity, stability, or error-free operation.<br /><br />
            7.3 <strong>Third-Party Service Disclaimer</strong>: The Service may use third-party services such as cloud storage and AI APIs. We assume no responsibility for the quality, security, or compliance of third-party services.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 8: Dispute Resolution
          </Typography>
          <Typography variant="body2" paragraph>
            8.1 <strong>Governing Law</strong>: The formation, execution, interpretation, and dispute resolution of this agreement shall be governed by applicable laws.<br /><br />
            8.2 <strong>Dispute Resolution Method</strong>: Both parties shall resolve disputes through friendly negotiation; if negotiation fails, either party may file a lawsuit with the competent court where the Service provider is located.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2, color: 'warning.main' }}>
            Special Notice
          </Typography>
          <Typography variant="body2" paragraph>
            1. MediCareAI is a medical assistance tool. AI diagnostic results are for reference only and do not replace professional doctors' diagnoses<br />
            2. All documents and medical information you upload will be strictly protected, and we will process them in accordance with legal and regulatory requirements<br />
            3. Using the Service indicates that you understand and accept the above terms<br /><br />
            If you have any questions about this agreement, please contact us at: hougelangley1987@gmail.com
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTermsDialog(false)} variant="contained" sx={{ bgcolor: sagePrimary, '&:hover': { bgcolor: sagePrimaryDark } }}>
            I have read and understood
          </Button>
        </DialogActions>
      </Dialog>

      {/* Privacy Dialog */}
      <Dialog open={privacyDialog} onClose={() => setPrivacyDialog(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ bgcolor: '#5C7A55', color: 'white' }}>Privacy Policy</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" paragraph sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
            Last updated: February 2025
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', color: sagePrimary }}>
            Welcome to MediCareAI (hereinafter "We" or "the Service")!
          </Typography>
          <Typography variant="body2" paragraph>
            We understand the importance of your personal information and will take appropriate security measures in accordance with legal and regulatory requirements to protect your personal information. This Privacy Policy will help you understand how we collect, use, store, and protect your personal information.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 1: Policy Updates and Effectiveness
          </Typography>
          <Typography variant="body2" paragraph>
            1.1 <strong>Policy Updates</strong>: We reserve the right to modify this Privacy Policy based on changes in laws and regulations, business development, and technological advancement. The modified Privacy Policy will be published on the platform and will take effect upon publication.<br /><br />
            1.2 <strong>Continued Use Constitutes Consent</strong>: If you do not agree with the modified Privacy Policy, you have the right to stop using the Service; if you continue to use the Service, you are deemed to have agreed to accept the modified Privacy Policy.<br /><br />
            1.3 <strong>Effective Date</strong>: This Privacy Policy takes effect from February 20, 2025.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 2: How We Collect and Use Your Personal Information
          </Typography>
          <Typography variant="body2" paragraph>
            2.1 <strong>Information Collection Scope</strong>: In accordance with applicable laws and regulations, we may collect the following information:<br /><br />
            <strong>Identity Information</strong>: Real name, ID number, date of birth, gender, etc. (used for user identity verification, service provision, legal compliance requirements)<br /><br />
            <strong>Contact Information</strong>: Phone number, email, address, etc. (used for service notifications, communication, identity verification)<br /><br />
            <strong>Biometric Information</strong>: Fingerprints, facial features, etc. (if applicable, used for device identification, security verification, account protection)<br /><br />
            <strong style={{color: 'error.main'}}>Health Information</strong>: Medical records, diagnostic results, symptom descriptions, medical history, medication records, etc. (used for AI diagnosis, disease management, follow-up planning, medical history tracking)<br /><br />
            <strong>Document Information</strong>: Uploaded medical records, examination reports, imaging data, etc. (used for disease tracking, health management, AI-assisted diagnosis)<br /><br />
            <strong>Device and Network Information</strong>: Device model, operating system, IP address, usage logs, etc. (used for device compatibility, user experience optimization, security protection)
          </Typography>

          <Typography variant="body2" paragraph>
            2.2 <strong>Purpose of Information Use</strong>: We collect and use your personal information solely for the following purposes:<br />
            * Providing AI diagnostic services<br />
            * Maintaining patient records and medical history<br />
            * Enabling disease tracking and follow-up management<br />
            * Assisting doctor diagnosis and collaboration<br />
            * Improving service quality<br />
            * Security protection<br />
            * Legal compliance<br /><br />
            Without your consent, we will not use your personal information for purposes unrelated to those stated above.
          </Typography>

          <Typography variant="body2" paragraph>
            2.3 <strong>Information Not Collected</strong>: We do not actively collect sensitive financial information such as bank cards or payment accounts; behavioral data such as browsing history or consumption habits; or non-essential information such as social relationships or contacts.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2, color: 'error.main' }}>
            Article 3: Special Note on Sensitive Personal Information
          </Typography>
          <Typography variant="body2" paragraph>
            3.1 <strong>What is Sensitive Personal Information?</strong>: In accordance with applicable laws, sensitive personal information refers to personal information that, if leaked or illegally used, may cause harm to a natural person's dignity or endanger personal or property safety, including biometric data, religious beliefs, specific identity, medical health, financial accounts, location tracking, and personal information of minors under 14 years of age.
          </Typography>

          <Typography variant="body2" paragraph>
            3.2 <strong>Special Protection of Medical Health Information</strong>: Health information is sensitive personal information. Processing sensitive personal information requires the following conditions:<br />
            * Obtaining your <strong>separate consent</strong><br />
            * Having a specific purpose and sufficient necessity<br />
            * Implementing strict protection measures for such personal information
          </Typography>

          <Typography variant="body2" paragraph>
            3.3 <strong>Principles for Processing Sensitive Information</strong>:<br />
            * <strong>Separate Consent Principle</strong>: We will clearly inform you before collection and obtain your separate consent<br />
            * <strong>Minimum Necessity Principle</strong>: Only the minimum scope of information necessary to achieve service functionality is collected<br />
            * <strong>Clear Notification Principle</strong>: We will clearly inform you of the purpose, method, and scope of information collection before collection<br />
            * <strong>Strict Protection Principle</strong>: Technical measures such as encryption, anonymization, and access control are used for strict protection<br />
            * <strong>Purpose Limitation Principle</strong>: Use is strictly limited to medical and health-related purposes
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 4: How We Share, Transfer, and Publicly Disclose Your Personal Information
          </Typography>
          <Typography variant="body2" paragraph>
            4.1 <strong>Sharing</strong>: We will not share your personal information with any company, organization, or individual, except:<br />
            * <strong>With your explicit consent</strong><br />
            * <strong>As necessary to complete the service</strong>: Sharing with third-party service providers that provide technical support<br />
            * <strong>To fulfill legal obligations</strong>: Reporting to relevant authorities or cooperating with law enforcement inquiries as required by law<br />
            * <strong>To protect public interest</strong>: As necessary to protect public interest or national interest<br />
            * <strong>With authorized partners</strong>: Sharing with authorized partners (such as medical institutions) after obtaining your authorization
          </Typography>

          <Typography variant="body2" paragraph>
            4.2 <strong>Transfer</strong>: We will not transfer your personal information to any company, organization, or individual, except with your consent, in the event of a merger or acquisition (we will inform you of the new recipient and require them to continue to comply with this Privacy Policy), or as required by laws and regulations.
          </Typography>

          <Typography variant="body2" paragraph>
            4.3 <strong>Public Disclosure</strong>: We will only publicly disclose your personal information with your explicit consent or as required by laws and regulations.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 5: How We Store Your Personal Information
          </Typography>
          <Typography variant="body2" paragraph>
            5.1 <strong>Storage Location</strong>:<br />
            * <strong>General Personal Information</strong>: Servers within the applicable jurisdiction<br />
            * <strong>Sensitive Personal Information</strong>: Stored within the applicable jurisdiction, unless otherwise required by laws and regulations
          </Typography>

          <Typography variant="body2" paragraph>
            5.2 <strong>Storage Period</strong>:<br />
            * <strong>Identity Information</strong>: As necessary to provide and secure the service, no longer than 1 year after account cancellation<br />
            * <strong>Health Information</strong>: As necessary to provide and secure the service, no longer than 5 years after account cancellation<br />
            * <strong>Usage Logs</strong>: As necessary to maintain service security, retained for no less than 6 months<br />
            * <strong>Other Information</strong>: When you stop using the Service, we will promptly delete or anonymize it
          </Typography>

          <Typography variant="body2" paragraph>
            5.3 <strong>Storage Security Measures</strong>:<br />
            * <strong>Encrypted Storage</strong>: Sensitive information is stored using encryption<br />
            * <strong>Access Control</strong>: Strict access permission management is implemented; only authorized personnel can access<br />
            * <strong>Security Audits</strong>: Regular security audits and risk assessments are conducted<br />
            * <strong>Data Backup</strong>: Important data is regularly backed up<br />
            * <strong>Emergency Response</strong>: A data breach emergency response mechanism is established
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 6: Your Rights
          </Typography>
          <Typography variant="body2" paragraph>
            In accordance with applicable laws, you have the following rights:
          </Typography>

          <Typography variant="body2" paragraph>
            6.1 <strong>Right of Access</strong>: You have the right to access your personal information, including your basic information, health records and medical history, document upload records, and usage logs. You can view and export your personal information in "Settings" or "Profile".
          </Typography>

          <Typography variant="body2" paragraph>
            6.2 <strong>Right of Correction</strong>: You have the right to correct inaccurate or incomplete personal information. You can modify your personal information in "Settings" or "Profile".
          </Typography>

          <Typography variant="body2" paragraph>
            6.3 <strong>Right of Deletion</strong>: In the following circumstances, you may request deletion of your personal information: when you no longer use the Service, when the purpose of provision has been achieved, when you withdraw consent, or in deletion scenarios provided by law. You can submit a request in "Settings" - "Account Management" - "Request Deletion", and we will process it within 15 business days.
          </Typography>

          <Typography variant="body2" paragraph>
            6.4 <strong>Right to Withdraw Consent</strong>: You have the right to withdraw your consent to personal information processing at any time. You can withdraw consent in "Settings" - "Privacy Settings", or contact us at hougelangley1987@gmail.com.
          </Typography>

          <Typography variant="body2" paragraph>
            6.5 <strong>Right to Cancel Account</strong>: You have the right to apply for account cancellation at any time. You can submit a request in "Settings" - "Account Management" - "Cancel Account". After account cancellation, your personal information will be deleted or anonymized and cannot be recovered.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 7: Protection of Minors' Information
          </Typography>
          <Typography variant="body2" paragraph>
            7.1 <strong>Definition</strong>: Minors under the age of 14 are considered children, and their personal information is considered children's personal information.
          </Typography>

          <Typography variant="body2" paragraph>
            7.2 <strong>Protection Principles</strong>: We take the protection of minors very seriously. When processing children's personal information, we will follow these principles:<br />
            * <strong>Special Protection</strong>: Special protective measures are taken to protect children's personal information<br />
            * <strong>Parental Consent</strong>: Processing children's personal information requires consent from their guardian<br />
            * <strong>Minimum Collection</strong>: Only the minimum scope of information necessary to achieve service functionality is collected
          </Typography>

          <Typography variant="body2" paragraph>
            7.3 <strong>Children's Information Processing</strong>: We do not actively collect personal information of minors, especially sensitive health information. If we discover that we have collected personal information of minors, we will delete it as soon as possible.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 8: Cross-Border Data Transfer
          </Typography>
          <Typography variant="body2" paragraph>
            8.1 <strong>Data Localization Storage</strong>: In accordance with applicable laws and regulations, we currently store all personal information on servers within the applicable jurisdiction.
          </Typography>

          <Typography variant="body2" paragraph>
            8.2 <strong>Data Export Scenarios</strong>: If personal information needs to be transferred abroad, we will:<br />
            * Obtain your separate consent<br />
            * Pass security assessments organized by relevant authorities<br />
            * Sign standard contracts for personal information export<br />
            * Obtain personal information protection certification<br />
            * Obtain personal information protection certification through professional institutions
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 9: Responding to Your Requests
          </Typography>
          <Typography variant="body2" paragraph>
            9.1 <strong>Request Processing Procedure</strong>:<br />
            * Verify your identity and permissions<br />
            * Verify the reasonableness of your request<br />
            * Process your request in accordance with legal and regulatory requirements<br />
            * Notify you of the processing result
          </Typography>

          <Typography variant="body2" paragraph>
            9.2 <strong>Processing Timeframe</strong>:<br />
            * <strong>Right of Access, Correction, Deletion</strong>: Within 15 business days<br />
            * <strong>Other Requests</strong>: Within 30 business days
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 10: Use of Cookies and Similar Technologies
          </Typography>
          <Typography variant="body2" paragraph>
            We use cookies and similar technologies for user identification, security protection, statistical analysis, and functionality implementation. You can refuse or delete cookies through your browser settings, but refusing cookies may affect the normal use of the Service.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 11: Third-Party Service Description
          </Typography>
          <Typography variant="body2" paragraph>
            The Service may use the following third-party services:<br />
            * <strong>Cloud Storage Service</strong>: Object storage service for storing user-uploaded documents<br />
            * <strong>AI Large Model Service</strong>: For AI diagnostic functionality<br />
            * <strong>Other Services</strong>: Technical support, cloud services, etc.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 12: Your Personal Information Security
          </Typography>
          <Typography variant="body2" paragraph>
            12.1 <strong>Security Measures</strong>: We use encryption technology (SSL encryption, data encryption), access control, security audits, security training, emergency response mechanisms, and other measures to protect your personal information security.
          </Typography>

          <Typography variant="body2" paragraph>
            12.2 <strong>Data Breach Notification</strong>: In the event of a personal information breach, we will immediately activate the emergency plan, report to regulatory authorities, notify you (if it may pose a risk to you), and take remedial measures.
          </Typography>

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', mt: 2 }}>
            Article 13: Contact Us
          </Typography>
          <Typography variant="body2" paragraph>
            If you have any questions, comments, or suggestions regarding this Privacy Policy, or need to exercise your personal information-related rights, please contact us through the following methods:<br /><br />
            <strong>Email</strong>: hougelangley1987@gmail.com<br /><br />
            We will respond to you within 15 business days of receiving your request.
          </Typography>

          <Typography variant="body2" paragraph sx={{ mt: 2, fontStyle: 'italic' }}>
            Thank you for your trust and support in MediCareAI!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrivacyDialog(false)} variant="contained" sx={{ bgcolor: sagePrimary, '&:hover': { bgcolor: sagePrimaryDark } }}>
            I have read and understood
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
