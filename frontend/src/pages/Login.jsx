import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  LockOutlined as LockIcon,
  EmailOutlined as EmailIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      navigate('/admin/dashboard');
    }
    
    // Check if session expired
    if (searchParams.get('session_expired') === 'true') {
      setError('Your session has expired. Please log in again.');
    }
  }, [navigate, searchParams]);

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/login', { email, password });

      if (res.data.success) {
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        navigate('/admin/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0F172A', // Slate 900 Background for Admin portal
        backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 40%)'
      }}
    >
      <Container maxWidth="xs">
        <Box sx={{ textCenter: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Avatar sx={{ bgcolor: '#2563EB', width: 52, height: 52, mb: 1.5, boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)' }}>
            <BadgeIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.5px' }}>
            Techno<span style={{ color: '#2563EB' }}>Pass</span>
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', mt: 1 }}>
            Campus Gate Pass Management Portal
          </Typography>
        </Box>

        <Card sx={{ border: '1px solid #1E293B', bgcolor: '#1E293B', borderRadius: 3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#FFFFFF', mb: 3 }}>
              Sign In to Admin Panel
            </Typography>

            {error && (
              <Alert severity={error.includes('expired') ? 'warning' : 'error'} sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleLogin}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  fullWidth
                  label="Email Address"
                  variant="outlined"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start" sx={{ color: '#64748B' }}>
                          <EmailIcon />
                        </InputAdornment>
                      )
                    }
                  }}
                  sx={{
                    '& label': { color: '#64748B' },
                    '& label.Mui-focused': { color: '#2563EB' },
                    '& .MuiOutlinedInput-root': {
                      color: '#FFFFFF',
                      '& fieldset': { borderColor: '#334155' },
                      '&:hover fieldset': { borderColor: '#475569' },
                      '&.Mui-focused fieldset': { borderColor: '#2563EB' }
                    }
                  }}
                />

                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  variant="outlined"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start" sx={{ color: '#64748B' }}>
                          <LockIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton type="button" onClick={handleTogglePassword} edge="end" sx={{ color: '#64748B' }}>
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                  sx={{
                    '& label': { color: '#64748B' },
                    '& label.Mui-focused': { color: '#2563EB' },
                    '& .MuiOutlinedInput-root': {
                      color: '#FFFFFF',
                      '& fieldset': { borderColor: '#334155' },
                      '&:hover fieldset': { borderColor: '#475569' },
                      '&.Mui-focused fieldset': { borderColor: '#2563EB' }
                    }
                  }}
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  color="secondary"
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.5, mt: 1.5, fontWeight: 700, bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' } }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

// Simple Avatar stub since we are using MUI Avatar
const Avatar = ({ children, sx }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        ...sx
      }}
    >
      {children}
    </Box>
  );
};

export default Login;
