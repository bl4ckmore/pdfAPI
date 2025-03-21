const fs = require("fs");
const path = require("path");
const pool = require("../db");
const pdfParse = require("pdf-parse");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

async function replaceTextInPDF(req, res) {
  try {
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { searchText, replaceText } = req.body;
    if (!searchText || !replaceText) {
      return res.status(400).json({ message: "Missing search or replace text" });
    }

    const pdfBuffer = req.files.pdf.data;

    // Extract all text
    const parsed = await pdfParse(pdfBuffer);
    let textContent = parsed.text;

    if (!textContent.includes(searchText)) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    // Replace ALL occurrences
    const modifiedText = textContent.replace(new RegExp(searchText, "g"), replaceText);

    // ✅ Create new PDF and write modified text to it
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;

    page.drawText(modifiedText, {
      x: 30,
      y: height - 50,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      maxWidth: width - 60,
      lineHeight: 16,
    });

    const updatedPdfBytes = await pdfDoc.save();

    // Save updated file
    const filename = `updated-${Date.now()}.pdf`;
    const outputDir = path.join(__dirname, "..", "updated_pdfs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, updatedPdfBytes);

    // Log in DB
    await pool.query(
      "INSERT INTO pdf_logs(filename, search, replace) VALUES ($1, $2, $3)",
      [filename, searchText, replaceText]
    );

    return res.json({
      message: "✅ PDF processed with replacement",
      filename,
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return res.status(500).json({ message: "Error processing PDF", error: error.message });
  }
}

module.exports = { replaceTextInPDF };
