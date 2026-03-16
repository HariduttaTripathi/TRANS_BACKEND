const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const { analyzeFraud } = require("../services/fraud.service")
const { triggerWebhook } = require("../services/webhook.service")
const mongoose = require("mongoose")

const { generateReceipt } = require("../services/receipt.service")
const { generateStatement } = require("../services/statement.service")  // 👈 NEW

async function createTransaction(req, res) {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    const fromUserAccount = await accountModel.findOne({ _id: fromAccount })
    const toUserAccount = await accountModel.findOne({ _id: toAccount })

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({ message: "Invalid fromAccount or toAccount" })
    }

    const balance = await fromUserAccount.getBalance()

    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}`
        })
    }

    const { isSuspicious, flagReason } = await analyzeFraud({
        amount,
        fromAccount,
        fromAccountDoc: fromUserAccount
    })

    let transaction

    try {
        const session = await mongoose.startSession()
        session.startTransaction()

        transaction = (await transactionModel.create([{
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING",
            isSuspicious,
            flagReason
        }], { session }))[0]

        await ledgerModel.create([{
            account: fromAccount,
            amount,
            transaction: transaction._id,
            type: "DEBIT"
        }], { session })

        await ledgerModel.create([{
            account: toAccount,
            amount,
            transaction: transaction._id,
            type: "CREDIT"
        }], { session })

        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        )

        await session.commitTransaction()
        session.endSession()

    } catch (error) {
        await triggerWebhook("transaction.failed", {
            fromAccount,
            toAccount,
            amount,
            reason: error.message
        })

        return res.status(500).json({
            message: "Transaction failed",
            error: error.message
        })
    }

    await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)

    await triggerWebhook("transaction.success", {
        transactionId: transaction._id,
        fromAccount,
        toAccount,
        amount
    })

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction,
        ...(isSuspicious && { warning: `🚨 Flagged: ${flagReason}` })
    })
}

async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    const toUserAccount = await accountModel.findOne({ _id: toAccount })

    if (!toUserAccount) {
        return res.status(400).json({ message: "Invalid toAccount" })
    }

    const fromUserAccount = await accountModel.findOne({ user: req.user._id })

    if (!fromUserAccount) {
        return res.status(400).json({ message: "System user account not found" })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    })

    await ledgerModel.create([{
        account: fromUserAccount._id,
        amount,
        transaction: transaction._id,
        type: "DEBIT"
    }], { session })

    await ledgerModel.create([{
        account: toAccount,
        amount,
        transaction: transaction._id,
        type: "CREDIT"
    }], { session })

    transaction.status = "COMPLETED"
    await transaction.save({ session })

    await session.commitTransaction()
    session.endSession()

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction
    })
}

async function depositMoney(req, res) {
    const { accountId, amount } = req.body

    if (!accountId || !amount) {
        return res.status(400).json({ message: "accountId and amount are required" })
    }

    const userAccount = await accountModel.findOne({ _id: accountId })

    if (!userAccount) {
        return res.status(400).json({ message: "Invalid accountId" })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const transaction = new transactionModel({
            fromAccount: accountId,
            toAccount: accountId,
            amount,
            idempotencyKey: new mongoose.Types.ObjectId().toString(),
            status: "PENDING"
        })

        await ledgerModel.create([{
            account: accountId,
            amount,
            transaction: transaction._id,
            type: "CREDIT"
        }], { session })

        transaction.status = "COMPLETED"
        await transaction.save({ session })

        await session.commitTransaction()
        session.endSession()

        return res.status(201).json({ message: "Deposit successful", transaction })

    } catch (error) {
        await session.abortTransaction()
        session.endSession()
        return res.status(500).json({ message: "Deposit failed", error: error.message })
    }
}

async function withdrawMoney(req, res) {
    const { accountId, amount } = req.body

    if (!accountId || !amount) {
        return res.status(400).json({ message: "accountId and amount are required" })
    }

    const userAccount = await accountModel.findOne({ _id: accountId })

    if (!userAccount) {
        return res.status(400).json({ message: "Invalid accountId" })
    }

    const balance = await userAccount.getBalance()

    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}`
        })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const transaction = new transactionModel({
            fromAccount: accountId,
            toAccount: accountId,
            amount,
            idempotencyKey: new mongoose.Types.ObjectId().toString(),
            status: "PENDING"
        })

        await ledgerModel.create([{
            account: accountId,
            amount,
            transaction: transaction._id,
            type: "DEBIT"
        }], { session })

        transaction.status = "COMPLETED"
        await transaction.save({ session })

        await session.commitTransaction()
        session.endSession()

        return res.status(201).json({ message: "Withdraw successful", transaction })

    } catch (error) {
        await session.abortTransaction()
        session.endSession()
        return res.status(500).json({ message: "Withdraw failed", error: error.message })
    }
}

async function getTransactionHistory(req, res) {
    const { accountId } = req.params

    const transactions = await transactionModel.find({
        $or: [
            { fromAccount: accountId },
            { toAccount: accountId }
        ]
    }).sort({ createdAt: -1 })

    return res.status(200).json({
        message: "Transaction history fetched successfully",
        transactions
    })
}

async function downloadReceipt(req, res) {
    const { transactionId } = req.params

    const transaction = await transactionModel.findById(transactionId)

    if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" })
    }

    generateReceipt(transaction, res)
}

// ─── NEW: Download Account Statement as PDF ───────────────────────────────────
async function downloadStatement(req, res) {
    const { accountId } = req.params

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return res.status(400).json({ message: "Invalid accountId" })
    }

    const account = await accountModel.findById(accountId)

    if (!account) {
        return res.status(404).json({ message: "Account not found" })
    }

    // Optional date range: ?from=2024-01-01&to=2024-12-31
    const { from, to } = req.query
    const dateFilter = {}
    if (from) dateFilter.$gte = new Date(from)
    if (to)   dateFilter.$lte = new Date(to)

    const transactionQuery = {
        $or: [{ fromAccount: accountId }, { toAccount: accountId }],
        ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
    }

    const transactions = await transactionModel
        .find(transactionQuery)
        .sort({ createdAt: -1 })

    generateStatement(account, transactions, res)
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction,
    depositMoney,
    withdrawMoney,
    getTransactionHistory,
    downloadReceipt,
    downloadStatement    // 👈 NEW
}