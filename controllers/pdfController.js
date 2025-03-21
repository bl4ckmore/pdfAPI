const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

// Store gfsBucket instance
let gfsBucket;

function initGridFSBucket() {
  if (!gfsBucket && mongoose.connection.readyState === 1) {
    gfsBucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });
    console.log("✅ GridFS Initialized (on-demand)");
  }
}

// Convert stream to buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

// Upload file to MongoDB
async function uploadPDFToMongoDB(buffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = gfsBucket.openUploadStream(filename);
    uploadStream.end(buffer);
    uploadStream.on("finish", () => resolve(filename));
    uploadStream.on("error", reject);
  });
}

// Replace Text in PDF
async function replaceTextInPDF(req, res) {
  try {
    initGridFSBucket(); // Ensure it's ready

    if (!gfsBucket) {
      return res.status(500).json({ message: "GridFS not initialized" });
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

      const replacementNote = `🔁 Replaced "${searchText}" with "${replaceText}"`;
      page.drawText(replacementNote, {
        x: 50,
        y: height - 50,
        size: 12,
        font: await pdfDoc.embedFont(StandardFonts.Helvetica),
        color: rgb(0, 0, 0),
      });

      textFound = true;
    }

    const updatedPdf = await pdfDoc.save();
    const newFilename = `updated-${req.file.filename}`;
    await uploadPDFToMongoDB(updatedPdf, newFilename);

    res.json({ message: "Text replaced and PDF saved", filename: newFilename });
  } catch (error) {
    console.error("❌ Error in replaceTextInPDF:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
}

module.exports = { replaceTextInPDF };
