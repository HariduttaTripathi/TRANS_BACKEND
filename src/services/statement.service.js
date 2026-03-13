const PDFDocument = require("pdfkit")

function generateStatement(account, transactions, res) {
    const doc = new PDFDocument({ margin: 50 })

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=statement-${account._id}.pdf`
    )

    doc.pipe(res)

    // ── Header ───────────────────────────────────────────────────────────────
    doc.fontSize(22).font("Helvetica-Bold").text("Account Statement", { align: "center" })
    doc.moveDown(0.5)
    doc.fontSize(10).font("Helvetica").fillColor("#555555")
       .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" })
    doc.moveDown(1)
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#cccccc").lineWidth(1).stroke()
    doc.moveDown(1)

    // ── Account Info ──────────────────────────────────────────────────────────
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000").text("Account Details", { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(10).font("Helvetica").fillColor("#333333")
       .text(`Account ID   : ${account._id}`)
       .text(`Account No   : ${account.accountNumber || "N/A"}`)
       .text(`Account Type : ${account.accountType || "Savings"}`)
       .text(`Currency     : ${account.currency || "USD"}`)
    doc.moveDown(1)
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#cccccc").lineWidth(1).stroke()
    doc.moveDown(1)

    // ── Transactions ──────────────────────────────────────────────────────────
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000").text("Transaction History", { underline: true })
    doc.moveDown(0.5)

    if (transactions.length === 0) {
        doc.fontSize(10).font("Helvetica").fillColor("#888888")
           .text("No transactions found for this account.")
    } else {
        const col = { date: 50, type: 165, amount: 270, status: 370, id: 440 }
        const tableTop = doc.y

        doc.rect(50, tableTop, 500, 20).fillColor("#2c3e50").fill()
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff")
           .text("Date",           col.date,   tableTop + 5)
           .text("Type",           col.type,   tableTop + 5)
           .text("Amount",         col.amount, tableTop + 5)
           .text("Status",         col.status, tableTop + 5)
           .text("Transaction ID", col.id,     tableTop + 5)

        let rowY = tableTop + 24
        let net = 0

        transactions.forEach((txn, i) => {
            if (i % 2 === 0) {
                doc.rect(50, rowY - 3, 500, 18).fillColor("#f5f5f5").fill()
            }

            const isCredit    = txn.toAccount?.toString() === account._id?.toString()
            const typeLabel   = isCredit ? "CREDIT" : "DEBIT"
            const amountStr   = isCredit ? `+${txn.amount.toFixed(2)}` : `-${txn.amount.toFixed(2)}`
            const amountColor = isCredit ? "#27ae60" : "#e74c3c"
            const statusColor = txn.status === "COMPLETED" ? "#27ae60" : "#e67e22"

            if (isCredit) net += txn.amount
            else net -= txn.amount

            doc.fontSize(8).font("Helvetica")
               .fillColor("#333333")
               .text(new Date(txn.createdAt).toLocaleDateString(), col.date,   rowY, { width: 110 })
               .text(typeLabel,                                     col.type,   rowY, { width: 100 })
               .fillColor(amountColor)
               .text(amountStr,                                     col.amount, rowY, { width: 90 })
               .fillColor(statusColor)
               .text(txn.status,                                    col.status, rowY, { width: 65 })
               .fillColor("#555555")
               .text(txn._id.toString(),                            col.id,     rowY, { width: 110 })

            rowY += 18

            if (rowY > 720) {
                doc.addPage()
                rowY = 50
            }
        })

        // ── Summary ───────────────────────────────────────────────────────────
        doc.moveDown(2)
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#cccccc").lineWidth(1).stroke()
        doc.moveDown(0.5)
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000")
           .text(`Total Transactions  : ${transactions.length}`)
           .text(`Net Balance Change  : ${net >= 0 ? "+" : ""}${net.toFixed(2)}`)
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.moveDown(2)
    doc.fontSize(8).font("Helvetica").fillColor("#aaaaaa")
       .text("This is a system-generated statement. No signature required.", { align: "center" })

    doc.end()
}

module.exports = { generateStatement }