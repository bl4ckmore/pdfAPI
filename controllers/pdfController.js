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

    // Step 1: Extract Text
    const parsed = await pdfParse(pdfBuffer);
    let originalText = parsed.text;

    if (!originalText.includes(searchText)) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    // Step 2: Replace ALL occurrences
    const replacedText = originalText.replace(new RegExp(searchText, "g"), replaceText);

    // Step 3: Rebuild the PDF with replaced content
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const lineHeight = 18;
    const margin = 30;
    const { width, height } = page.getSize();
    let y = height - margin;

    const lines = replacedText.split(/\r?\n/);
    let lineCount = 0;
    let currentPage = page;

    for (const line of lines) {
      if (lineCount >= Math.floor((height - margin * 2) / lineHeight)) {
        currentPage = pdfDoc.addPage();
        y = height - margin;
        lineCount = 0;
      }

      currentPage.drawText(line, {
        x: margin,
        y: y - lineCount * lineHeight,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });

      lineCount++;
    }

    // Step 4: Save new PDF
    const updatedPdfBytes = await pdfDoc.save();
    const filename = `updated-${Date.now()}.pdf`;
    const outputDir = path.join(__dirname, "..", "updated_pdfs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    fs.writeFileSync(path.join(outputDir, filename), updatedPdfBytes);

    // Step 5: Log in PostgreSQL
    await pool.query(
      "INSERT INTO pdf_logs(filename, search, replace) VALUES ($1, $2, $3)",
      [filename, searchText, replaceText]
    );

    return res.json({
      message: "✅ PDF text replaced successfully",
      filename,
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return res.status(500).json({ message: "Error processing PDF", error: error.message });
  }
}

module.exports = { replaceTextInPDF };
