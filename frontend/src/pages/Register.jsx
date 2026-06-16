import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  IconButton,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { compressImage } from '../utils/imageCompressor';
import api, { getPhotoUrl } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [regType, setRegType] = useState('individual'); // 'individual' | 'group'
  const [groupName, setGroupName] = useState('');
  
  // For Individual
  const [singleStudent, setSingleStudent] = useState({
    name: '',
    photoUrl: '',
    photoFile: null
  });

  // For Group
  const [groupStudents, setGroupStudents] = useState([
    { id: 1, name: '', photoUrl: '', photoFile: null }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Handle toggling registration type
  const handleRegTypeChange = (event, newType) => {
    if (newType !== null) {
      setRegType(newType);
      setError('');
    }
  };

  // Handle image compression & upload
  const handlePhotoUpload = async (file, index = null) => {
    try {
      setLoading(true);
      setError('');
      
      // 1. Compress the photo client-side
      const compressed = await compressImage(file, 600, 600, 0.75);
      
      // 2. Upload to backend -> Cloudinary
      const formData = new FormData();
      formData.append('photo', compressed);

      const res = await api.post('/submissions/upload-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        const url = res.data.photoUrl;
        if (index === null) {
          setSingleStudent(prev => ({ ...prev, photoUrl: url, photoFile: compressed }));
        } else {
          setGroupStudents(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], photoUrl: url, photoFile: compressed };
            return updated;
          });
        }
      }
    } catch (err) {
      console.error(err);
      setError('Image compression or upload failed. Please try a different photo.');
    } finally {
      setLoading(false);
    }
  };

  // Individual Form fields update
  const handleSingleChange = (field, val) => {
    setSingleStudent(prev => ({ ...prev, [field]: val }));
  };

  // Group Form fields update
  const handleGroupChange = (index, field, val) => {
    setGroupStudents(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  // Add student row in Group mode
  const addGroupStudentRow = () => {
    setGroupStudents(prev => [
      ...prev,
      { id: Date.now(), name: '', photoUrl: '', photoFile: null }
    ]);
  };

  // Remove student row in Group mode
  const removeGroupStudentRow = (index) => {
    if (groupStudents.length > 1) {
      setGroupStudents(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Common Phone Validation
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    let studentsPayload = [];

    if (regType === 'individual') {
      if (!singleStudent.name) {
        setError('Please fill in trainee name.');
        return;
      }
      if (!singleStudent.photoUrl) {
        setError('Please upload a student photo.');
        return;
      }
      studentsPayload = [{
        name: singleStudent.name,
        photoUrl: singleStudent.photoUrl
      }];
    } else {
      // Group Validation
      if (!groupName) {
        setError('Please enter a group / company / institution name.');
        return;
      }
      for (let i = 0; i < groupStudents.length; i++) {
        const s = groupStudents[i];
        if (!s.name) {
          setError(`Please fill in name for Trainee #${i + 1}.`);
          return;
        }
        if (!s.photoUrl) {
          setError(`Please upload a photo for Trainee #${i + 1}.`);
          return;
        }
      }
      studentsPayload = groupStudents.map(s => ({
        name: s.name,
        photoUrl: s.photoUrl
      }));
    }

    try {
      setLoading(true);
      const res = await api.post('/submissions/register', {
        phoneNumber,
        groupName: regType === 'group' ? groupName : null,
        students: studentsPayload
      });

      if (res.data.success) {
        navigate(`/success/${res.data.requestId}`);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 4, display: 'flex', alignItems: 'center', bgcolor: '#F8FAFC' }}>
      <Container maxWidth="sm">
        {/* Top Header Card */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            Techno<span style={{ color: '#2563EB' }}>Pass</span>
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Internship & Trainee Gate Pass Request Form
          </Typography>
        </Box>

        <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
            <form onSubmit={handleSubmit}>
              {/* Step 1: Phone Number */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1E293B' }}>
                  Contact Information
                </Typography>
                <TextField
                  fullWidth
                  label="Mobile Number"
                  variant="outlined"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').substring(0, 10))}
                  placeholder="Enter 10-digit number"
                  helperText="Required for verification and gate pass reference."
                  disabled={loading}
                />
              </Box>

              {/* Step 2: Registration Type Toggle */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1E293B' }}>
                  Select Submission Type
                </Typography>
                <ToggleButtonGroup
                  fullWidth
                  value={regType}
                  exclusive
                  onChange={handleRegTypeChange}
                  aria-label="registration type"
                  disabled={loading}
                  sx={{
                    '& .MuiToggleButton-root': {
                      py: 1.25,
                      borderRadius: 2,
                      borderColor: '#E2E8F0',
                      '&.Mui-selected': {
                        bgcolor: '#2563EB',
                        color: '#FFFFFF',
                        '&:hover': { bgcolor: '#1D4ED8' }
                      }
                    }
                  }}
                >
                  <ToggleButton value="individual" aria-label="individual">
                    <PersonIcon sx={{ mr: 1, fontSize: 20 }} /> Individual
                  </ToggleButton>
                  <ToggleButton value="group" aria-label="group">
                    <GroupIcon sx={{ mr: 1, fontSize: 20 }} /> Group ({groupStudents.length})
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Error messages */}
              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Step 3: Registration Forms */}
              {regType === 'individual' ? (
                /* INDIVIDUAL MODE FORM */
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                    Trainee Details
                  </Typography>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={singleStudent.name}
                    onChange={(e) => handleSingleChange('name', e.target.value)}
                    placeholder="Enter full name"
                    disabled={loading}
                  />


                  {/* Photo Upload Box */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#64748B' }}>
                      Profile Photo (Passport size photo)
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        borderRadius: 2.5,
                        bgcolor: '#F8FAFC',
                        borderStyle: 'dashed',
                        borderColor: singleStudent.photoUrl ? '#10B981' : '#CBD5E1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      {singleStudent.photoUrl ? (
                        <Box sx={{ position: 'relative' }}>
                          <Avatar
                            src={getPhotoUrl(singleStudent.photoUrl)}
                            sx={{ width: 100, height: 100, border: '2px solid #10B981', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                          />
                          <Box sx={{ position: 'absolute', bottom: -5, right: -5, bgcolor: '#10B981', borderRadius: '50%', p: 0.25, display: 'flex', color: 'white' }}>
                            <CheckIcon sx={{ fontSize: 16 }} />
                          </Box>
                        </Box>
                      ) : (
                        <Avatar sx={{ width: 60, height: 60, bgcolor: '#E2E8F0' }}>
                          <PersonIcon sx={{ fontSize: 32, color: '#94A3B8' }} />
                        </Avatar>
                      )}
                      
                      <Box>
                        <input
                          accept="image/*"
                          style={{ display: 'none' }}
                          id="single-photo-file"
                          type="file"
                          disabled={loading}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handlePhotoUpload(e.target.files[0]);
                            }
                          }}
                        />
                        <label htmlFor="single-photo-file">
                          <Button
                            variant="outlined"
                            component="span"
                            startIcon={<UploadIcon />}
                            size="small"
                            disabled={loading}
                            sx={{ borderRadius: 2 }}
                          >
                            {singleStudent.photoUrl ? 'Change Photo' : 'Upload Photo'}
                          </Button>
                        </label>
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        JPG, PNG, WEBP. Automatically resized and compressed.
                      </Typography>
                    </Paper>
                  </Box>
                </Box>
              ) : (
                /* GROUP MODE FORM */
                <Box>
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      label="Group / Company / College Name"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g. Srishti Innovatives Team A"
                      disabled={loading}
                      helperText="Group name used to cluster all trainee passes together."
                    />
                  </Box>

                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1E293B' }}>
                    Trainee Submissions ({groupStudents.length})
                  </Typography>

                  <List disablePadding>
                    {groupStudents.map((student, index) => (
                      <Paper
                        key={student.id}
                        variant="outlined"
                        sx={{ p: 2.5, mb: 2.5, borderRadius: 2.5, position: 'relative', bgcolor: '#FDFDFD' }}
                      >
                        {groupStudents.length > 1 && (
                          <IconButton
                            onClick={() => removeGroupStudentRow(index)}
                            disabled={loading}
                            sx={{ position: 'absolute', top: 8, right: 8, color: '#EF4444' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 2 }}>
                          Trainee #{index + 1}
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Full Name"
                            value={student.name}
                            onChange={(e) => handleGroupChange(index, 'name', e.target.value)}
                            placeholder="Trainee name"
                            disabled={loading}
                          />


                          {/* Group student photo upload */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                            <Avatar
                              src={getPhotoUrl(student.photoUrl)}
                              sx={{ width: 60, height: 60, border: student.photoUrl ? '2px solid #10B981' : 'none' }}
                            >
                              <PersonIcon />
                            </Avatar>
                            <Box>
                              <input
                                accept="image/*"
                                style={{ display: 'none' }}
                                id={`group-photo-file-${student.id}`}
                                type="file"
                                disabled={loading}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handlePhotoUpload(e.target.files[0], index);
                                  }
                                }}
                              />
                              <label htmlFor={`group-photo-file-${student.id}`}>
                                <Button
                                  variant="outlined"
                                  component="span"
                                  size="small"
                                  startIcon={<UploadIcon />}
                                  disabled={loading}
                                  sx={{ borderRadius: 1.5 }}
                                >
                                  {student.photoUrl ? 'Change' : 'Upload Photo'}
                                </Button>
                              </label>
                              <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 0.5 }}>
                                Required. JPG/PNG.
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </List>

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addGroupStudentRow}
                    disabled={loading}
                    sx={{ mt: 1, borderStyle: 'dashed', borderRadius: 2, py: 1.25 }}
                  >
                    Add Another Student
                  </Button>
                </Box>
              )}

              {/* Submit Action */}
              <Box sx={{ mt: 4 }}>
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  color="secondary"
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.5, borderRadius: 2.5, fontWeight: 700 }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    `Submit Registration`
                  )}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Register;
