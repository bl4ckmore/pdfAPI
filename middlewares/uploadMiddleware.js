const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure 'uploads' folder exists
const uploadPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log('✅ Uploads folder created successfully.');
}

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('🟡 Storing file in:', uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        console.log('🟢 Received file:', file.originalname);
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// File filter (only PDFs allowed)
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        console.log('❌ Invalid file type:', file.mimetype);
        cb(new Error('Only PDF files are allowed!'), false);
    }
};

// Initialize Multer
const upload = multer({ storage, fileFilter });

module.exports = upload;
