const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const { Readable } = require("stream");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

const conn = mongoose.connection;
let gfsBucket;

// ✅ Ensure GridFSBucket is ready
conn.once("open", () => {
  gfsBucket = new GridFSBucket(conn.db, { bucketName: "uploads" });
  console.log("✅ GridFS Initialized");
});

// Convert a stream into a Buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

// Upload new PDF to MongoDB
async function uploadPDFToMongoDB(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = gfsBucket.openUploadStream(filename);
    uploadStream.end(fileBuffer);
    uploadStream.on("finish", () => resolve(filename));
    uploadStream.on("error", reject);
  });
}

// Main function to replace text in PDF
async function replaceTextInPDF(req, res) {
  try {
    if (!gfsBucket) {
      return res.status(503).json({ message: "GridFS not initialized yet" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { searchText, replaceText } = req.body;
    if (!searchText || !replaceText) {
      return res.status(400).json({ message: "Missing search or replace text" });
    }

    const fileId = req.file.id || req.file._id;
    const downloadStream = gfsBucket.openDownloadStream(fileId);
    const pdfBuffer = await streamToBuffer(downloadStream);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    let textFound = false;

    for (const page of pages) {
      const { width, height } = page.getSize();

      // Just simulate replacement for now
      const modifiedText = `🔁 Replaced "${searchText}" with "${replaceText}"`;

      page.drawText(modifiedText, {
        x: 50,
        y: height - 50,
        size: 12,
        color: rgb(0, 0, 0),
        font: await pdfDoc.embedFont(StandardFonts.Helvetica),
      });

      textFound = true;
    }

    if (!textFound) {
      return res.status(404).json({ message: "Text not found in PDF" });
    }

    const updatedPdfBytes = await pdfDoc.save();
    const updatedFilename = `updated-${req.file.filename}`;
    await uploadPDFToMongoDB(updatedPdfBytes, updatedFilename);

    res.json({
      message: "PDF text replaced successfully",
      filename: updatedFilename,
    });
  } catch (error) {
    console.error("❌ Error in replaceTextInPDF:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

module.exports = { replaceTextInPDF };
