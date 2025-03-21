const express = require("express");
const router = express.Router();
const multer = require("multer");
const { replaceTextInPDF } = require("../controllers/pdfController");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + file.originalname;
    cb(null, uniqueSuffix);
  },
});

const upload = multer({ storage });

router.post("/replace-text", upload.single("pdf"), replaceTextInPDF);

module.exports = router;
