const express = require("express");
const cors = require("cors");
const pdfRoutes = require("./routes/pdfRoutes");
const authRoutes = require("./routes/authRoutes"); // ✅ NEW
const authMiddleware = require("./middlewares/authMiddleware");
const pool = require("./db");




const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

const fileUpload = require("express-fileupload");
app.use(fileUpload());

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


app.get("/api/user/dashboard", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await pool.query("SELECT id, name, email FROM users WHERE id = $1", [userId]);
    const history = await pool.query("SELECT * FROM pdf_logs WHERE user_id = $1 ORDER BY created_at DESC", [userId]);

    res.json({
      user: user.rows[0],
      history: history.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
