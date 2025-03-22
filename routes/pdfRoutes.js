const express = require("express");
const router = express.Router();
const fileUpload = require("express-fileupload");
const {
  replaceTextInPDF,
  extractTextFromPDF, // <- ADD THIS
} = require("../controllers/pdfController");

router.post("/replace-text", fileUpload(), replaceTextInPDF);
router.post("/extract-text", fileUpload(), extractTextFromPDF); // <- NEW ROUTE

module.exports = router;
