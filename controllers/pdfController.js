const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const pdfParse = require("pdf-parse");

// Function to replace text in a PDF
async function replaceTextInPDF(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { searchText, replaceText } = req.body;
    if (!searchText || !replaceText) {
      return res.status(400).json({ message: "Missing search or replace text" });
    }

    const inputPath = path.join(__dirname, "../uploads", req.file.filename);
    const outputPath = path.join(__dirname, "../uploads", `updated-${req.file.filename}`);

    // Read the PDF file
    const pdfBuffer = fs.readFileSync(inputPath);
    
    // Extract text using `pdf-parse`
    const data = await pdfParse(pdfBuffer);
    let extractedText = data.text;

    if (!extractedText.includes(searchText)) {
      return res.status(400).json({ message: "Text not found in PDF" });
    }

    // Load the existing PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    for (let page of pages) {
      let { width, height } = page.getSize();
      let contentStream = page.getTextContent();
      let textItems = contentStream.items;

      for (let textItem of textItems) {
        if (textItem.str.includes(searchText)) {
          let newText = textItem.str.replace(new RegExp(searchText, "g"), replaceText);
          
          // Draw new text at the same position
          page.drawText(newText, {
            x: textItem.transform[4],
            y: height - textItem.transform[5],
            size: 12,
            color: rgb(0, 0, 0)
          });
        }
      }
    }

    // Save updated PDF
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
