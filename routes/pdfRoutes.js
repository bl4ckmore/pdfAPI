const express = require("express");
const multer = require("multer");
const { GridFSBucket } = require("mongodb");
const { conn } = require("../db"); // Import MongoDB connection
const { replaceTextInPDF } = require("../controllers/pdfController");

const router = express.Router();

// Use memory storage for multer (we will manually upload)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize GridFS Bucket
let gfsBucket;
conn.once("open", () => {
  gfsBucket = new GridFSBucket(conn.db, { bucketName: "uploads" });
});

// 📌 Upload PDF
router.post("/upload", upload.single("pdf"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const uploadStream = gfsBucket.openUploadStream(req.file.originalname);
    uploadStream.end(req.file.buffer);

    uploadStream.on("finish", () => {
      res.json({
        message: "File uploaded successfully",
        filename: req.file.originalname,
      });
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ message: "Error uploading file" });
  }
});

// 📌 Replace Text in PDF
router.post("/replace-text", upload.single("pdf"), replaceTextInPDF);

// 📌 Get PDF
router.get("/:filename", async (req, res) => {
  try {
    const file = await gfsBucket.find({ filename: req.params.filename }).toArray();
    if (!file || file.length === 0) return res.status(404).json({ message: "File not found" });

    const downloadStream = gfsBucket.openDownloadStreamByName(req.params.filename);
    res.set("Content-Type", "application/pdf");
    downloadStream.pipe(res);
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).json({ message: "Error retrieving file" });
  }
});

module.exports = router;
