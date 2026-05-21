const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const tmpDir = path.join(__dirname, '../tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'library-pdfs',
    resource_type: 'raw',
    format: 'pdf',
    type: 'upload',        // ← thêm
    access_mode: 'public', // ← thêm
    public_id: (req, file) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      return `${Date.now()}-${safe}`;
    },
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Chỉ chấp nhận file PDF'), false);
};

exports.uploadPdf = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
}).single('pdf');

const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`),
});

const excelFilter = (req, file, cb) => {
  const allowed = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Chỉ chấp nhận file Excel .xlsx hoặc .xls'), false);
};

exports.uploadExcel = multer({
  storage: excelStorage,
  fileFilter: excelFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
}).single('file');
