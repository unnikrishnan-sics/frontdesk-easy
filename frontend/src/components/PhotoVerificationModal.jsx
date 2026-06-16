import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Tooltip,
  Button,
  Slider,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  Grid
} from '@mui/material';
import {
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateRight as RotateRightIcon,
  RotateLeft as RotateLeftIcon,
  RestartAlt as ResetIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Crop as CropIcon,
  Save as SaveIcon,
  PhotoCamera as ViewIcon
} from '@mui/icons-material';
import api, { getPhotoUrl } from '../services/api';

// Helper to calculate rotated bounding size
const rotateSize = (width, height, rotation) => {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

// Helper to crop & rotate image via canvas
const getCroppedImg = (imageSrc, croppedAreaPixels, rotation = 0) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.crossOrigin = 'anonymous'; // prevent CORS canvas tainting
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const rotRad = (rotation * Math.PI) / 180;
      const { width: bWidth, height: bHeight } = rotateSize(
        image.width,
        image.height,
        rotation
      );

      canvas.width = bWidth;
      canvas.height = bHeight;

      // Translate and rotate canvas
      ctx.translate(bWidth / 2, bHeight / 2);
      ctx.rotate(rotRad);
      ctx.translate(-image.width / 2, -image.height / 2);

      // Draw rotated image
      ctx.drawImage(image, 0, 0);

      // Create cropped output canvas
      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d');

      croppedCanvas.width = croppedAreaPixels.width;
      croppedCanvas.height = croppedAreaPixels.height;

      croppedCtx.drawImage(
        canvas,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      croppedCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.85);
    };
    image.onerror = (error) => reject(error);
  });
};

const PhotoVerificationModal = ({
  open,
  handleClose,
  photoUrl,
  studentName,
  submissionId,
  studentId,
  onPhotoUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Crop view states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 1));
  const handleRotateRight = () => setRotation(prev => (prev + 90) % 360);
  const handleRotateLeft = () => setRotation(prev => (prev - 90) % 360);
  const handleToggleFullscreen = () => setIsFullscreen(!isFullscreen);
  
  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setIsFullscreen(false);
  };

  const handleModalClose = () => {
    handleReset();
    setIsEditing(false);
    handleClose();
  };

  // Perform canvas crop, upload, and database save
  const handleSaveCrop = async () => {
    if (!croppedAreaPixels) return;

    try {
      setSaving(true);
      
      // 1. Get cropped image Blob
      const croppedBlob = await getCroppedImg(getPhotoUrl(photoUrl), croppedAreaPixels, rotation);
      
      // 2. Convert Blob to File object
      const file = new File([croppedBlob], `cropped_${studentId}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      // 3. Upload to Cloudinary via Express Backend
      const formData = new FormData();
      formData.append('photo', file);

      const uploadRes = await api.post('/submissions/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (uploadRes.data.success) {
        const newPhotoUrl = uploadRes.data.photoUrl;

        // 4. Update the student's photoUrl in MongoDB
        const updateRes = await api.put(`/submissions/${submissionId}/students/${studentId}/photo`, {
          photoUrl: newPhotoUrl
        });

        if (updateRes.data.success) {
          setAlertSeverity('success');
          setAlertMsg('Photo cropped, rotated, and updated successfully!');
          setIsEditing(false);
          if (onPhotoUpdate) {
            onPhotoUpdate(); // refresh table in parent view
          }
        }
      }
    } catch (error) {
      console.error(error);
      setAlertSeverity('error');
      setAlertMsg(error.response?.data?.message || 'Failed to save cropped image.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleModalClose}
      maxWidth={isFullscreen ? 'xl' : 'md'}
      fullWidth
      fullScreen={isFullscreen}
      PaperProps={{
        sx: {
          bgcolor: '#0F172A',
          color: '#FFFFFF',
          transition: 'all 0.3s ease-in-out'
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 800 }}>
          {isEditing ? 'Crop & Rotate Profile Photo' : `Photo Verification - ${studentName || 'Student'}`}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Main action toggles: View Mode vs Edit Mode */}
          {submissionId && studentId && (
            <Button
              variant={isEditing ? 'outlined' : 'contained'}
              color={isEditing ? 'inherit' : 'secondary'}
              size="small"
              startIcon={isEditing ? <ViewIcon /> : <CropIcon />}
              onClick={() => { setIsEditing(!isEditing); handleReset(); }}
              disabled={saving}
              sx={{ borderRadius: 2 }}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Photo'}
            </Button>
          )}

          {!isEditing && (
            <>
              <Tooltip title="Zoom In">
                <IconButton onClick={handleZoomIn} color="inherit">
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out">
                <IconButton onClick={handleZoomOut} color="inherit">
                  <ZoomOutIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rotate Left">
                <IconButton onClick={handleRotateLeft} color="inherit">
                  <RotateLeftIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rotate Right">
                <IconButton onClick={handleRotateRight} color="inherit">
                  <RotateRightIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset Visuals">
                <IconButton onClick={handleReset} color="inherit">
                  <ResetIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}>
                <IconButton onClick={handleToggleFullscreen} color="inherit">
                  {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              </Tooltip>
            </>
          )}
          <IconButton onClick={handleModalClose} color="inherit">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: isFullscreen ? 'calc(100vh - 120px)' : '500px', bgcolor: '#090D16' }}>
        {isEditing ? (
          /* EDIT CROP WORKSPACE */
          <Box sx={{ position: 'relative', flexGrow: 1, width: '100%', bgcolor: '#0B0F19' }}>
            <Cropper
              image={getPhotoUrl(photoUrl)}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={3 / 4} // Locked aspect ratio matching vertical passport layout
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          </Box>
        ) : (
          /* VIEW PREVIEW */
          <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
            <Box
              component="img"
              src={getPhotoUrl(photoUrl)}
              alt={studentName || 'Student Photo'}
              sx={{
                maxHeight: '90%',
                maxWidth: '90%',
                objectFit: 'contain',
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0px 10px 30px rgba(0,0,0,0.5)',
                borderRadius: '4px'
              }}
            />
          </Box>
        )}

        {/* CROP EDIT CONTROL SLIDERS (Only shown in Edit mode) */}
        {isEditing && (
          <Box sx={{ p: 3, borderTop: '1px solid #1E293B', bgcolor: '#0F172A' }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={5}>
                <Stack spacing={1} direction="row" alignItems="center">
                  <Typography variant="body2" sx={{ width: 60, fontWeight: 600 }}>Zoom:</Typography>
                  <Slider
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={(e, val) => setZoom(val)}
                    valueLabelDisplay="auto"
                    sx={{ color: '#2563EB' }}
                  />
                </Stack>
              </Grid>

              <Grid item xs={12} md={5}>
                <Stack spacing={1} direction="row" alignItems="center">
                  <Typography variant="body2" sx={{ width: 60, fontWeight: 600 }}>Rotate:</Typography>
                  <Slider
                    value={rotation}
                    min={0}
                    max={360}
                    step={1}
                    onChange={(e, val) => setRotation(val)}
                    valueLabelDisplay="auto"
                    sx={{ color: '#10B981' }}
                  />
                </Stack>
              </Grid>

              <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveCrop}
                  disabled={saving}
                  fullWidth
                  sx={{ py: 1.25, borderRadius: 2 }}
                >
                  Save Photo
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      {/* Notifications Alert */}
      <Snackbar
        open={Boolean(alertMsg)}
        autoHideDuration={4000}
        onClose={() => setAlertMsg('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setAlertMsg('')} severity={alertSeverity} sx={{ width: '100%' }}>
          {alertMsg}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default PhotoVerificationModal;
