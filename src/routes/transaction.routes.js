const { Router } = require("express")
const authMiddleware = require("../middleware/auth.middleware")
const transactionController = require("../controllers/transaction.controller")

const transactionRoutes = Router()

/** POST /api/transactions/deposit */
transactionRoutes.post(
    "/deposit",
    authMiddleware.authMiddleware,
    transactionController.depositMoney
)

/** POST /api/transactions/withdraw */
transactionRoutes.post(
    "/withdraw",
    authMiddleware.authMiddleware,
    transactionController.withdrawMoney
)

/** POST /api/transactions/ */
transactionRoutes.post(
    "/",
    authMiddleware.authMiddleware,
    transactionController.createTransaction
)

/** POST /api/transactions/system/initial-funds */
transactionRoutes.post(
    "/system/initial-funds",
    authMiddleware.authSystemUserMiddleware,
    transactionController.createInitialFundsTransaction
)

/** GET /api/transactions/history/:accountId */
transactionRoutes.get(
    "/history/:accountId",
    authMiddleware.authMiddleware,
    transactionController.getTransactionHistory
)

/**
 * GET /api/transactions/statement/:accountId  👈 NEW
 * Optional: ?from=2024-01-01&to=2024-12-31
 */
transactionRoutes.get(
    "/statement/:accountId",
    authMiddleware.authMiddleware,
    transactionController.downloadStatement
)

/**
 * GET /api/transactions/:transactionId/receipt
 * ⚠️ Keep LAST — prevents "statement" being matched as a transactionId
 */
transactionRoutes.get(
    "/:transactionId/receipt",
    authMiddleware.authMiddleware,
    transactionController.downloadReceipt
)

module.exports = transactionRoutes