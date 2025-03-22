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

    const { searchText } = req.body;
    if (!searchText) {
      return res.status(400).json({ message: "Missing search text" });
    }

    const pdfBuffer = req.files.pdf.data;

    // Extract text content
    const parsed = await pdfParse(pdfBuffer);
    const textContent = parsed.text;

    if (!textContent.includes(searchText)) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    // Replace all occurrences of searchText with empty string
    const clearedText = textContent.replace(new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g"), "");

    // Create a new PDF and write the cleared content
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const { width, height } = page.getSize();
    const margin = 30;
    const lineHeight = 16;

    // Split and write line-by-line
    const lines = clearedText.split(/\r?\n/);
    let y = height - margin;
    for (const line of lines) {
      if (y < margin) {
        y = height - margin;
        pdfDoc.addPage();
      }

      try {
        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
        y -= lineHeight;
      } catch (err) {
        console.warn("⚠️ Skipped line:", line);
      }
    }

    // Save and respond
    const updatedPdfBytes = await pdfDoc.save();
    const filename = `cleared-${Date.now()}.pdf`;
    const outputDir = path.join(__dirname, "..", "updated_pdfs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, updatedPdfBytes);

    // Optional DB log
    await pool.query(
      "INSERT INTO pdf_logs(filename, search, replace) VALUES ($1, $2, $3)",
      [filename, searchText, "[CLEARED]"]
    );

    res.json({ message: "✅ Text cleared successfully", filename });

  } catch (error) {
    console.error("❌ ERROR:", error);
    res.status(500).json({ message: "Error processing PDF", error: error.message });
  }
}

module.exports = { replaceTextInPDF };
