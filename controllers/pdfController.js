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

        // Read PDF file
        const pdfBuffer = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        let found = false;

        for (const page of pages) {
            let { width, height } = page.getSize();
            let text = await pdfParse(pdfBuffer);
            
            if (text.text.includes(searchText)) {
                found = true;
                const newText = text.text.replace(new RegExp(searchText, "g"), replaceText);

                page.drawText(newText, {
                    x: 50,
                    y: height - 100,
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

        res.json({ message: "PDF text replaced successfully", filename: `updated-${req.file.filename}` });
    } catch (error) {
        console.error("Error processing PDF:", error);
        res.status(500).json({ message: "Error processing PDF" });
    }
}

module.exports = { replaceTextInPDF };
