const accountModel = require("../models/account.model");
const transactionModel = require("../models/transaction.model");

// -----------------------------
// 1️⃣ Freeze Account
// -----------------------------
async function freezeAccount(req, res) {
    try {
        const { accountId } = req.body;

        if (!accountId) return res.status(400).json({ message: "Account ID is required" });

        const account = await accountModel.findById(accountId);
        if (!account) return res.status(404).json({ message: "Account not found" });

        if (account.isFrozen) return res.status(400).json({ message: "Account is already frozen" });

        account.isFrozen = true;
        await account.save();

        res.json({ message: `Account ${accountId} has been frozen.` });
    } catch (error) {
        console.error("Error freezing account:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

// -----------------------------
// 2️⃣ Reverse Transaction
// -----------------------------
async function reverseTransaction(req, res) {
    try {
        const { transactionId } = req.body;

        if (!transactionId) return res.status(400).json({ message: "Transaction ID is required" });

        const transaction = await transactionModel.findById(transactionId);
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });

        if (transaction.reversed) return res.status(400).json({ message: "Transaction already reversed" });

        // Reverse logic: create a new opposite transaction
        const reversedTransaction = new transactionModel({
            fromAccount: transaction.toAccount,
            toAccount: transaction.fromAccount,
            amount: transaction.amount,
            type: transaction.type === "CREDIT" ? "DEBIT" : "CREDIT",
            reversed: true
        });
        await reversedTransaction.save();

        transaction.reversed = true;
        await transaction.save();

        res.json({ message: `Transaction ${transactionId} has been reversed.` });
    } catch (error) {
        console.error("Error reversing transaction:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

// -----------------------------
// 3️⃣ View All Accounts
// -----------------------------
async function viewAllAccounts(req, res) {
    try {
        const accounts = await accountModel.find().populate("userId", "name email");
        res.json(accounts);
    } catch (error) {
        console.error("Error fetching accounts:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

// -----------------------------
// Export functions
// -----------------------------
module.exports = {
    freezeAccount,
    reverseTransaction,
    viewAllAccounts
};