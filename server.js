const express = require("express");
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");
const cors = require("cors");
const path = require("path");
const pdfRoutes = require("./routes/pdfRoutes"); // make sure this route file exists

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB URI (MongoDB Atlas in your case)
const mongoURI = "mongodb+srv://bl4kcmore:Bl4ckmore4!@cluster0.ros1b.mongodb.net/?retryWrites=true&w=majority";

// Connect to MongoDB
mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected successfully!"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const conn = mongoose.connection;
let gfs;

conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
  console.log("✅ GridFS initialized");
});

// Make GridFS accessible globally
app.set("gfs", gfs);

// Routes
app.use("/api/pdf", pdfRoutes);

// Optional: Serve files directly if needed
app.get("/pdf/:filename", async (req, res) => {
  const gfs = req.app.get("gfs");
  if (!gfs) return res.status(500).json({ message: "GridFS not initialized" });

  const file = await gfs.files.findOne({ filename: req.params.filename });
  if (!file) return res.status(404).json({ message: "File not found" });

  const readstream = gfs.createReadStream(file.filename);
  res.set("Content-Type", "application/pdf");
  readstream.pipe(res);
});

// ✅ PORT fix for Render
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
