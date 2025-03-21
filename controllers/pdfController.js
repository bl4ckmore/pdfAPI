const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
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

// Function to replace text in a PDF
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

    // ✅ Check if the text exists in the PDF before replacing
    if (!extractedText.includes(normalizeText(searchText))) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    // Load the original PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    pages.forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText(replaceText, {
        x: 50,
        y: height - 50,
        size: 14,
        color: rgb(1, 0, 0),
      });
    });

    // ✅ Save the updated PDF
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
