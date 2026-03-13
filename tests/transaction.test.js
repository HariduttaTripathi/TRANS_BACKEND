const request = require("supertest")
const mongoose = require("mongoose")
const userModel = require("../src/models/user.model")
const accountModel = require("../src/models/account.model")
const transactionModel = require("../src/models/transaction.model")
const tokenBlackListModel = require("../src/models/blackList.model")

require("dotenv").config()

// Mock email and webhook services
jest.mock("../src/services/email.service", () => ({
    sendRegistrationEmail: jest.fn().mockResolvedValue(null),
    sendTransactionEmail: jest.fn().mockResolvedValue(null)
}))

jest.mock("../src/services/webhook.service", () => ({
    triggerWebhook: jest.fn().mockResolvedValue(null)
}))

jest.setTimeout(30000)

let app
let token
let fromAccountId
let toAccountId

beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect()
    }

    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/transactiondb_test")

    app = require("../src/app")
})

// Setup before each test
beforeEach(async () => {

    // Register and login
    await request(app)
        .post("/api/auth/register")
        .send({ name: "Test User", email: "test@example.com", password: "password123" })

    const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "password123" })

    token = loginRes.body.token

    const user = await userModel.findOne({ email: "test@example.com" })

    // Create 2 accounts
    const fromAccount = await accountModel.create({ user: user._id, currency: "INR" })
    const toAccount = await accountModel.create({ user: user._id, currency: "INR" })

    fromAccountId = fromAccount._id.toString()
    toAccountId = toAccount._id.toString()

    // Deposit 5,00,000 into fromAccount using native driver to bypass immutability hooks
    await mongoose.connection.collection("ledgers").insertMany([{
        account: fromAccount._id,
        amount: 500000,
        transaction: new mongoose.Types.ObjectId(),
        type: "CREDIT"
    }])
})

// Cleanup after each test using native driver to bypass immutability hooks
afterEach(async () => {
    await mongoose.connection.collection("users").deleteMany({})
    await mongoose.connection.collection("accounts").deleteMany({})
    await mongoose.connection.collection("transactions").deleteMany({})
    await mongoose.connection.collection("ledgers").deleteMany({})
    await mongoose.connection.collection("blacklists").deleteMany({})
})

afterAll(async () => {
    await mongoose.disconnect()
})

// -------------------------------------------------------
// CREATE TRANSACTION
// -------------------------------------------------------
describe("POST /api/transactions/", () => {

    it("should create a transaction successfully", async () => {
        const res = await request(app)
            .post("/api/transactions/")
            .set("Authorization", `Bearer ${token}`)
            .send({
                fromAccount: fromAccountId,
                toAccount: toAccountId,
                amount: 1000,
                idempotencyKey: new mongoose.Types.ObjectId().toString()
            })

        expect(res.statusCode).toBe(201)
        expect(res.body.message).toBe("Transaction completed successfully")
        expect(res.body.transaction.amount).toBe(1000)
    })

    it("should fail if insufficient balance", async () => {
        const res = await request(app)
            .post("/api/transactions/")
            .set("Authorization", `Bearer ${token}`)
            .send({
                fromAccount: fromAccountId,
                toAccount: toAccountId,
                amount: 99999999,
                idempotencyKey: new mongoose.Types.ObjectId().toString()
            })

        expect(res.statusCode).toBe(400)
        expect(res.body.message).toContain("Insufficient balance")
    })

    it("should fail if fromAccount is invalid", async () => {
        const res = await request(app)
            .post("/api/transactions/")
            .set("Authorization", `Bearer ${token}`)
            .send({
                fromAccount: new mongoose.Types.ObjectId().toString(),
                toAccount: toAccountId,
                amount: 1000,
                idempotencyKey: new mongoose.Types.ObjectId().toString()
            })

        expect(res.statusCode).toBe(400)
        expect(res.body.message).toBe("Invalid fromAccount or toAccount")
    })

    it("should fail if required fields are missing", async () => {
        const res = await request(app)
            .post("/api/transactions/")
            .set("Authorization", `Bearer ${token}`)
            .send({
                fromAccount: fromAccountId,
                toAccount: toAccountId
                // amount and idempotencyKey missing
            })

        expect(res.statusCode).toBe(400)
        expect(res.body.message).toBe("FromAccount, toAccount, amount and idempotencyKey are required")
    })

    it("should flag transaction as suspicious if amount exceeds 1,00,000", async () => {
        const res = await request(app)
            .post("/api/transactions/")
            .set("Authorization", `Bearer ${token}`)
            .send({
                fromAccount: fromAccountId,
                toAccount: toAccountId,
                amount: 150000,
                idempotencyKey: new mongoose.Types.ObjectId().toString()
            })

        expect(res.statusCode).toBe(201)
        expect(res.body.transaction.isSuspicious).toBe(true)
        expect(res.body.warning).toContain("Flagged")
    })

    it("should fail if no token is provided", async () => {
        const res = await request(app)
            .post("/api/transactions/")
            .send({
                fromAccount: fromAccountId,
                toAccount: toAccountId,
                amount: 1000,
                idempotencyKey: new mongoose.Types.ObjectId().toString()
            })

        expect(res.statusCode).toBe(401)
    })

})

