const express = require("express");
const fileUpload = require("express-fileupload"); // ✅ ADD THIS
const router = express.Router();
const { replaceTextInPDF } = require("../controllers/pdfController");

router.post("/replace-text", fileUpload(), replaceTextInPDF);
router.post("/extract-text", fileUpload(), extractTextFromPDF);

module.exports = router;
