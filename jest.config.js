module.exports = {
    testEnvironment: "node",
    testTimeout: 30000,        // increased from 10000 to 30000
    setupFiles: ["dotenv/config"]  // load .env automatically
}