const express = require("express")
const cookieParser = require("cookie-parser")

const app = express()

// -----------------------------
// Middleware
// -----------------------------
app.use(express.json())
app.use(cookieParser())

// -----------------------------
// Routes
// -----------------------------
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRoutes = require("./routes/transaction.routes")
const webhookRoutes = require("./routes/webhook.routes")
const adminRoutes = require("./routes/admin.routes")

// -----------------------------
// Use Routes
// -----------------------------
app.get("/", (req, res) => {
    res.send("Ledger Service is up and running")
})

app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRoutes)
app.use("/webhook", webhookRoutes)
app.use("/admin", adminRoutes)

module.exports = app

