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

    // Step 1: Extract text
    const parsed = await pdfParse(pdfBuffer);
    let textContent = parsed.text;

    if (!textContent.includes(searchText)) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    // Step 2: Replace ALL occurrences
    const modifiedText = textContent.replace(new RegExp(searchText, "g"), replaceText);

    // Step 3: Split lines for pagination
    const lines = modifiedText
      .split(/\r?\n/)
      .map((line) => line.replace(/[^\x00-\x7F]/g, "")); // remove unsupported chars

    // Step 4: Generate PDF
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

    for (const line of lines) {
      if (lineCount >= maxLinesPerPage) {
        page = pdfDoc.addPage();
        y = height - margin;
        lineCount = 0;
      }

      page.drawText(line, {
        x: margin,
        y: y - lineHeight * lineCount,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });

      lineCount++;
    }

    // Step 5: Save the file
    const updatedPdfBytes = await pdfDoc.save();
    const filename = `updated-${Date.now()}.pdf`;
    const outputDir = path.join(__dirname, "..", "updated_pdfs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, updatedPdfBytes);

    // Step 6: Log in DB
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
    return res.status(500).json({
      message: "Error processing PDF",
      error: error.message,
    });
  }
}

module.exports = { replaceTextInPDF };
