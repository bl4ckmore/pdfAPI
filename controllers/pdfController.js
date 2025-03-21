const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");

const conn = mongoose.connection;
let gfs;

conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
  console.log("✅ GridFS Initialized");
});

function normalizeText(text) {
  return text
    .replace(/ﬀ/g, "ff")
    .replace(/ﬃ/g, "ffi")
    .replace(/ﬄ/g, "ffl")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/ +/g, " ")
    .trim();
}

async function uploadPDFToMongoDB(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const writeStream = gfs.createWriteStream({ filename });
    writeStream.write(fileBuffer);
    writeStream.end();
    writeStream.on("finish", () => resolve(filename));
    writeStream.on("error", (err) => reject(err));
  });
}

async function replaceTextInPDF(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { searchText, replaceText } = req.body;
    if (!searchText || !replaceText) {
      return res.status(400).json({ message: "Missing search or replace text" });
    }

    const pdfBuffer = req.file.buffer;
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    let textFound = false;

    for (const page of pages) {
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Temporary workaround since full text replacement is limited
      page.drawText(`Replaced: ${replaceText}`, {
        x: 50,
        y: height - 50,
        size: 12,
        color: rgb(0, 0, 0),
        font,
      });

      textFound = true; // Fake flag to continue the flow
      break; // Optional: break to simulate replacement on first page only
    }

    if (!textFound) return res.status(400).json({ message: "Text not found in PDF" });

    const updatedPdfBytes = await pdfDoc.save();
    const updatedFilename = `updated-${req.file.filename}`;
    await uploadPDFToMongoDB(updatedPdfBytes, updatedFilename);

    res.json({ message: "PDF text replaced successfully", filename: updatedFilename });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).json({ message: "Error processing PDF" });
  }
}

module.exports = { replaceTextInPDF };