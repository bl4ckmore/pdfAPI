// ✅ pdfRoutes.js (Cleaned and Deployment-Ready)

const express = require("express");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const { replaceTextInPDF } = require("../controllers/pdfController");
const { conn } = require("../db");

const router = express.Router();

// GridFS Storage Configuration
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI || "mongodb+srv://bl4kcmore:Bl4ckmore4!@cluster0.ros1b.mongodb.net/?retryWrites=true&w=majority",
  file: (req, file) => ({
    filename: file.originalname,
    bucketName: "uploads",
  }),
});

const upload = multer({ storage });

// Upload Endpoint
router.post("/upload", upload.single("pdf"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  res.json({ fileId: req.file.id, filename: req.file.filename });
});

// Replace Text Endpoint
router.post("/replace-text", upload.single("pdf"), replaceTextInPDF);

module.exports = router;
