// const accountModel = require("../models/account.model");
// const PDFDocument = require("pdfkit")// for generating pdf statements
// const ledgerModel = require("../models/ledger.model") // for fetching transactions related to an account




// async function createAccountController(req, res) {

//     const user = req.user;

//     const account = await accountModel.create({
//         user: user._id
//     })

//     res.status(201).json({
//         account
//     })

// }

// async function getUserAccountsController(req, res) {

//     const accounts = await accountModel.find({ user: req.user._id });

//     res.status(200).json({
//         accounts
//     })
// }

// async function getAccountBalanceController(req, res) {
//     const { accountId } = req.params;

//     const account = await accountModel.findOne({
//         _id: accountId,
//         user: req.user._id
//     })

//     if (!account) {
//         return res.status(404).json({
//             message: "Account not found"
//         })
//     }

//     const balance = await account.getBalance();

//     res.status(200).json({
//         accountId: account._id,
//         balance: balance
//     })
// }
// // foe  generating account statements in pdf formate

// async function generateAccountStatement(req, res) {

//     const { accountId } = req.params

//     const account = await accountModel.findById(accountId)

//     if (!account) {
//         return res.status(404).json({
//             message: "Account not found"
//         })
//     }

//     const ledgerEntries = await ledgerModel.find({ account: accountId })
//         .sort({ createdAt: 1 })

//     let balance = 0

//     ledgerEntries.forEach(entry => {
//         if (entry.type === "CREDIT") balance += entry.amount
//         else balance -= entry.amount
//     })

//     const doc = new PDFDocument()

//     res.setHeader(
//         "Content-Disposition",
//         `attachment; filename=statement-${accountId}.pdf`
//     )

//     res.setHeader("Content-Type", "application/pdf")

//     doc.pipe(res)

//     doc.fontSize(20).text("Bank Account Statement", { align: "center" })
//     doc.moveDown()

//     doc.fontSize(12).text(`Account ID: ${accountId}`)
//     doc.text(`Generated On: ${new Date().toDateString()}`)

//     doc.moveDown()
//     doc.text("Transactions")
//     doc.moveDown()

//     // ledgerEntries.forEach(entry => {
//     //     doc.text(
//     //         `${entry.createdAt.toDateString()} | ${entry.type} | ₹${entry.amount}`
//     //     )
//     // })

// ledgerEntries.forEach(entry => {
//     // Make sure createdAt exists; fallback to current date if missing
//     const dateObj = entry.createdAt ? new Date(entry.createdAt) : new Date();
//     const dateStr = dateObj.toDateString();

//     doc.text(`${dateStr} | ${entry.type} | ₹${entry.amount}`);
// });




//     doc.moveDown()
//     doc.text(`Closing Balance: ₹${balance}`)

//     doc.end()
// }




// module.exports = {
//     createAccountController,
//     getUserAccountsController,
//     getAccountBalanceController,
//     generateAccountStatement
// }



const accountModel = require("../models/account.model");
const PDFDocument = require("pdfkit");
const ledgerModel = require("../models/ledger.model");

async function createAccountController(req, res) {
    try {
        const user = req.user;

        const account = await accountModel.create({
            user: user._id
        });

        res.status(201).json({ account });
    } catch (err) {
        console.error("createAccountController error:", err);
        res.status(500).json({ message: "Failed to create account" });
    }
}

async function getUserAccountsController(req, res) {
    try {
        const accounts = await accountModel.find({ user: req.user._id });

        res.status(200).json({ accounts });
    } catch (err) {
        console.error("getUserAccountsController error:", err);
        res.status(500).json({ message: "Failed to fetch accounts" });
    }
}

async function getAccountBalanceController(req, res) {
    try {
        const { accountId } = req.params;

        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        });

        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        const balance = await account.getBalance();

        res.status(200).json({
            accountId: account._id,
            balance
        });
    } catch (err) {
        console.error("getAccountBalanceController error:", err);
        res.status(500).json({ message: "Failed to fetch balance" });
    }
}

// For generating account statements in PDF format
async function generateAccountStatement(req, res) {
    try {
        const { accountId } = req.params;

        // FIX: verify the account belongs to the requesting user
        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        });

        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        const ledgerEntries = await ledgerModel
            .find({ account: accountId })
            .sort({ createdAt: 1 });

        let balance = 0;
        ledgerEntries.forEach(entry => {
            if (entry.type === "CREDIT") balance += entry.amount;
            else balance -= entry.amount;
        });

        const doc = new PDFDocument();

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=statement-${accountId}.pdf`
        );
        res.setHeader("Content-Type", "application/pdf");

        doc.pipe(res);

        doc.fontSize(20).text("Bank Account Statement", { align: "center" });
        doc.moveDown();

        doc.fontSize(12).text(`Account ID: ${accountId}`);
        doc.text(`Generated On: ${new Date().toDateString()}`);
        doc.moveDown();

        doc.text("Transactions");
        doc.moveDown();

        ledgerEntries.forEach(entry => {
            const dateStr = entry.createdAt
                ? new Date(entry.createdAt).toDateString()
                : new Date().toDateString();

            doc.text(`${dateStr} | ${entry.type} | ₹${entry.amount}`);
        });

        doc.moveDown();
        doc.text(`Closing Balance: ₹${balance}`);

        doc.end();
    } catch (err) {
        console.error("generateAccountStatement error:", err);
        // Only send JSON error if headers haven't been sent yet
        if (!res.headersSent) {
            res.status(500).json({ message: "Failed to generate statement" });
        }
    }
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController,
    generateAccountStatement
};