const express = require("express");
const cors = require("cors");
const path = require("path");
const pdfRoutes = require("./routes/pdfRoutes");
const { gfs } = require("./db"); // 👈 Import from db.js

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach GridFS to app
app.set("gfs", gfs);

// Routes
app.use("/api/pdf", pdfRoutes);

// File download route
app.get("/pdf/:filename", async (req, res) => {
  const gfs = req.app.get("gfs");
  if (!gfs) return res.status(500).json({ message: "GridFS not initialized" });

  try {
    const file = await gfs.files.findOne({ filename: req.params.filename });
    if (!file) return res.status(404).json({ message: "File not found" });

    const readstream = gfs.createReadStream(file.filename);
    res.set("Content-Type", "application/pdf");
    readstream.pipe(res);
  } catch (err) {
    res.status(500).json({ message: "Error retrieving file", error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
