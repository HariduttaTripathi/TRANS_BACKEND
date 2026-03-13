require("dotenv").config()

const app = require("./src/app")
const connectToDB = require("./src/config/db")
const rateLimit = require("express-rate-limit")

// -----------------------------
// 1️⃣ Connect to Database
// -----------------------------
connectToDB()

// -----------------------------
// 2️⃣ Global Rate Limiter
// -----------------------------
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    handler: (req, res) => {
        console.log(`[RATE LIMIT] IP: ${req.ip} exceeded global limit on route: ${req.originalUrl} at ${new Date().toISOString()}`)
        res.status(429).json({ message: "Too many requests from this IP, try again later." })
    }
})
app.use(globalLimiter)

// -----------------------------
// 3️⃣ Route-specific Limiters
// -----------------------------
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    handler: (req, res) => {
        console.log(`[RATE LIMIT] IP: ${req.ip} exceeded login limit at ${new Date().toISOString()}`)
        res.status(429).json({ message: "Too many login attempts. Try again later." })
    }
})

const transactionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    handler: (req, res) => {
        console.log(`[RATE LIMIT] IP: ${req.ip} exceeded transaction limit at ${new Date().toISOString()}`)
        res.status(429).json({ message: "Too many transaction requests. Try again later." })
    }
})

app.use("/api/auth/login", loginLimiter)
app.use("/api/transactions", transactionLimiter)

// -----------------------------
// 4️⃣ Start Server
// -----------------------------
app.listen(3000, () => {
    console.log("Server is running on port 3000")
})