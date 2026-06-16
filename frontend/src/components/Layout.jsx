import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  ReceiptLong as AuditIcon,
  Logout as LogoutIcon,
  Badge as BadgeIcon,
  AdminPanelSettings as SuperAdminIcon,
  Circle as DotIcon
} from '@mui/icons-material';
import api from '../services/api';

const drawerWidth = 260;

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:960px)');

  const user = JSON.parse(localStorage.getItem('user')) || { email: 'Admin', role: 'Staff' };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout API error:', err);
    } finally {
      localStorage.clear();
      navigate('/login');
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: 'Pass History', icon: <HistoryIcon />, path: '/admin/history' }
  ];

  // Only show Audit Logs to Super Admins
  if (user.role === 'super_admin') {
    menuItems.push({ text: 'Audit Logs', icon: <AuditIcon />, path: '/admin/logs' });
  }

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#0F172A', color: '#E2E8F0' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #1E293B', height: 64 }}>
        <BadgeIcon sx={{ color: '#2563EB', fontSize: 32 }} />
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '0.5px', color: '#FFFFFF' }}>
          Techno<span style={{ color: '#2563EB' }}>Pass</span>
        </Typography>
      </Box>
      
      <List sx={{ px: 2, py: 3, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={isMobile ? handleDrawerToggle : undefined}
                sx={{
                  borderRadius: 1.5,
                  py: 1.25,
                  px: 2,
                  bgcolor: isActive ? '#1E293B' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  borderLeft: isActive ? '4px solid #2563EB' : '4px solid transparent',
                  '&:hover': {
                    bgcolor: '#1E293B',
                    color: '#FFFFFF',
                    '& svg': { color: '#FFFFFF' }
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? '#2563EB' : '#64748B' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Typography sx={{ fontSize: '14px', fontWeight: isActive ? 600 : 500 }}>
                      {item.text}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: '#1E293B' }} />

      {/* Admin User Badge */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#0B0F19' }}>
        <Avatar sx={{ bgcolor: user.role === 'super_admin' ? '#10B981' : '#2563EB', width: 40, height: 40 }}>
          {user.role === 'super_admin' ? <SuperAdminIcon /> : <Avatar src="" />}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: '#FFFFFF', fontSize: '13px' }}>
            {user.email}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <DotIcon sx={{ color: '#10B981', fontSize: 8 }} />
            <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'capitalize' }}>
              {user.role.replace('_', ' ')}
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Logout">
          <IconButton onClick={handleLogout} sx={{ color: '#EF4444' }}>
            <LogoutIcon size="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      {/* Header AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          color: '#0F172A',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', height: 64 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '18px', color: '#1E293B', display: { xs: 'none', sm: 'block' } }}>
              Technopark Campus Portal
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>
              Gate Pass Admin Panel
            </Typography>
            <Avatar
              onClick={handleProfileMenuOpen}
              sx={{ cursor: 'pointer', bgcolor: '#0F172A', width: 36, height: 36, fontSize: '14px', fontWeight: 600 }}
            >
              {user.email.substring(0, 2).toUpperCase()}
            </Avatar>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled sx={{ fontSize: '13px' }}>
                Signed in as <strong>{user.email}</strong>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: '#EF4444', gap: 1, fontSize: '14px' }}>
                <LogoutIcon sx={{ fontSize: 18 }} /> Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
        >
          {drawerContent}
        </Drawer>
        
        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none' }
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
