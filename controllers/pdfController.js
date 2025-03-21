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

        // Load the PDF
        const pdfBuffer = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        let textFound = false;

        for (const page of pages) {
            let { width, height } = page.getSize();
            let extractedText = await pdfParse(pdfBuffer);
            let fullText = extractedText.text;

            if (fullText.includes(searchText)) {
                textFound = true;

                // Get text positions (we need a more advanced method for accuracy)
                let textX = 50;
                let textY = height - 150; // Adjust dynamically later

                // **Erase** the original text by drawing a white rectangle over it
                page.drawRectangle({
                    x: textX,
                    y: textY,
                    width: replaceText.length * 7, // Width depends on text length
                    height: 15,
                    color: rgb(1, 1, 1), // White background to "erase" text
                });

                // **Replace** text with new content in the same place
                page.drawText(replaceText, {
                    x: textX,
                    y: textY,
                    size: 12,
                    font: font,
                    color: rgb(0, 0, 0),
                });
            }
        }

        if (!textFound) {
            return res.status(400).json({ message: "Text not found in PDF" });
        }

        // Save the modified PDF
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, pdfBytes);

        res.json({ message: "PDF text replaced successfully", filename: `updated-${req.file.filename}` });
    } catch (error) {
        console.error("Error processing PDF:", error);
        res.status(500).json({ message: "Error processing PDF" });
    }
}

module.exports = { replaceTextInPDF };
