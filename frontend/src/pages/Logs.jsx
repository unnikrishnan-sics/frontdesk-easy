import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  CircularProgress,
  TablePagination,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon
} from '@mui/icons-material';

import Layout from '../components/Layout';
import api from '../services/api';

const Logs = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 450);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Audit Logs
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['logs', page, rowsPerPage, debouncedSearch],
    queryFn: async () => {
      const res = await api.get('/logs', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: debouncedSearch
        }
      });
      return res.data;
    }
  });

  // Action name formatter
  const formatAction = (action) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
          System Audit Logs
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Review critical administrator actions, user sign-ins, and approval footprints.
        </Typography>
      </Box>

      {/* SEARCH INPUT */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search Audit Logs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by admin email or action..."
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: '#94A3B8', mr: 1, fontSize: 20 }} />
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* AUDIT LOG TABLE */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
        <Table aria-label="logs table">
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Admin Email</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : !logsData?.data || logsData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="textSecondary">
                    No logs found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logsData.data.map((log) => (
                <TableRow key={log._id} hover>
                  <TableCell sx={{ fontSize: '13px' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{log.userEmail}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700, fontSize: '13px', color: log.action.includes('reject') ? '#EF4444' : log.action.includes('approve') ? '#10B981' : '#1E293B' }}>
                      {formatAction(log.action)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: '12px', fontFamily: 'monospace', color: '#475569' }}>
                    {JSON.stringify(log.details)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '13px' }}>{log.ipAddress}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={logsData?.total || 0}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[20, 50, 100]}
        />
      </TableContainer>
    </Layout>
  );
};

export default Logs;
