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
    const parsedData = await pdfParse(pdfBuffer); // Extract text
    let extractedText = parsedData.text;

    if (!extractedText.includes(searchText)) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    // ✅ Replace text in the extracted content
    const updatedText = extractedText.replace(new RegExp(searchText, "g"), replaceText);

    // ✅ Rebuild the PDF with modified text
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const { width, height } = pages[0].getSize();

    // Clear original content (Overlay with white box)
    for (const page of pages) {
      page.drawRectangle({
        x: 50,
        y: height - 100,
        width: width - 100,
        height: 200,
        color: rgb(1, 1, 1),
      });

      // Rewrite modified text
      page.drawText(updatedText, {
        x: 50,
        y: height - 50,
        size: 12,
        color: rgb(0, 0, 0),
        font: await pdfDoc.embedFont(StandardFonts.Helvetica),
      });
    }

    // ✅ Save updated PDF
    const updatedPdfBytes = await pdfDoc.save();
    const filename = `updated-${Date.now()}.pdf`;
    const outputDir = path.join(__dirname, "..", "updated_pdfs");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, updatedPdfBytes);

    // ✅ Log the operation in PostgreSQL
    await pool.query(
      "INSERT INTO pdf_logs(filename, search, replace) VALUES($1, $2, $3)",
      [filename, searchText, replaceText]
    );

    res.json({
      message: "✅ PDF text replaced successfully",
      filename,
    });
  } catch (error) {
    console.error("❌ FULL ERROR:", error);
    res.status(500).json({ message: "Error processing PDF", error: error.message });
  }
}

module.exports = { replaceTextInPDF };
