const express = require("express");
const path = require("path");
const router = express.Router();

router.get("/pdf/:filename", (req, res) => {
  const filePath = path.join(__dirname, "../uploads", req.params.filename);
  res.download(filePath); // 👈 This forces download as a PDF
});

module.exports = router;
