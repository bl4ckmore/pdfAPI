const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const pdfParse = require("pdf-parse");

// Normalize text function (fix ligatures & spacing issues)
function normalizeText(text) {
  return text
    .replace(/ﬀ/g, "ff") // Fix ligatures
    .replace(/ﬃ/g, "ffi")
    .replace(/ﬄ/g, "ffl")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/ +/g, " ") // Remove extra spaces
    .trim();
}

async function replaceTextInPDF(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { searchText, replaceText } = req.body;
    if (!searchText || !replaceText) {
      return res.status(400).json({ message: "Missing search or replace text" });
    }

    const inputPath = path.join(__dirname, "../uploads", req.file.filename);
    const outputPath = path.join(__dirname, "../uploads", `updated-${req.file.filename}`);

    // Read the PDF file
    const pdfBuffer = fs.readFileSync(inputPath);
    
    // Extract text using `pdf-parse`
    const data = await pdfParse(pdfBuffer);
    let extractedText = normalizeText(data.text);

    if (!extractedText.includes(normalizeText(searchText))) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    // Load the existing PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    pages.forEach((page) => {
      const { width, height } = page.getSize();

      // REMOVE OLD TEXT (draw a white rectangle over it)
      page.drawRectangle({
        x: 50,
        y: height - 100,
        width: 300,
        height: 20,
        color: rgb(1, 1, 1), // White color
      });

      // ADD NEW TEXT in the same place
      page.drawText(replaceText, {
        x: 50,
        y: height - 100,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
    });

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, modifiedPdfBytes);

    res.json({
      message: "PDF text replaced successfully",
      filename: `updated-${req.file.filename}`,
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).json({ message: "Error processing PDF" });
  }
}

module.exports = { replaceTextInPDF };
