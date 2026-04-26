const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Storage Engine with dynamic parameters based on field name
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // 16:9 ratio for banners
    if (file.fieldname === 'banner' || file.fieldname === 'bannerImage') {
      return {
        folder: 'scrimx_banners',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 1920, height: 1080, crop: 'limit' }]
      };
    }
    // 1:1 ratio for avatars/logos
    return {
      folder: 'scrimx_uploads',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      transformation: [{ width: 1080, height: 1080, crop: 'limit' }]
    };
  }
});

// Initialize Multer
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit per file
});

// Banner-specific storage (16:9 ratio instead of 1:1)
const bannerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'scrimx_banners',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1920, height: 1080, crop: 'limit' }]
  }
});

const bannerUpload = multer({
  storage: bannerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Chat-specific storage (allows PDFs + images, separate folder)
const chatStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'scrimx_chat',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf', 'gif'],
    resource_type: 'auto',
    transformation: [{ width: 1920, height: 1920, crop: 'limit' }]
  }
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB for chat files
});

// Memory-storage multer for email attachments (files stay in RAM as Buffer, never stored)
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,   // 10MB per file
    files: 5                        // max 5 attachments
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // xlsx
      'text/plain'
    ];
    cb(null, allowed.includes(file.mimetype));
  }
});

module.exports = {
  upload,
  chatUpload,
  memoryUpload,
  bannerUpload,
  cloudinary
};
