const express = require("express");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const { conn } = require("../db"); // Import DB connection

const router = express.Router();

const storage = new GridFsStorage({
  url: "mongodb://localhost:27017/pdfDB",
  file: (req, file) => ({
    filename: file.originalname,
    bucketName: "uploads",
  }),
});

const upload = multer({ storage });

// Upload PDF
router.post("/upload", upload.single("pdf"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  res.json({ fileId: req.file.id, filename: req.file.filename });
});

module.exports = router;
