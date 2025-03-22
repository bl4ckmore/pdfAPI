const express = require("express");
const router = express.Router();
const { replaceTextInPDF, extractTextFromPDF } = require("../controllers/pdfController");
const uploadMiddleware = require("../middlewares/uploadMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/replace-text", authMiddleware, uploadMiddleware, replaceTextInPDF);
router.post("/extract-text", uploadMiddleware, extractTextFromPDF);

module.exports = router;
