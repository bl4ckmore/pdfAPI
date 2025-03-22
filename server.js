const express = require("express");
const cors = require("cors");
const pdfRoutes = require("./routes/pdfRoutes");
const authRoutes = require("./routes/authRoutes"); // ✅ NEW

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/pdf", pdfRoutes);
app.use("/api/auth", authRoutes); // ✅ REGISTER / LOGIN ROUTES

// Serve updated PDFs
app.get("/pdf/:filename", (req, res) => {
  const filePath = `${__dirname}/updated_pdfs/${req.params.filename}`;
  res.download(filePath, (err) => {
    if (err) return res.status(404).json({ message: "File not found" });
  });
});

// Optional: health check
app.get("/", (req, res) => {
  res.send("🔥 PDF API is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
