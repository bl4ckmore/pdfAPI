const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const pdfParse = require("pdf-parse");

// Normalize text function (fix ligatures & spacing issues)
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
    const data = await pdfParse(pdfBuffer);
    let extractedText = normalizeText(data.text);

    if (!extractedText.includes(normalizeText(searchText))) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    // Load the existing PDF
    const existingPdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();

    // Use a standard font for replacing text
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    pages.forEach((page) => {
      let text = extractedText; // Use extracted text
      if (text.includes(normalizeText(searchText))) {
        // Replace text in a simple way (adjust for formatting)
        const modifiedText = text.replace(new RegExp(normalizeText(searchText), "g"), normalizeText(replaceText));

        // Remove old text by drawing a white rectangle over it (rudimentary)
        page.drawRectangle({
          x: 50,
          y: page.getHeight() - 50,
          width: 500,
          height: 20,
          color: rgb(1, 1, 1),
        });

        // Write new text in the same location
        page.drawText(modifiedText, {
          x: 50,
          y: page.getHeight() - 50,
          font,
          size: 12,
          color: rgb(0, 0, 0),
        });
      }
    });

    // Save the updated PDF
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
