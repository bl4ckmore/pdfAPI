const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const pdfParse = require("pdf-parse");

async function replaceTextInPDF(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { searchText, replaceText } = req.body;
    if (!searchText || !replaceText) {
      return res
        .status(400)
        .json({ message: "Missing search or replace text" });
    }

    const inputPath = path.join(__dirname, "../uploads", req.file.filename);
    const outputPath = path.join(
      __dirname,
      "../uploads",
      `updated-${req.file.filename}`
    );

    // Read PDF file
    const pdfBuffer = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let found = false;

    for (const page of pages) {
      let { width, height } = page.getSize();
      let textData = await pdfParse(pdfBuffer);

      if (textData.text.includes(searchText)) {
        found = true;

        // Remove the original text by "painting" over it (hacky fix)
        page.drawRectangle({
          x: 50,
          y: height - 150,
          width: width - 100,
          height: 20,
          color: rgb(1, 1, 1), // White background to "erase" text
        });

        // Draw new text in the same place
        page.drawText(replaceText, {
          x: 50,
          y: height - 150,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
      }
    }

    if (!found) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    // Save the modified PDF
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);

    res.json({
      message: "PDF text replaced successfully",
      filename: `updated-${req.file.filename}`,
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).json({ message: "Error processing PDF" });
  }
}

module.exports = { replaceTextInPDF };
