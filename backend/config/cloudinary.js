const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a file buffer directly to Cloudinary
 * @param {Buffer} buffer - File buffer from Multer memory storage
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<object>} - Cloudinary upload result
 */
const uploadStream = (buffer, folder = 'technopass') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 600, height: 600, crop: 'limit' }, // auto resize large images
          { quality: 'auto:good' }                   // compress automatically
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    stream.end(buffer);
  });
};

module.exports = {
  cloudinary,
  uploadStream
};
