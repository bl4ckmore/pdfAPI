const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

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
    const pages = pdfDoc.getPages();

    let textFound = false;
    for (const page of pages) {
      const { width, height } = page.getSize();
      const textToDraw = `🔍 Text: ${searchText} ⟶ ${replaceText}`;
      page.drawText(textToDraw, {
        x: 50,
        y: height - 50,
        size: 12,
        color: rgb(0, 0, 0),
        font: await pdfDoc.embedFont(StandardFonts.Helvetica),
      });
      textFound = true; // Simulating a replacement
    }
    console.log("🪵 Incoming Request:", {
      file: req.file,
      searchText: req.body.searchText,
      replaceText: req.body.replaceText,
    });

    const updatedPdfBytes = await pdfDoc.save();
    const filename = `updated-${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, "..", "updated_pdfs", filename);

    fs.writeFileSync(outputPath, updatedPdfBytes);

    // Optionally store record in PostgreSQL
    await pool.query(
      "INSERT INTO pdf_logs(filename, search, replace) VALUES($1, $2, $3)",
      [filename, searchText, replaceText]
    );

    res.json({
      message: "PDF updated and saved",
      filename,
    });
  } catch (error) {
    console.error("❌ FULL ERROR:", error);
    res.status(500).json({ message: "Error processing PDF", error: error.message });
  }


  console.log("✅ Upload Request Received:", {
    files: req.files,
    body: req.body,
  });
  

}

module.exports = { replaceTextInPDF };
