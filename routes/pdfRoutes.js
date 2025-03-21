const express = require("express");
const router = express.Router();
const { replaceTextInPDF } = require("../controllers/pdfController");

router.post("/replace-text", replaceTextInPDF);

module.exports = router;
