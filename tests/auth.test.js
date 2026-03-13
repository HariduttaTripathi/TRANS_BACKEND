const request = require("supertest")
const mongoose = require("mongoose")
const userModel = require("../src/models/user.model")
const tokenBlackListModel = require("../src/models/blackList.model")

// Mock email service so no real emails are sent during tests
jest.mock("../src/services/email.service", () => ({
    sendRegistrationEmail: jest.fn().mockResolvedValue(null),
    sendTransactionEmail: jest.fn().mockResolvedValue(null)
}))

// Load env variables
require("dotenv").config()

jest.setTimeout(30000)

let app

// Connect ONCE before all tests
beforeAll(async () => {
    // Disconnect first if already connected
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect()
    }

    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/transactiondb_test")

    // Load app AFTER mongoose is connected
    app = require("../src/app")
})

// Clean up after each test
afterEach(async () => {
    await userModel.deleteMany({})
    await tokenBlackListModel.deleteMany({})
})

// Disconnect after all tests
afterAll(async () => {
    await mongoose.disconnect()
})

// -------------------------------------------------------
// REGISTER
// -------------------------------------------------------
describe("POST /api/auth/register", () => {

    it("should register a new user successfully", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123"
            })

        expect(res.statusCode).toBe(201)
        expect(res.body).toHaveProperty("token")
        expect(res.body.user.email).toBe("test@example.com")
    })

    it("should fail if user already exists", async () => {
        await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123"
            })

        const res = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123"
            })

        expect(res.statusCode).toBe(422)
        expect(res.body.message).toBe("User already exists with email.")
    })

})

// -------------------------------------------------------
// LOGIN
// -------------------------------------------------------
describe("POST /api/auth/login", () => {

    it("should login successfully with correct credentials", async () => {
        await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123"
            })

        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@example.com",
                password: "password123"
            })

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty("token")
        expect(res.body.user.email).toBe("test@example.com")
    })

    it("should fail with wrong password", async () => {
        await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123"
            })

        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@example.com",
                password: "wrongpassword"
            })

        expect(res.statusCode).toBe(401)
        expect(res.body.message).toBe("Email or password is INVALID")
    })

    it("should fail with non existing email", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "notexist@example.com",
                password: "password123"
            })

        expect(res.statusCode).toBe(401)
        expect(res.body.message).toBe("Email or password is INVALID")
    })

})

// -------------------------------------------------------
// LOGOUT
// -------------------------------------------------------
describe("POST /api/auth/logout", () => {

    it("should logout successfully", async () => {
        const registerRes = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123"
            })

        const token = registerRes.body.token

        const res = await request(app)
            .post("/api/auth/logout")
            .set("Authorization", `Bearer ${token}`)

        expect(res.statusCode).toBe(200)
        expect(res.body.message).toBe("User logged out successfully")
    })

    it("should logout successfully even without token", async () => {
        const res = await request(app)
            .post("/api/auth/logout")

        expect(res.statusCode).toBe(200)
        expect(res.body.message).toBe("User logged out successfully")
    })

})