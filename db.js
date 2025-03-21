// ✅ db.js
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");

const mongoURI = "mongodb+srv://bl4kcmore:Bl4ckmore4!@cluster0.ros1b.mongodb.net/pdfDB?retryWrites=true&w=majority";

const conn = mongoose.createConnection(mongoURI);
let gfs;

conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
  console.log("✅ GridFS initialized");
});

module.exports = { conn, gfs };
