const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

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

    // Load the existing PDF
    const existingPdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Embed a built-in font
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    // Modify the first page text (Example)
    const pages = pdfDoc.getPages();
    pages.forEach((page) => {
      page.drawText(replaceText, {
        x: 50,
        y: 500, // Adjust position as needed
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });
    });

    // Save the modified PDF
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);

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
