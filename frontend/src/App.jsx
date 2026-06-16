import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

// Components & Guard
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Register from './pages/Register';
import Success from './pages/Success';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Logs from './pages/Logs';

// Create the premium corporate theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#0F172A', // Slate 900
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#2563EB', // Blue 600
      contrastText: '#FFFFFF'
    },
    success: {
      main: '#10B981', // Accent (Emerald 500)
      contrastText: '#FFFFFF'
    },
    warning: {
      main: '#F59E0B', // Warning (Amber 500)
      contrastText: '#FFFFFF'
    },
    error: {
      main: '#EF4444', // Danger (Red 500)
      contrastText: '#FFFFFF'
    },
    background: {
      default: '#F8FAFC', // Slate 50
      paper: '#FFFFFF'
    },
    text: {
      primary: '#111827', // Gray 900
      secondary: '#6B7280' // Gray 500
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      borderRadius: '8px'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none'
          }
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#1E293B'
          }
        },
        containedSecondary: {
          '&:hover': {
            backgroundColor: '#1D4ED8'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
          border: '1px solid #E2E8F0'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8
          }
        }
      }
    }
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/register" element={<Register />} />
          <Route path="/success/:requestId" element={<Success />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'front_desk']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/history"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'front_desk']}>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Logs />
              </ProtectedRoute>
            }
          />

          {/* Fallback Redirect */}
          <Route path="*" element={<Navigate to="/register" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
