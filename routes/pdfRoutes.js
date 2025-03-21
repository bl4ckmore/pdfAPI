const express = require("express");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage"); // ✅ Make sure this is correct
const { replaceTextInPDF } = require("../controllers/pdfController");

const router = express.Router();

const storage = new GridFsStorage({
  url: "mongodb+srv://gkupreishvili:admin@cluster.90tcw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster",
  file: (req, file) => {
    return {
      filename: file.originalname,
      bucketName: "uploads",
    };
  },
});

const upload = multer({ storage });

// Upload PDF
router.post("/upload", upload.single("pdf"), async (req, res) => {
  if (!req.file || !req.file.id) {
    return res.status(500).json({ message: "Failed to upload PDF to GridFS" });
  }

  res.json({
    fileId: req.file.id,
    filename: req.file.filename,
    message: "✅ Upload successful",
  });
});

// Replace text
router.post("/replace-text", upload.single("pdf"), replaceTextInPDF);

module.exports = router;
