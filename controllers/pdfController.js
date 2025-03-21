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
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let textFound = false;

    for (const page of pages) {
      const { width, height } = page.getSize();
      const pageText = await page.getTextContent();
      const textItems = pageText.items.map((item) => item.str);

      if (textItems.includes(searchText)) {
        textFound = true;
        const textIndex = textItems.indexOf(searchText);
        const textX = 50; // Approximate X coordinate (hardcoded for now)
        const textY = height - (textIndex + 50); // Approximate Y coordinate

        // 🧹 Erase old text by drawing a white rectangle over it
        page.drawRectangle({
          x: textX - 5,
          y: textY - 5,
          width: font.widthOfTextAtSize(searchText, 12) + 10,
          height: 14,
          color: rgb(1, 1, 1), // White color to erase old text
        });

        // ✍️ Draw the new text at the same location
        page.drawText(replaceText, {
          x: textX,
          y: textY,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }

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

    await pool.query(
      "INSERT INTO pdf_logs(filename, search, replace) VALUES($1, $2, $3)",
      [filename, searchText, replaceText]
    );

    res.json({
      message: "PDF updated successfully",
      filename,
    });
  } catch (error) {
    console.error("❌ FULL ERROR:", error);
    res.status(500).json({ message: "Error processing PDF", error: error.message });
  }
}

module.exports = { replaceTextInPDF };
