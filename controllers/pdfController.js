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
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    let textFound = false;

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textContent = await page.getTextContent();

      let extractedText = textContent.items.map((item) => item.str).join(" ");
      
      if (extractedText.includes(searchText)) {
        textFound = true;

        // Replace ALL occurrences of searchText
        const updatedText = extractedText.replace(new RegExp(searchText, "g"), replaceText);

        // ✅ Overwrite the updated text at a specific location
        page.drawText(updatedText, {
          x: 30,
          y: height - 50,
          size: 12,
          color: rgb(0, 0, 0),
          font: await pdfDoc.embedFont(StandardFonts.Helvetica),
        });
      }
    }

    if (!textFound) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    // ✅ Save the updated PDF
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
