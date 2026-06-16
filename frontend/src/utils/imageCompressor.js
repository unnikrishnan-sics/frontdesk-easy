/**
 * Compresses an image file on the client side using HTML5 Canvas.
 * Resizes the image to fit within maxDimensions and sets the JPEG quality.
 * 
 * @param {File} file - The original image file
 * @param {number} maxWidth - Maximum width (default: 600)
 * @param {number} maxHeight - Maximum height (default: 600)
 * @param {number} quality - JPEG compression quality (0 to 1, default: 0.75)
 * @returns {Promise<Blob>} - Compressed image Blob
 */
export const compressImage = (file, maxWidth = 600, maxHeight = 600, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File is not an image'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while preserving aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to compressed JPEG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a File object from the Blob to match Multer expectations
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
