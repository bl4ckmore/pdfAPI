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

    // 1️⃣ Extract text
    const parsed = await pdfParse(pdfBuffer);
    const originalText = parsed.text;

    if (!originalText.includes(searchText)) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    // 2️⃣ Replace all matches
    const cleanedText = originalText.replace(new RegExp(searchText, "g"), replaceText);

    // 3️⃣ Prepare new PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const margin = 40;
    const lineHeight = 16;
    const maxLinesPerPage = Math.floor((height - margin * 2) / lineHeight);

    const lines = cleanedText.split(/\r?\n/);
    let lineCounter = 0;
    let currentPage = page;
    let y = height - margin;

    for (const line of lines) {
      if (lineCounter >= maxLinesPerPage) {
        currentPage = pdfDoc.addPage();
        y = height - margin;
        lineCounter = 0;
      }

      currentPage.drawText(line, {
        x: margin,
        y: y - lineHeight * lineCounter,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });

      lineCounter++;
    }

    // 4️⃣ Save new PDF
    const updatedPdfBytes = await pdfDoc.save();
    const filename = `updated-${Date.now()}.pdf`;
    const outputDir = path.join(__dirname, "..", "updated_pdfs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, updatedPdfBytes);

    // 5️⃣ Save log
    await pool.query(
      "INSERT INTO pdf_logs(filename, search, replace) VALUES ($1, $2, $3)",
      [filename, searchText, replaceText]
    );

    res.json({
      message: "✅ All matches replaced successfully",
      filename,
    });
  } catch (error) {
    console.error("❌ FINAL ERROR:", error);
    res.status(500).json({
      message: "Error processing PDF",
      error: error.message,
    });
  }
}

module.exports = { replaceTextInPDF };