// -------------------------------------------------------
// DEPOSIT
// -------------------------------------------------------
describe("POST /api/transactions/deposit", () => {

    it("should deposit money successfully", async () => {
        const res = await request(app)
            .post("/api/transactions/deposit")
            .set("Authorization", `Bearer ${token}`)
            .send({
                accountId: fromAccountId,
                amount: 5000
            })

        expect(res.statusCode).toBe(201)
        expect(res.body.message).toBe("Deposit successful")
    })

    it("should fail if accountId is missing", async () => {
        const res = await request(app)
            .post("/api/transactions/deposit")
            .set("Authorization", `Bearer ${token}`)
            .send({ amount: 5000 })

        expect(res.statusCode).toBe(400)
        expect(res.body.message).toBe("accountId and amount are required")
    })

    it("should fail if no token is provided", async () => {
        const res = await request(app)
            .post("/api/transactions/deposit")
            .send({
                accountId: fromAccountId,
                amount: 5000
            })

        expect(res.statusCode).toBe(401)
    })

})

// -------------------------------------------------------
// WITHDRAW
// -------------------------------------------------------
describe("POST /api/transactions/withdraw", () => {

    it("should withdraw money successfully", async () => {
        const res = await request(app)
            .post("/api/transactions/withdraw")
            .set("Authorization", `Bearer ${token}`)
            .send({
                accountId: fromAccountId,
                amount: 1000
            })

        expect(res.statusCode).toBe(201)
        expect(res.body.message).toBe("Withdraw successful")
    })

    it("should fail if insufficient balance", async () => {
        const res = await request(app)
            .post("/api/transactions/withdraw")
            .set("Authorization", `Bearer ${token}`)
            .send({
                accountId: fromAccountId,
                amount: 99999999
            })

        expect(res.statusCode).toBe(400)
        expect(res.body.message).toContain("Insufficient balance")
    })

    it("should fail if accountId is missing", async () => {
        const res = await request(app)
            .post("/api/transactions/withdraw")
            .set("Authorization", `Bearer ${token}`)
            .send({ amount: 1000 })

        expect(res.statusCode).toBe(400)
        expect(res.body.message).toBe("accountId and amount are required")
    })

})

// -------------------------------------------------------
// TRANSACTION HISTORY
// -------------------------------------------------------
describe("GET /api/transactions/history/:accountId", () => {

    it("should get transaction history successfully", async () => {
        // Create a transaction first
        await request(app)
            .post("/api/transactions/")
            .set("Authorization", `Bearer ${token}`)
            .send({
                fromAccount: fromAccountId,
                toAccount: toAccountId,
                amount: 1000,
                idempotencyKey: new mongoose.Types.ObjectId().toString()
            })

        const res = await request(app)
            .get(`/api/transactions/history/${fromAccountId}`)
            .set("Authorization", `Bearer ${token}`)

        expect(res.statusCode).toBe(200)
        expect(res.body.message).toBe("Transaction history fetched successfully")
        expect(res.body.transactions.length).toBeGreaterThan(0)
    })

    it("should return empty array if no transactions", async () => {
        const res = await request(app)
            .get(`/api/transactions/history/${fromAccountId}`)
            .set("Authorization", `Bearer ${token}`)

        expect(res.statusCode).toBe(200)
        expect(res.body.transactions.length).toBe(0)
    })

    it("should fail if no token is provided", async () => {
        const res = await request(app)
            .get(`/api/transactions/history/${fromAccountId}`)

        expect(res.statusCode).toBe(401)
    })

})