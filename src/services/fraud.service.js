const transactionModel = require("../models/transaction.model")

const LIMIT = 100000             // Rule 1: 1,00,000
const RAPID_LIMIT = 5            // Rule 2: 5 transactions
const RAPID_WINDOW = 60 * 1000   // Rule 2: within 1 minute
const NEW_ACCOUNT_AGE = 24 * 60 * 60 * 1000  // Rule 4: 24 hours

async function analyzeFraud({ amount, fromAccount, fromAccountDoc }) {
    const flags = []

    // Rule 1 — Large amount
    if (amount > LIMIT) {
        flags.push("Amount exceeds 1,00,000")
    }

    // Rule 2 — Rapid transactions
    const oneMinuteAgo = new Date(Date.now() - RAPID_WINDOW)
    const recentCount = await transactionModel.countDocuments({
        fromAccount,
        createdAt: { $gte: oneMinuteAgo }
    })
    if (recentCount >= RAPID_LIMIT) {
        flags.push(`Rapid transactions: ${recentCount} in last 1 minute`)
    }

    // Rule 3 — Unusual hours (10PM - 5AM)
    const hour = new Date().getHours()
    if (hour >= 22 || hour < 5) {
        flags.push(`Unusual transaction hour: ${hour}:00`)
    }

    // Rule 4 — New account (less than 24 hours old)
    const accountAge = Date.now() - new Date(fromAccountDoc.createdAt).getTime()
    if (accountAge < NEW_ACCOUNT_AGE) {
        flags.push("Transaction from account created less than 24 hours ago")
    }

    return {
        isSuspicious: flags.length > 0,
        flagReason: flags.length > 0 ? flags.join(" | ") : null
    }
}

module.exports = { analyzeFraud }