const express = require("express");
const router = express.Router();
const multer = require("multer");
const { replaceTextInPDF } = require("../controllers/pdfController");

const upload = multer({ dest: "uploads/" });

router.post("/replace-text", upload.single("pdf"), replaceTextInPDF);

module.exports = router;
