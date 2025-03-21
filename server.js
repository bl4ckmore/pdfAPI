const express = require("express");
const cors = require("cors");
const pdfRoutes = require("./routes/pdfRoutes");
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/pdf", pdfRoutes); // ✅ This must be here

app.use("/pdf", express.static("uploads")); // ✅ To serve updated PDFs

app.listen(5000 || process.env.PORT, () => {
  console.log("✅ Server running");
});
