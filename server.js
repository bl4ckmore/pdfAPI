const express = require("express");
const cors = require("cors");
const pdfRoutes = require("./routes/pdfRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/pdf", pdfRoutes); // 👈 This part is VERY important

// Serve updated PDFs
const path = require("path");
app.use("/pdf", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
