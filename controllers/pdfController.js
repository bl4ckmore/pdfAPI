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
      return res.status(400).json({ message: "Missing search or replace text" });
    }

    const pdfBuffer = req.files.pdf.data;
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    let textFound = false;

    // ✅ Loop through pages to find & replace text
    for (const page of pages) {
      const { width, height } = page.getSize();
      const textContent = await page.getTextContent();
      let pageText = textContent.items.map((item) => item.str).join(" ");

      if (pageText.includes(searchText)) {
        textFound = true;
        pageText = pageText.replace(new RegExp(searchText, "g"), replaceText);

        // ✅ Clear the existing text (Overlay a white rectangle)
        page.drawRectangle({
          x: 50,
          y: height - 100,
          width: width - 100,
          height: 50,
          color: rgb(1, 1, 1),
        });

        // ✅ Rewrite the modified text
        page.drawText(pageText, {
          x: 50,
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
