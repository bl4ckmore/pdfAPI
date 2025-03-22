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

    // ✅ Extract all text
    const parsed = await pdfParse(pdfBuffer);
    let textContent = parsed.text;

    if (!textContent.includes(searchText)) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    // ✅ Safe replacement using regex (escapes special characters)
    const safeRegex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g");
    const modifiedText = textContent.replace(safeRegex, replaceText);

    // ✅ Split into lines for layout
    const lines = modifiedText.split(/\r?\n/);

    // ✅ Create new PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const lineHeight = 18;
    const margin = 30;
    const maxLinesPerPage = 40;

    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let y = height - margin;
    let lineCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "") continue;

      if (lineCount >= maxLinesPerPage) {
        page = pdfDoc.addPage();
        y = height - margin;
        lineCount = 0;
      }

      try {
        page.drawText(line, {
          x: margin,
          y: y - lineHeight * lineCount,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          maxWidth: width - margin * 2,
        });
        lineCount++;
      } catch (err) {
        console.warn("⚠️ Skipped line due to character issue:", line);
      }
    }

    // ✅ Save the new PDF
    const updatedPdfBytes = await pdfDoc.save();
    const filename = `updated-${Date.now()}.pdf`;
    const outputDir = path.join(__dirname, "..", "updated_pdfs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, updatedPdfBytes);

    // ✅ Log to PostgreSQL
    await pool.query(
      "INSERT INTO pdf_logs(filename, search, replace) VALUES ($1, $2, $3)",
      [filename, searchText, replaceText]
    );

    res.json({
      message: "✅ PDF text replaced successfully",
      filename,
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    res.status(500).json({ message: "Error processing PDF", error: error.message });
  }
}

module.exports = { replaceTextInPDF };
