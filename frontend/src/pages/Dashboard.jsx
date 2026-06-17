import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Button,
  IconButton,
  TextField,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Avatar,
  TablePagination,
  Tooltip,
  Collapse,
  Stack,
  CircularProgress
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Print as PrintIcon,
  QrCode as QrIcon,
  Download as ExportIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  Refresh as RefreshIcon,
  DateRange as DateIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';

import Layout from '../components/Layout';
import PhotoVerificationModal from '../components/PhotoVerificationModal';
import api, { getPhotoUrl } from '../services/api';

const getBackendBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }
  return `http://${window.location.hostname}:5000`;
};
const BACKEND_URL = getBackendBaseUrl();

const Dashboard = () => {
  const queryClient = useQueryClient();
  
  // Table & Queries State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // UI Dialog States
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);  // date picker shown before printing
  const [pendingPrint, setPendingPrint] = useState(null);          // { submission, student } | { isBulk: true }
  const [validityType, setValidityType] = useState('today'); // 'today' | 'tomorrow' | 'custom' | 'range'
  const [customValDate, setCustomValDate] = useState('');
  const [valFromDate, setValFromDate] = useState('');
  const [valToDate, setValToDate] = useState('');
  
  // Photo modal states
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoStudentName, setPhotoStudentName] = useState('');
  const [photoSubmissionId, setPhotoSubmissionId] = useState('');
  const [photoStudentId, setPhotoStudentId] = useState('');

  // QR dialog
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  // Selection states (for bulk actions)
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Socket notification
  const [notification, setNotification] = useState(null);

  // Row expansion (for groups)
  const [expandedRows, setExpandedRows] = useState({});

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0); // reset page on search
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Socket.io integration
  useEffect(() => {
    const socket = io(BACKEND_URL);

    socket.on('new_submission', (data) => {
      setNotification(`New submission received! Request ID: ${data.requestId}`);
      // Invalidate queries to trigger automated UI refresh
      queryClient.invalidateQueries(['submissions']);
      queryClient.invalidateQueries(['stats']);
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  // Fetch Dashboard Stats
  const { data: statsData } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await api.get('/analytics/stats');
      return res.data.data;
    },
    refetchInterval: 30000 // refetch every 30s
  });

  // Fetch Submissions (Paginated, Filtered)
  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['submissions', page, rowsPerPage, debouncedSearch, status, dateFilter, startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/submissions', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: debouncedSearch,
          status,
          dateFilter,
          startDate,
          endDate
        }
      });
      return res.data;
    }
  });

  // Toggle Row Expand
  const toggleRowExpand = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Checkbox row select
  const handleSelectStudent = (studentId) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAllStudentsInPage = (e) => {
    if (e.target.checked && submissionsData?.data) {
      const allIds = [];
      submissionsData.data.forEach(sub => {
        sub.students.forEach(stud => {
          allIds.push(stud._id);
        });
      });
      setSelectedStudentIds(allIds);
    } else {
      setSelectedStudentIds([]);
    }
  };

  // Validity Date calculations based on option selected
  const getValidityDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let from = new Date(today);
    let to = new Date(today);
    to.setHours(23, 59, 59, 999);

    if (validityType === 'tomorrow') {
      from.setDate(from.getDate() + 1);
      to.setDate(to.getDate() + 1);
      to.setHours(23, 59, 59, 999);
    } else if (validityType === 'custom' && customValDate) {
      from = new Date(customValDate);
      from.setHours(0, 0, 0, 0);
      to = new Date(customValDate);
      to.setHours(23, 59, 59, 999);
    } else if (validityType === 'range' && valFromDate && valToDate) {
      from = new Date(valFromDate);
      from.setHours(0, 0, 0, 0);
      to = new Date(valToDate);
      to.setHours(23, 59, 59, 999);
    }

    return { validFrom: from.toISOString(), validTo: to.toISOString() };
  };

  // Mutation: Approve group submission
  const approveGroupMutation = useMutation({
    mutationFn: async ({ id, dates }) => {
      return await api.put(`/submissions/${id}/status`, { status: 'approved', ...dates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['submissions']);
      queryClient.invalidateQueries(['stats']);
    }
  });

  // Mutation: Approve single student
  const approveStudentMutation = useMutation({
    mutationFn: async ({ id, studentId, dates }) => {
      return await api.put(`/submissions/${id}/students/${studentId}/status`, { status: 'approved', ...dates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['submissions']);
      queryClient.invalidateQueries(['stats']);
    }
  });

  // Mutation: Bulk Actions
  const bulkActionMutation = useMutation({
    mutationFn: async ({ studentIds, action, dates }) => {
      return await api.post(`/submissions/bulk-action`, { studentIds, action, ...dates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['submissions']);
      queryClient.invalidateQueries(['stats']);
      setSelectedStudentIds([]);
    }
  });

  // Reject Submissions (Immediate, no date required)
  const handleRejectSubmission = async (id) => {
    if (window.confirm('Are you sure you want to reject this submission group?')) {
      try {
        await api.put(`/submissions/${id}/status`, { status: 'rejected' });
        queryClient.invalidateQueries(['submissions']);
        queryClient.invalidateQueries(['stats']);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRejectStudent = async (id, studentId) => {
    if (window.confirm('Are you sure you want to reject this student?')) {
      try {
        await api.put(`/submissions/${id}/students/${studentId}/status`, { status: 'rejected' });
        queryClient.invalidateQueries(['submissions']);
        queryClient.invalidateQueries(['stats']);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleArchiveSubmission = async (id) => {
    if (window.confirm('Are you sure you want to archive this submission? It will be hidden from the active list.')) {
      try {
        await api.put(`/submissions/${id}/status`, { status: 'archived' });
        queryClient.invalidateQueries(['submissions']);
        queryClient.invalidateQueries(['stats']);
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Failed to archive submission.');
      }
    }
  };

  const handleDeleteSubmission = async (id) => {
    if (window.confirm('Are you sure you want to PERMANENTLY delete this submission? This action cannot be undone.')) {
      try {
        await api.delete(`/submissions/${id}`);
        queryClient.invalidateQueries(['submissions']);
        queryClient.invalidateQueries(['stats']);
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Failed to delete submission.');
      }
    }
  };

  const handleRestoreSubmission = async (id) => {
    try {
      await api.put(`/submissions/${id}/status`, { status: 'pending' });
      queryClient.invalidateQueries(['submissions']);
      queryClient.invalidateQueries(['stats']);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to restore submission.');
    }
  };

  // --- APPROVE: Immediate (no dialog, uses today as placeholder date) ---
  const handleApproveGroup = (submission) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    approveGroupMutation.mutate({
      id: submission._id,
      dates: { validFrom: today.toISOString(), validTo: todayEnd.toISOString() }
    });
  };

  const handleApproveStudent = (submission, studentId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    approveStudentMutation.mutate({
      id: submission._id,
      studentId,
      dates: { validFrom: today.toISOString(), validTo: todayEnd.toISOString() }
    });
  };

  const handleBulkApprove = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    bulkActionMutation.mutate({
      studentIds: selectedStudentIds,
      action: 'approve',
      dates: { validFrom: today.toISOString(), validTo: todayEnd.toISOString() }
    });
  };

  // --- PRINT: Open date range dialog first, then print ---
  const openPrintDialog = (submission, student) => {
    setPendingPrint({ submission, student, isBulk: false });
    setValidityType('today');
    setCustomValDate('');
    setValFromDate('');
    setValToDate('');
    setPrintDialogOpen(true);
  };

  const openBulkPrintDialog = () => {
    const hasApproved = submissionsData?.data?.some(sub =>
      sub.students.some(s => selectedStudentIds.includes(s._id) && s.status === 'approved')
    );
    if (!hasApproved) {
      alert('Only APPROVED passes can be printed. Please approve selected students first.');
      return;
    }
    setPendingPrint({ isBulk: true });
    setValidityType('today');
    setCustomValDate('');
    setValFromDate('');
    setValToDate('');
    setPrintDialogOpen(true);
  };

  const handlePrintConfirm = async () => {
    const dates = getValidityDates();

    if (pendingPrint?.isBulk) {
      // Collect only approved students from current selection
      const printList = [];
      submissionsData?.data?.forEach(sub => {
        sub.students.forEach(stud => {
          if (selectedStudentIds.includes(stud._id) && stud.status === 'approved') {
            printList.push({
              name: stud.name,
              photoUrl: stud.photoUrl,
              requestId: sub.requestId,
              validFrom: dates.validFrom,
              validTo: dates.validTo,
              _id: stud._id
            });
          }
        });
      });

      if (printList.length === 0) {
        alert('No approved passes selected for printing.');
        setPrintDialogOpen(false);
        return;
      }

      setPassesToPrint(printList);

      // Save print dates to DB and mark as printed
      try {
        await api.post('/submissions/bulk-action', {
          studentIds: printList.map(p => p._id),
          action: 'approve',
          ...dates
        });
        await api.post('/submissions/bulk-action', {
          studentIds: printList.map(p => p._id),
          action: 'mark_printed'
        });
        queryClient.invalidateQueries(['submissions']);
        queryClient.invalidateQueries(['stats']);
      } catch (e) { console.error(e); }

      setSelectedStudentIds([]);
    } else {
      // Single student print
      const { submission, student } = pendingPrint;

      // Save chosen validity dates to DB
      try {
        await api.put(`/submissions/${submission._id}/students/${student._id}/status`, {
          status: 'approved',
          ...dates
        });
      } catch (e) { console.error(e); }

      setPassesToPrint([{
        name: student.name,
        photoUrl: student.photoUrl,
        requestId: submission.requestId,
        validFrom: dates.validFrom,
        validTo: dates.validTo
      }]);

      // Mark as printed
      try {
        await api.post('/submissions/bulk-action', {
          studentIds: [student._id],
          action: 'mark_printed'
        });
        queryClient.invalidateQueries(['submissions']);
        queryClient.invalidateQueries(['stats']);
      } catch (e) { console.error(e); }
    }

    setPrintDialogOpen(false);
    setPendingPrint(null);
  };

  // Bulk reject handler
  const handleBulkReject = () => {
    if (window.confirm(`Are you sure you want to reject ${selectedStudentIds.length} selected students?`)) {
      bulkActionMutation.mutate({
        studentIds: selectedStudentIds,
        action: 'reject'
      });
    }
  };

  const handleBulkArchive = () => {
    if (window.confirm(`Are you sure you want to archive submissions for the ${selectedStudentIds.length} selected students?`)) {
      bulkActionMutation.mutate({
        studentIds: selectedStudentIds,
        action: 'archive'
      });
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to PERMANENTLY delete submissions for the ${selectedStudentIds.length} selected students? This action cannot be undone.`)) {
      bulkActionMutation.mutate({
        studentIds: selectedStudentIds,
        action: 'delete'
      });
    }
  };

  // CSV Data Exporter
  const handleExportCSV = () => {
    if (!submissionsData?.data || submissionsData.data.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Request ID,Group Name,Phone,Student Name,Status,Valid From,Valid To,Printed\n';

    submissionsData.data.forEach(sub => {
      sub.students.forEach(stud => {
        const row = [
          sub.requestId,
          sub.groupName || 'N/A',
          sub.phoneNumber,
          stud.name,
          stud.status,
          stud.validFrom ? new Date(stud.validFrom).toLocaleDateString() : 'N/A',
          stud.validTo ? new Date(stud.validTo).toLocaleDateString() : 'N/A',
          stud.passGenerated ? 'Yes' : 'No'
        ].map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',');
        csvContent += row + '\n';
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `technopass_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PRINT PASSES SYSTEM
  const [passesToPrint, setPassesToPrint] = useState([]);

  // Perform browser native print dialogue when printable state updates
  useEffect(() => {
    if (passesToPrint.length > 0) {
      // Wait for every <img> in the print container to fully load before printing
      const waitForImages = () => new Promise((resolve) => {
        // Small initial delay to let React render the portal into the DOM
        setTimeout(() => {
          const container = document.getElementById('printable-pass-container');
          if (!container) return resolve();
          const images = Array.from(container.querySelectorAll('img'));
          if (images.length === 0) return resolve();

          let pending = images.length;
          const onDone = () => { if (--pending === 0) resolve(); };

          images.forEach(img => {
            if (img.complete && img.naturalHeight !== 0) {
              onDone();
            } else {
              img.addEventListener('load', onDone, { once: true });
              img.addEventListener('error', onDone, { once: true });
            }
          });

          // Safety fallback: print after 5s even if some images fail
          setTimeout(resolve, 5000);
        }, 100);
      });

      waitForImages().then(() => {
        window.print();
        setPassesToPrint([]);
      });
    }
  }, [passesToPrint]);

  // Date format utility
  const formatDateString = (dateVal) => {
    if (!dateVal) return 'N/A';
    return new Date(dateVal).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Layout>
      {/* Real-time banner socket notification */}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setNotification(null)} severity="info" sx={{ width: '100%', borderRadius: 2 }}>
          {notification}
        </Alert>
      </Snackbar>

      {/* OVERVIEW STATS CARDS */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { title: "Today's Requests", value: statsData?.totalRequestsToday ?? 0, color: '#2563EB' },
          { title: "Pending", value: statsData?.pendingRequests ?? 0, color: '#F59E0B' },
          { title: "Approved", value: statsData?.approvedRequests ?? 0, color: '#10B981' },
          { title: "Printed Passes", value: statsData?.printedPasses ?? 0, color: '#6366F1' },
          { title: "Active Passes", value: statsData?.totalActivePasses ?? 0, color: '#0F172A' },
          { title: "Today's Visitors", value: statsData?.todaysVisitors ?? 0, color: '#8B5CF6' }
        ].map((stat, idx) => (
          <Grid item xs={6} md={2} key={idx}>
            <Card sx={{ borderLeft: `4px solid ${stat.color}`, height: '100%' }}>
              <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                  {stat.title}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* SEARCH AND FILTERS BAR */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Search Box */}
            <Grid item xs={12} md={3.5}>
              <TextField
                fullWidth
                size="small"
                label="Search Submissions"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or Request ID..."
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: '#94A3B8', mr: 1, fontSize: 20 }} />
                }}
              />
            </Grid>

            {/* Status Filter */}
            <Grid item xs={6} md={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={status}
                  label="Status"
                  onChange={(e) => { setStatus(e.target.value); setPage(0); }}
                >
                  <MenuItem value="">All Submissions</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="printed">Printed</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Date Range Filter */}
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Option</InputLabel>
                <Select
                  value={dateFilter}
                  label="Date Option"
                  onChange={(e) => { setDateFilter(e.target.value); setPage(0); }}
                >
                  <MenuItem value="">All Dates</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="tomorrow">Tomorrow</MenuItem>
                  <MenuItem value="custom">Custom Date</MenuItem>
                  <MenuItem value="range">Date Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Predefined custom date inputs based on date option */}
            {(dateFilter === 'custom' || dateFilter === 'range') && (
              <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  type="date"
                  size="small"
                  label={dateFilter === 'range' ? 'From' : 'Select Date'}
                  InputLabelProps={{ shrink: true }}
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                  fullWidth
                />
                {dateFilter === 'range' && (
                  <TextField
                    type="date"
                    size="small"
                    label="To"
                    InputLabelProps={{ shrink: true }}
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                    fullWidth
                  />
                )}
              </Grid>
            )}

            {/* System Actions: Export, Seed QR, Reset */}
            <Grid item xs={12} md sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<QrIcon />}
                onClick={() => setQrDialogOpen(true)}
                size="small"
                sx={{ borderRadius: 2 }}
              >
                Scan QR Code
              </Button>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={handleExportCSV}
                size="small"
                sx={{ borderRadius: 2 }}
              >
                Export CSV
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* BULK ACTIONS CONTROL PANEL */}
      {selectedStudentIds.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: '#EFF6FF', border: '1px solid #BFDBFE' }} className="animate-fade-in">
          <CardContent sx={{ py: 1.5, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
              {selectedStudentIds.length} trainee(s) selected
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<ApproveIcon />}
                onClick={handleBulkApprove}
              >
                Approve Selected
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<RejectIcon />}
                onClick={handleBulkReject}
              >
                Reject Selected
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<PrintIcon />}
                onClick={openBulkPrintDialog}
              >
                Print Passes
              </Button>
              <Button
                variant="contained"
                color="warning"
                size="small"
                startIcon={<ArchiveIcon />}
                onClick={handleBulkArchive}
                sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' } }}
              >
                Archive Selected
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={handleBulkDelete}
                sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' } }}
              >
                Delete Selected
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={() => setSelectedStudentIds([])}
                sx={{ color: '#64748B' }}
              >
                Clear
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* SUBMISSIONS TABLE */}
      <TableContainer component={Paper} sx={{ mb: 2, borderRadius: 3, border: '1px solid #E2E8F0' }}>
        <Table aria-label="submissions table">
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell width={40}>
                <Checkbox
                  indeterminate={selectedStudentIds.length > 0 && selectedStudentIds.length < (submissionsData?.data?.reduce((acc, curr) => acc + curr.students.length, 0) || 0)}
                  checked={submissionsData?.data && selectedStudentIds.length === submissionsData.data.reduce((acc, curr) => acc + curr.students.length, 0)}
                  onChange={handleSelectAllStudentsInPage}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Request ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Contact Info</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Trainee Count</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Submission Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Overall Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={30} />
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
                    Loading submissions...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : !submissionsData?.data || submissionsData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="textSecondary" sx={{ fontWeight: 500 }}>
                    No submissions found matching filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              submissionsData.data.map((submission) => {
                const isExpanded = !!expandedRows[submission._id];
                const isGroup = !!submission.groupName;

                // Overall status styling
                let statusColor = 'warning';
                if (submission.status === 'approved') statusColor = 'success';
                if (submission.status === 'rejected') statusColor = 'error';
                if (submission.status === 'partially_approved') statusColor = 'info';
                if (submission.status === 'archived') statusColor = 'default';

                return (
                  <React.Fragment key={submission._id}>
                    <TableRow sx={{ '& > *': { borderBottom: 'unset' }, bgcolor: isExpanded ? '#F8FAFC' : 'transparent' }}>
                      <TableCell>
                        {submission.students.length > 1 ? (
                          <IconButton size="small" onClick={() => toggleRowExpand(submission._id)}>
                            {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                          </IconButton>
                        ) : (
                          submission.students[0] && (
                            <Avatar
                              src={getPhotoUrl(submission.students[0].photoUrl)}
                              sx={{ width: 36, height: 36, cursor: 'pointer', border: '1px solid #E2E8F0' }}
                              onClick={() => {
                                setPhotoUrl(submission.students[0].photoUrl);
                                setPhotoStudentName(submission.students[0].name);
                                setPhotoSubmissionId(submission._id);
                                setPhotoStudentId(submission.students[0]._id);
                                setPhotoModalOpen(true);
                              }}
                            />
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {/* Group selector or indicator */}
                        <Checkbox
                          checked={submission.students.every(s => selectedStudentIds.includes(s._id))}
                          onChange={(e) => {
                            const studentIds = submission.students.map(s => s._id);
                            if (e.target.checked) {
                              setSelectedStudentIds(prev => [...new Set([...prev, ...studentIds])]);
                            } else {
                              setSelectedStudentIds(prev => prev.filter(id => !studentIds.includes(id)));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                            {submission.requestId}
                          </Typography>
                          {isGroup ? (
                            <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 600 }}>
                              Group: {submission.groupName}
                            </Typography>
                          ) : (
                            submission.students[0] && (
                              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                                Trainee: {submission.students[0].name}
                              </Typography>
                            )
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{submission.phoneNumber}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {submission.students.length} Student{submission.students.length > 1 ? 's' : ''}
                      </TableCell>
                      <TableCell>{new Date(submission.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={submission.status.replace('_', ' ')}
                          color={statusColor}
                          size="small"
                          sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {submission.status === 'pending' && (
                            <>
                              <Tooltip title={submission.students.length > 1 ? "Approve Entire Group" : "Approve Student"}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleApproveGroup(submission)}
                                  sx={{ color: '#10B981', bgcolor: '#ECFDF5', '&:hover': { bgcolor: '#D1FAE5' } }}
                                >
                                  <ApproveIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={submission.students.length > 1 ? "Reject Entire Group" : "Reject Student"}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleRejectSubmission(submission._id)}
                                  sx={{ color: '#EF4444', bgcolor: '#FEF2F2', '&:hover': { bgcolor: '#FEE2E2' } }}
                                >
                                  <RejectIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {/* If single student and approved, show single print button */}
                          {submission.students.length === 1 && submission.students[0]?.status === 'approved' && (
                            <Tooltip title="Print Gate Pass">
                              <IconButton
                                size="small"
                                onClick={() => openPrintDialog(submission, submission.students[0])}
                                sx={{ color: '#2563EB', bgcolor: '#EFF6FF', '&:hover': { bgcolor: '#DBEAFE' } }}
                              >
                                <PrintIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {/* Restore if Archived */}
                          {submission.status === 'archived' && (
                            <Tooltip title="Restore Request to Pending">
                              <IconButton
                                size="small"
                                onClick={() => handleRestoreSubmission(submission._id)}
                                sx={{ color: '#10B981', bgcolor: '#ECFDF5', '&:hover': { bgcolor: '#D1FAE5' } }}
                              >
                                <ApproveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {/* Archive option if not already archived */}
                          {submission.status !== 'archived' && (
                            <Tooltip title="Archive Request">
                              <IconButton
                                size="small"
                                onClick={() => handleArchiveSubmission(submission._id)}
                                sx={{ color: '#F59E0B', bgcolor: '#FEF3C7', '&:hover': { bgcolor: '#FDE68A' } }}
                              >
                                <ArchiveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {/* Delete option */}
                          <Tooltip title="Delete Request Permanently">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteSubmission(submission._id)}
                              sx={{ color: '#EF4444', bgcolor: '#FEF2F2', '&:hover': { bgcolor: '#FEE2E2' } }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>

                    {/* EXPANDED SECTION (TRAINEE LIST) */}
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2, mb: 3 }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700, color: '#475569' }}>
                              Trainees List ({submission.students.length})
                            </Typography>
                            <Table size="small" aria-label="students table">
                              <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                                <TableRow>
                                  <TableCell width={40}></TableCell>
                                  <TableCell width={60}>Photo</TableCell>
                                  <TableCell>Name</TableCell>
                                  <TableCell>Validity Period</TableCell>
                                  <TableCell>Status</TableCell>
                                  <TableCell align="right">Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {submission.students.map((student) => {
                                  const isSelected = selectedStudentIds.includes(student._id);
                                  
                                  let studStatusColor = 'warning';
                                  if (student.status === 'approved') studStatusColor = 'success';
                                  if (student.status === 'rejected') studStatusColor = 'error';

                                  return (
                                    <TableRow key={student._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                      <TableCell>
                                        <Checkbox
                                          checked={isSelected}
                                          onChange={() => handleSelectStudent(student._id)}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Avatar
                                          src={getPhotoUrl(student.photoUrl)}
                                          sx={{ width: 40, height: 40, cursor: 'pointer', border: '1px solid #E2E8F0' }}
                                          onClick={() => {
                                            setPhotoUrl(student.photoUrl);
                                            setPhotoStudentName(student.name);
                                            setPhotoSubmissionId(submission._id);
                                            setPhotoStudentId(student._id);
                                            setPhotoModalOpen(true);
                                          }}
                                        />
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>{student.name}</TableCell>
                                      <TableCell>
                                        {student.status === 'approved' ? (
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#475569', fontSize: '12px' }}>
                                            <DateIcon sx={{ fontSize: 14 }} />
                                            <span>
                                              {formatDateString(student.validFrom)} - {formatDateString(student.validTo)}
                                            </span>
                                          </Box>
                                        ) : 'N/A'}
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          label={student.status}
                                          color={studStatusColor}
                                          size="small"
                                          sx={{ fontSize: '11px', fontWeight: 600 }}
                                        />
                                      </TableCell>
                                      <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                          {student.status === 'pending' && (
                                            <>
                                              <Tooltip title="Approve Student">
                                                <IconButton
                                                  size="small"
                                                  onClick={() => handleApproveStudent(submission, student._id)}
                                                  sx={{ color: '#10B981' }}
                                                >
                                                  <ApproveIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                              <Tooltip title="Reject Student">
                                                <IconButton
                                                  size="small"
                                                  onClick={() => handleRejectStudent(submission._id, student._id)}
                                                  sx={{ color: '#EF4444' }}
                                                >
                                                  <RejectIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                            </>
                                          )}
                                          {student.status === 'approved' && (
                                            <Tooltip title="Print Gate Pass">
                                              <IconButton
                                                size="small"
                                                onClick={() => openPrintDialog(submission, student)}
                                                sx={{ color: '#2563EB', bgcolor: '#EFF6FF' }}
                                              >
                                                <PrintIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                          )}
                                        </Stack>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* PAGINATION */}
        <TablePagination
          component="div"
          count={submissionsData?.total || 0}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 20, 50]}
        />
      </TableContainer>

      {/* PRINT DATE RANGE DIALOG */}
      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Select Print Date Range</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <FormControl fullWidth>
              <InputLabel>Validity Option</InputLabel>
              <Select
                value={validityType}
                label="Validity Option"
                onChange={(e) => setValidityType(e.target.value)}
              >
                <MenuItem value="today">Today Only</MenuItem>
                <MenuItem value="tomorrow">Tomorrow Only</MenuItem>
                <MenuItem value="custom">Custom Single Date</MenuItem>
                <MenuItem value="range">Date Range</MenuItem>
              </Select>
            </FormControl>

            {validityType === 'custom' && (
              <TextField
                type="date"
                label="Validity Date"
                InputLabelProps={{ shrink: true }}
                value={customValDate}
                onChange={(e) => setCustomValDate(e.target.value)}
                fullWidth
              />
            )}

            {validityType === 'range' && (
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField
                  type="date"
                  label="From Date"
                  InputLabelProps={{ shrink: true }}
                  value={valFromDate}
                  onChange={(e) => setValFromDate(e.target.value)}
                  fullWidth
                />
                <TextField
                  type="date"
                  label="To Date"
                  InputLabelProps={{ shrink: true }}
                  value={valToDate}
                  onChange={(e) => setValToDate(e.target.value)}
                  fullWidth
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setPrintDialogOpen(false)} sx={{ color: '#64748B' }}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" startIcon={<PrintIcon />} onClick={handlePrintConfirm}>
            Print Pass
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR CODE REGISTRATION URL DIALOG */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, textAlign: 'center' }}>Student Registration QR</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3, textAlign: 'center' }}>
            Print this QR Code and place it at the reception counter. Students can scan this with their smartphones to register instantly.
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, display: 'inline-flex', bgcolor: '#FFFFFF', borderRadius: 3 }}>
            <Box
              component="img"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/register')}&color=0f172a`}
              alt="TechnoPass Portal Registration QR"
              sx={{ width: 220, height: 220 }}
            />
          </Paper>
          <Typography variant="subtitle2" sx={{ mt: 3, fontWeight: 700, color: '#2563EB' }}>
            {window.location.origin}/register
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)} fullWidth variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* PHOTO VERIFICATION MODAL */}
      <PhotoVerificationModal
        open={photoModalOpen}
        handleClose={() => setPhotoModalOpen(false)}
        photoUrl={photoUrl}
        studentName={photoStudentName}
        submissionId={photoSubmissionId}
        studentId={photoStudentId}
        onPhotoUpdate={(newUrl) => {
          if (newUrl) setPhotoUrl(newUrl);
          queryClient.invalidateQueries(['submissions']);
        }}
      />

      {/* HIDDEN PRINT CONTAINER (Printed on window.print()) */}
      {passesToPrint.length > 0 && createPortal(
        <div id="printable-pass-container">
          {passesToPrint.map((pass, index) => {
            const formatPrintDate = (dateVal) => {
              if (!dateVal) return '';
              return new Date(dateVal).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });
            };

            const formattedDate = formatPrintDate(pass.validFrom) || formatPrintDate(new Date());
            const validFromStr = formatPrintDate(pass.validFrom);
          const validToStr = formatPrintDate(pass.validTo);
          const validityText = validFromStr === validToStr 
            ? validFromStr 
            : `from ${validFromStr} to ${validToStr}`;

          return (
            <div key={index} className="print-page" style={{
              width: '210mm', // A4 Dimensions
              height: '297mm',
              padding: '0',
              margin: 'auto',
              boxSizing: 'border-box',
              position: 'relative',
              backgroundColor: '#FFFFFF',
              color: '#000000',
              fontFamily: 'Arial, Helvetica, sans-serif',
              border: '1px solid #CCCCCC'
            }}>
              {/* Header Banner - Absolute Top */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto' }}>
                <img src="/images/header_banner.jpg" alt="Header Banner" style={{ width: '100%', display: 'block' }} />
              </div>

              {/* Main Body - Absolute Middle */}
              <div style={{
                position: 'absolute',
                top: '42mm',
                bottom: '40mm',
                left: 0,
                right: 0,
                padding: '0 20mm',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box'
              }}>
                <div style={{ textAlign: 'left', marginBottom: '8mm', fontSize: '13pt', lineHeight: '1.4' }}>
                  To<br />
                  The Security Officer<br />
                  Technopark
                </div>

                <div style={{ textAlign: 'right', marginBottom: '8mm', fontSize: '12pt' }}>
                  {formattedDate}
                </div>

                <div style={{ marginBottom: '6mm' }}>
                  Sir/ Ma'am
                </div>

                <div style={{ marginBottom: '10mm', textAlign: 'justify' }}>
                  Please permit our trainee <span style={{ textTransform: 'uppercase' }}>{pass.name}</span> to enter Technopark campus {validityText}.
                </div>

                {/* Passport Photo */}
                <div style={{
                  width: '35mm',
                  height: '45mm',
                  border: '1px solid #000000',
                  padding: '1px',
                  backgroundColor: '#FFFFFF',
                  marginBottom: '10mm'
                }}>
                  <img src={getPhotoUrl(pass.photoUrl)} alt="Trainee" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                {/* Note */}
                <div style={{ fontSize: '10.5pt', color: '#333333', marginBottom: '10mm', lineHeight: '1.5' }}>
                  Note: For issuing new gate passes you must submit this back to the admin. In case you lose your gate pass there will be a fine of Rs 1000.
                </div>

                {/* Bottom Stamps & HR section */}
                <div style={{ marginTop: '8mm' }}>
                  {/* Signatures & Stamps */}
                  <div style={{ position: 'relative', height: '25mm', marginBottom: '6mm' }}>
                    {/* Signature (stamp_large) - Sign first */}
                    <img src="/images/stamp_large.png" alt="Srishti Seal" style={{ width: '20.73mm', height: '17.47mm', position: 'absolute', left: '0', bottom: '0', zIndex: 1 }} />
                    {/* Seal (stamp_small) - Seal over signature */}
                    <img src="/images/stamp_small.png" alt="Srishti Stamp" style={{ width: '25.59mm', height: '24.85mm', position: 'absolute', left: '18mm', bottom: '0', zIndex: 2 }} />
                  </div>

                  {/* HR Contact info */}
                  <div style={{ fontSize: '12pt', lineHeight: '1.3' }}>Aarthi A G</div>
                  <div style={{ fontSize: '10pt', color: '#333333', lineHeight: '1.4' }}>
                    Contact No: +91-9072442200<br />
                    HR Team – Srishti Innovative
                  </div>
                </div>
              </div>

              {/* Footer Banner - Absolute Bottom */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 'auto' }}>
                <img src="/images/footer_banner.jpg" alt="Footer Banner" style={{ width: '100%', display: 'block' }} />
              </div>
            </div>
            );
          })}
        </div>,
        document.body
      )}
    </Layout>
  );
};

export default Dashboard;
