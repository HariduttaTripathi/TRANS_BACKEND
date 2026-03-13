const express = require("express")
const router = express.Router()

const { authMiddleware } = require("../middleware/auth.middleware")
const { registerWebhook, getWebhooks, deleteWebhook } = require("../controllers/webhook.controller")

router.post("/register", authMiddleware, registerWebhook)
router.get("/", authMiddleware, getWebhooks)
router.delete("/:webhookId", authMiddleware, deleteWebhook)

module.exports = router