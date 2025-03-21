const mongoose = require("mongoose");
const Grid = require("gridfs-stream");

// MongoDB Atlas URI
const mongoURI = "mongodb+srv://bl4kcmore:Bl4ckmore4!@cluster0.ros1b.mongodb.net/?retryWrites=true&w=majority";

// Connect
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected successfully!"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const conn = mongoose.connection;
let gfs;

conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
  console.log("✅ GridFS initialized");
});

module.exports = { conn, gfs };
