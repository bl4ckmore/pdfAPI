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
            return res.status(400).json({ message: "Missing search or replace text" });
        }

        const inputPath = path.join(__dirname, "../uploads", req.file.filename);
        const outputPath = path.join(__dirname, "../uploads", `updated-${req.file.filename}`);

        // Load the PDF document
        const pdfBuffer = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        let textFound = false;

        // Extract text from PDF
        const extractedData = await pdfParse(pdfBuffer);
        let fullText = extractedData.text;

        if (!fullText.includes(searchText)) {
            return res.status(400).json({ message: "Text not found in PDF" });
        }

        // Modify pages where text is found
        const pages = pdfDoc.getPages();
        pages.forEach((page) => {
            let { width, height } = page.getSize();
            let x = 50;
            let y = height - 100;

            if (fullText.includes(searchText)) {
                textFound = true;

                // **Erase existing text** by covering it with a white rectangle
                page.drawRectangle({
                    x: x - 5,  // Offset for better alignment
                    y: y - 5,
                    width: searchText.length * 7,
                    height: 15,
                    color: rgb(1, 1, 1), // White to "erase"
                });

                // **Write new text at the same position**
                page.drawText(replaceText, {
                    x: x,
                    y: y,
                    size: 12,
                    font: font,
                    color: rgb(0, 0, 0),
                });
            }
        });

        if (!textFound) {
            return res.status(400).json({ message: "Text not found in PDF" });
        }

        // Save and return the updated PDF
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, pdfBytes);

        res.json({ message: "PDF text replaced successfully", filename: `updated-${req.file.filename}` });

    } catch (error) {
        console.error("Error processing PDF:", error);
        res.status(500).json({ message: "Error processing PDF" });
    }
}

module.exports = { replaceTextInPDF };
