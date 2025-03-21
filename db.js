// ✅ db.js
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");

const mongoURI = "mongodb+srv://gkupreishvili:admin@pdfdb-cluster.90tcw.mongodb.net/?retryWrites=true&w=majority&appName=pdfDB-cluster";

const conn = mongoose.createConnection(mongoURI);
let gfs;

conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
  console.log("✅ GridFS initialized");
});

module.exports = { conn, gfs };
