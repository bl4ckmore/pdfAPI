const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const pdfParse = require("pdf-parse"); // Used to extract text

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
    
    // Extract text to verify if it exists
    const data = await pdfParse(pdfBuffer);
    console.log("📄 Extracted PDF Text:", data.text);

    if (!data.text.includes(searchText)) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    let textFound = false;
    for (const page of pages) {
      const { width, height } = page.getSize();

      // Draw a white rectangle over the original text (simulate text erasure)
      page.drawRectangle({
        x: 50,
        y: height - 50,
        width: 300,
        height: 20,
        color: rgb(1, 1, 1),
      });

      // Draw the new text over the white area
      page.drawText(replaceText, {
        x: 50,
        y: height - 50,
        size: 12,
        color: rgb(0, 0, 0),
        font: await pdfDoc.embedFont(StandardFonts.Helvetica),
      });
      textFound = true;
    }

    if (!textFound) {
      return res.status(400).json({ message: "Could not replace text" });
    }

    const updatedPdfBytes = await pdfDoc.save();
    const filename = `updated-${Date.now()}.pdf`;

    // Ensure the directory exists
    const outputDir = path.join(__dirname, "..", "updated_pdfs");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, updatedPdfBytes);

    // Store the record in PostgreSQL
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
