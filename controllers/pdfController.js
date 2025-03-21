const fs = require("fs");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");
const pdfParse = require("pdf-parse");

// MongoDB & GridFS Setup
const conn = mongoose.connection;
let gfs;
conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
  console.log("✅ GridFS Initialized");
});

// Normalize text function (fix ligatures & spacing issues)
function normalizeText(text) {
  return text
    .replace(/ﬀ/g, "ff")
    .replace(/ﬃ/g, "ffi")
    .replace(/ﬄ/g, "ffl")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/ +/g, " ") // Remove extra spaces
    .trim();
}

// Upload PDF to MongoDB
async function uploadPDFToMongoDB(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const writeStream = gfs.createWriteStream({ filename });
    writeStream.write(fileBuffer);
    writeStream.end();
    writeStream.on("finish", () => resolve(filename));
    writeStream.on("error", (err) => reject(err));
  });
}

// Replace text in PDF
async function replaceTextInPDF(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { searchText, replaceText } = req.body;
    if (!searchText || !replaceText)
      return res.status(400).json({ message: "Missing search or replace text" });

    // Load the PDF from the request
    const pdfBuffer = req.file.buffer;
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    let textFound = false;

    // Loop through pages to find & replace text
    for (const page of pages) {
      let pageText = await page.getTextContent();
      pageText = pageText.items.map((item) => item.str).join(" ");
      pageText = normalizeText(pageText);

      if (pageText.includes(normalizeText(searchText))) {
        textFound = true;
        const modifiedText = pageText.replace(
          new RegExp(normalizeText(searchText), "g"),
          normalizeText(replaceText)
        );

        const { width, height } = page.getSize();
        page.drawText(modifiedText, {
          x: 50,
          y: height - 50,
          size: 12,
          color: rgb(0, 0, 0),
          font: await pdfDoc.embedFont(StandardFonts.Helvetica),
        });
      }
    }

    if (!textFound) return res.status(400).json({ message: "Text not found in PDF" });

    // Save updated PDF
    const updatedPdfBytes = await pdfDoc.save();

    // Upload new PDF to MongoDB GridFS
    const updatedFilename = `updated-${req.file.filename}`;
    await uploadPDFToMongoDB(updatedPdfBytes, updatedFilename);

    res.json({
      message: "PDF text replaced successfully",
      filename: updatedFilename,
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).json({ message: "Error processing PDF" });
  }
}

module.exports = { replaceTextInPDF };
