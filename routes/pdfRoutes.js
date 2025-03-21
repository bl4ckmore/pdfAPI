const express = require("express");
const multer = require("multer");
const { replaceTextInPDF } = require("../controllers/pdfController");

const router = express.Router();

// Configure file upload with Multer
const upload = multer({ dest: "uploads/" });

// ✅ Route to replace text in a PDF
router.post("/replace-text", upload.single("pdf"), replaceTextInPDF);

module.exports = router;
