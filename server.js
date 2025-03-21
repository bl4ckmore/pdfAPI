const express = require("express");
const cors = require("cors");
const pdfRoutes = require("./routes/pdfRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/pdf", pdfRoutes);

// Serve updated PDFs
app.get("/pdf/:filename", (req, res) => {
  const filePath = `${__dirname}/updated_pdfs/${req.params.filename}`;
  res.download(filePath, (err) => {
    if (err) return res.status(404).json({ message: "File not found" });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
