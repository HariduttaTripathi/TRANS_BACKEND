const PDFDocument = require("pdfkit")

function generateReceipt(transaction, res) {
    const doc = new PDFDocument({ margin: 50 })

    // Set response headers so browser downloads it as a PDF
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=receipt-${transaction._id}.pdf`
    )

    // Pipe PDF into response
    doc.pipe(res)

    // ─── Header ───
    doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("TRANSACTION RECEIPT", { align: "center" })

    doc.moveDown()
    doc
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
    doc.moveDown()

    // ─── Transaction Details ───
    doc.fontSize(12).font("Helvetica")

    doc
        .font("Helvetica-Bold").text("Transaction ID: ", { continued: true })
        .font("Helvetica").text(transaction._id.toString())

    doc
        .font("Helvetica-Bold").text("Date: ", { continued: true })
        .font("Helvetica").text(new Date(transaction.createdAt).toDateString())

    doc
        .font("Helvetica-Bold").text("Status: ", { continued: true })
        .font("Helvetica").text(transaction.status)

    doc.moveDown()
    doc
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
    doc.moveDown()

    // ─── Amount Details ───
    doc
        .font("Helvetica-Bold").text("From Account: ", { continued: true })
        .font("Helvetica").text(transaction.fromAccount.toString())

    doc
        .font("Helvetica-Bold").text("To Account: ", { continued: true })
        .font("Helvetica").text(transaction.toAccount.toString())

    doc
        .font("Helvetica-Bold").text("Amount: ", { continued: true })
        .font("Helvetica").text(`INR ${transaction.amount.toFixed(2)}`)

    // ─── Fraud Flag (if suspicious) ───
    if (transaction.isSuspicious) {
        doc.moveDown()
        doc
            .fillColor("red")
            .font("Helvetica-Bold")
            .text(`⚠ Flagged: ${transaction.flagReason}`)
            .fillColor("black")
    }

    doc.moveDown()
    doc
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
    doc.moveDown()

    // ─── Footer ───
    doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("grey")
        .text("Thank you for using our service!", { align: "center" })

    doc.end()
}

module.exports = { generateReceipt }