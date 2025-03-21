const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve static files (PDFs)
app.use("/pdf", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("PDF API is running!");
});

// Import routes
const pdfRoutes = require("./routes/pdfRoutes");
app.use("/api/pdf", pdfRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
