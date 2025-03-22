const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf"); // Legacy for node support
const getStream = require("stream-buffers").ReadableStreamBuffer;

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
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let replacedAtLeastOnce = false;

    for (let i = 0; i < pdf.numPages; i++) {
      const page = await pdf.getPage(i + 1);
      const pageText = await page.getTextContent();
      const rawItems = pageText.items;

      const pdfLibPage = pdfDoc.getPage(i);
      const { height } = pdfLibPage.getSize();

      for (let item of rawItems) {
        const text = item.str;
        if (text.includes(searchText)) {
          replacedAtLeastOnce = true;
          const newText = text.replace(new RegExp(searchText, "g"), replaceText);

          const x = item.transform[4];
          const y = item.transform[5];

          // Clear old text
          pdfLibPage.drawRectangle({
            x,
            y: height - y - 10,
            width: newText.length * 6,
            height: 12,
            color: rgb(1, 1, 1),
          });

          // Draw new text
          pdfLibPage.drawText(newText, {
            x,
            y: height - y - 10,
            font: helvetica,
            size: 12,
            color: rgb(0, 0, 0),
          });
        }
      }
    }

    if (!replacedAtLeastOnce) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    const updatedPdfBytes = await pdfDoc.save();
    const filename = `updated-${Date.now()}.pdf`;
    const outputDir = path.join(__dirname, "..", "updated_pdfs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, updatedPdfBytes);

    await pool.query(
      "INSERT INTO pdf_logs(filename, search, replace) VALUES ($1, $2, $3)",
      [filename, searchText, replaceText]
    );

    res.json({
      message: "✅ Replacements done, layout preserved",
      filename,
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    res.status(500).json({ message: "Error processing PDF", error: error.message });
  }
}

module.exports = { replaceTextInPDF };
