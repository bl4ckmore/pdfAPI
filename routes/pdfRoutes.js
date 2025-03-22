const express = require("express");
const router = express.Router();
const uploadMiddleware = require("../middlewares/uploadMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const pdfController = require("../controllers/pdfController");

// ✅ Use named functions from controller
router.post("/replace-text", authMiddleware, uploadMiddleware, pdfController.replaceTextInPDF);
router.post("/extract-text", uploadMiddleware, pdfController.extractTextFromPDF);

module.exports = router;
