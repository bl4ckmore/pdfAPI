const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

// ✅ MongoDB & GridFS Setup
const conn = mongoose.connection;
let gfsBucket;

conn.once("open", () => {
  gfsBucket = new GridFSBucket(conn.db, { bucketName: "uploads" });
  console.log("✅ GridFS Initialized");
});

// ✅ Upload PDF to MongoDB
async function uploadPDFToMongoDB(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = gfsBucket.openUploadStream(filename);
    uploadStream.end(fileBuffer);

    uploadStream.on("finish", () => resolve(filename));
    uploadStream.on("error", (err) => reject(err));
  });
}

// ✅ Replace Text in PDF
async function replaceTextInPDF(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { searchText, replaceText } = req.body;
    if (!searchText || !replaceText)
      return res.status(400).json({ message: "Missing search or replace text" });

    console.log("✅ Incoming fields:", { searchText, replaceText });

    const pdfBuffer = req.file.buffer;
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    let textFound = false;

    for (const page of pages) {
      let pageText = page.getTextContent ? await page.getTextContent() : "";
      pageText = pageText.items ? pageText.items.map((item) => item.str).join(" ") : "";

      if (pageText.includes(searchText)) {
        textFound = true;

        const modifiedText = pageText.replace(
          new RegExp(searchText, "g"),
          replaceText
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

    if (!textFound)
      return res.status(400).json({ message: "Text not found in PDF" });

    const updatedPdfBytes = await pdfDoc.save();

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
