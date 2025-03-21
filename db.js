// ✅ db.js
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");

const mongoURI =
  "mongodb+srv://gkupreishvili:admin@cluster.90tcw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // 🔥 Force ignore SSL validation

const conn = mongoose.createConnection(mongoURI);
let gfs;



conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
  console.log("✅ GridFS initialized");
});

module.exports = { conn, gfs };
