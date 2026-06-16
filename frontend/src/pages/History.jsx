import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
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
  Button,
  IconButton,
  TextField,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Chip,
  CircularProgress,
  TablePagination,
  Tooltip,
  Stack,
  Avatar
} from '@mui/material';
import {
  Print as PrintIcon,
  Search as SearchIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';

import Layout from '../components/Layout';
import PhotoVerificationModal from '../components/PhotoVerificationModal';
import api, { getPhotoUrl } from '../services/api';

const History = () => {
  // Queries state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Print system state
  const [passToPrint, setPassToPrint] = useState(null);

  // Photo modal state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoStudentName, setPhotoStudentName] = useState('');
  const [photoSubmissionId, setPhotoSubmissionId] = useState('');
  const [photoStudentId, setPhotoStudentId] = useState('');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 450);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Submissions list filtered specifically by 'printed'
  const { data: submissionsData, isLoading, refetch } = useQuery({
    queryKey: ['history', page, rowsPerPage, debouncedSearch, dateFilter, startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/submissions', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: debouncedSearch,
          status: 'printed', // Filter specifically for printed status
          dateFilter,
          startDate,
          endDate
        }
      });
      return res.data;
    }
  });

  // Flatten submissions to display list of individual trainee passes
  const getPrintedStudentsList = () => {
    if (!submissionsData?.data) return [];
    
    const list = [];
    submissionsData.data.forEach(sub => {
      sub.students.forEach(stud => {
        if (stud.passGenerated) {
          list.push({
            submissionId: sub._id,
            requestId: sub.requestId,
            phoneNumber: sub.phoneNumber,
            groupName: sub.groupName,
            ...stud
          });
        }
      });
    });
    return list;
  };

  const printedList = getPrintedStudentsList();

  const handleReprintPass = (student) => {
    setPassToPrint({
      name: student.name,
      photoUrl: student.photoUrl,
      requestId: student.requestId,
      validFrom: student.validFrom,
      validTo: student.validTo
    });
  };

  // Perform print trigger when printable pass state changes
  useEffect(() => {
    if (passToPrint) {
      setTimeout(() => {
        window.print();
        setPassToPrint(null);
      }, 500);
    }
  }, [passToPrint]);

  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    return new Date(dateVal).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Layout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
          Pass History & Archive
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Review, search, and reprint historically generated trainee gate passes.
        </Typography>
      </Box>

      {/* FILTER CONTROLS */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Search Box */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search Printed Passes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or Request ID..."
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: '#94A3B8', mr: 1, fontSize: 20 }} />
                }}
              />
            </Grid>

            {/* Date Option Filter */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Option</InputLabel>
                <Select
                  value={dateFilter}
                  label="Date Option"
                  onChange={(e) => { setDateFilter(e.target.value); setPage(0); }}
                >
                  <MenuItem value="">All Dates</MenuItem>
                  <MenuItem value="today">Today Only</MenuItem>
                  <MenuItem value="tomorrow">Tomorrow Only</MenuItem>
                  <MenuItem value="custom">Custom Date</MenuItem>
                  <MenuItem value="range">Date Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sub-date selections */}
            {(dateFilter === 'custom' || dateFilter === 'range') && (
              <Grid item xs={12} md={5} sx={{ display: 'flex', gap: 1.5 }}>
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
          </Grid>
        </CardContent>
      </Card>

      {/* HISTORY DATAGRID */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #E2E8F0' }}>
        <Table aria-label="history table">
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell width={60}>Photo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Trainee Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Request ID / Group</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Contact Phone</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Validity Window</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Printed Date</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : printedList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="textSecondary" sx={{ fontWeight: 500 }}>
                    No printed pass history matches filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              printedList.map((row, index) => (
                <TableRow key={`${row._id}-${index}`} hover>
                  <TableCell>
                    <Avatar
                      src={getPhotoUrl(row.photoUrl)}
                      sx={{ width: 42, height: 42, cursor: 'pointer', border: '1px solid #E2E8F0' }}
                      onClick={() => {
                        setPhotoUrl(row.photoUrl);
                        setPhotoStudentName(row.name);
                        setPhotoSubmissionId(row.submissionId);
                        setPhotoStudentId(row._id);
                        setPhotoModalOpen(true);
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#0F172A' }}>{row.name}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.requestId}</Typography>
                      {row.groupName && (
                        <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 600 }}>
                          Group: {row.groupName}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{row.phoneNumber}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#475569', fontSize: '13px' }}>
                      <CalendarIcon sx={{ fontSize: 14 }} />
                      <span>{formatDate(row.validFrom)} - {formatDate(row.validTo)}</span>
                    </Box>
                  </TableCell>
                  <TableCell>{row.printedAt ? new Date(row.printedAt).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Reprint Gate Pass">
                      <IconButton
                        size="small"
                        onClick={() => handleReprintPass(row)}
                        sx={{ color: '#2563EB', bgcolor: '#EFF6FF' }}
                      >
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

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

      {/* PHOTO PREVIEW */}
      <PhotoVerificationModal
        open={photoModalOpen}
        handleClose={() => setPhotoModalOpen(false)}
        photoUrl={photoUrl}
        studentName={photoStudentName}
        submissionId={photoSubmissionId}
        studentId={photoStudentId}
        onPhotoUpdate={(newUrl) => {
          if (newUrl) setPhotoUrl(newUrl);
          refetch();
        }}
      />

      {/* HIDDEN PRINT LAYOUT */}
      {passToPrint && createPortal(
        <div id="printable-pass-container">
          <div className="print-page" style={{
            width: '210mm',
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

            {/* Pass Body - Absolute Middle */}
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
              <div style={{ textAlign: 'left', marginBottom: '5mm', fontSize: '13pt', lineHeight: '1.4' }}>
                To<br />
                The Security Officer<br />
                Technopark
              </div>

              <div style={{ textAlign: 'right', marginBottom: '5mm', fontSize: '12pt' }}>
                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>

              <div style={{ marginBottom: '4mm' }}>
                Sir/ Ma'am
              </div>

              <div style={{ marginBottom: '6mm', textAlign: 'justify' }}>
                Please permit our trainee <span style={{ textTransform: 'uppercase' }}>{passToPrint.name}</span> to enter Technopark campus {(() => {
                  const formatPrintDate = (dateVal) => {
                    if (!dateVal) return '';
                    return new Date(dateVal).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    });
                  };
                  const validFromStr = formatPrintDate(passToPrint.validFrom);
                  const validToStr = formatPrintDate(passToPrint.validTo);
                  return validFromStr === validToStr 
                    ? validFromStr 
                    : `from ${validFromStr} to ${validToStr}`;
                })()}.
              </div>

              {/* Passport Photo */}
              <div style={{
                width: '35mm',
                height: '45mm',
                border: '1px solid #000000',
                padding: '1px',
                backgroundColor: '#FFFFFF',
                marginBottom: '6mm'
              }}>
                <img src={getPhotoUrl(passToPrint.photoUrl)} alt="Trainee" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              {/* Note */}
              <div style={{ fontSize: '10.5pt', color: '#333333', marginBottom: '6mm', lineHeight: '1.5' }}>
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
        </div>,
        document.body
      )}
    </Layout>
  );
};

export default History;
