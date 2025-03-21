const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { PDFDocument, rgb } = require("pdf-lib");

async function replaceTextInPDF(req, res) {
  try {
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { searchText, replaceText } = req.body;
    if (!searchText || !replaceText) {
      return res
        .status(400)
        .json({ message: "Missing search or replace text" });
    }

    const pdfBuffer = req.files.pdf.data;
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const font = await pdfDoc.embedFont("Helvetica");
    const pages = pdfDoc.getPages();

    let textFound = false;

    // Loop through all pages and replace text
    pages.forEach((page) => {
      const { width, height } = page.getSize();
      const text = page.getTextContent();

      text.items.forEach((item) => {
        if (item.str.includes(searchText)) {
          textFound = true;
          const x = item.transform[4]; // X Position
          const y = item.transform[5]; // Y Position

          page.drawText(replaceText, {
            x,
            y,
            size: 12,
            color: rgb(0, 0, 0),
            font,
          });
        }
      });
    });

    if (!textFound) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    const updatedPdfBytes = await pdfDoc.save();
    const filename = `updated-${Date.now()}.pdf`;
    const outputDir = path.join(__dirname, "..", "updated_pdfs");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, updatedPdfBytes);

    // Store record in PostgreSQL
    await pool.query(
      "INSERT INTO pdf_logs(filename, search, replace) VALUES($1, $2, $3)",
      [filename, searchText, replaceText]
    );

    res.json({ message: "PDF updated and saved", filename });
  } catch (error) {
    console.error("❌ FULL ERROR:", error);
    res.status(500).json({ message: "Error processing PDF", error: error.message });
  }
}

module.exports = { replaceTextInPDF };
