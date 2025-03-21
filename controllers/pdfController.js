const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

let gfsBucket = null;

// Wait for MongoDB connection and initialize GridFS
async function ensureGridFSReady() {
  if (gfsBucket) return;

  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once("open", resolve);
      mongoose.connection.on("error", reject);
    });
  }

  gfsBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });
  console.log("✅ GridFSBucket initialized");
}

// Convert a MongoDB stream to buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

// Upload a buffer to GridFS
async function uploadPDFToMongoDB(buffer, filename) {
  await ensureGridFSReady();

  return new Promise((resolve, reject) => {
    const uploadStream = gfsBucket.openUploadStream(filename);
    uploadStream.end(buffer);
    uploadStream.on("finish", () => resolve(filename));
    uploadStream.on("error", reject);
  });
}

// Replace text in the PDF and save to GridFS
async function replaceTextInPDF(req, res) {
  try {
    await ensureGridFSReady();

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

    if (!textFound) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    const updatedPdf = await pdfDoc.save();
    const newFilename = `updated-${req.file.filename}`;
    await uploadPDFToMongoDB(updatedPdf, newFilename);

    res.json({ message: "PDF text replaced successfully", filename: newFilename });
  } catch (error) {
    console.error("❌ Error in replaceTextInPDF:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

module.exports = { replaceTextInPDF };
