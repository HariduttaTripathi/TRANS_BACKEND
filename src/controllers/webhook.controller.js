const webhookModel = require("../models/webhook.model")

// Register a webhook URL
async function registerWebhook(req, res) {
    const { url, events } = req.body

    if (!url || !events || events.length === 0) {
        return res.status(400).json({
            message: "url and events are required"
        })
    }

    const webhook = await webhookModel.create({
        user: req.user._id,
        url,
        events
    })

    return res.status(201).json({
        message: "Webhook registered successfully",
        webhook
    })
}

// View all webhooks for logged in user
async function getWebhooks(req, res) {
    const webhooks = await webhookModel.find({ user: req.user._id })

    return res.status(200).json({
        message: "Webhooks fetched successfully",
        webhooks
    })
}

// Delete a webhook
async function deleteWebhook(req, res) {
    const { webhookId } = req.params

    await webhookModel.findOneAndDelete({
        _id: webhookId,
        user: req.user._id
    })

    return res.status(200).json({
        message: "Webhook deleted successfully"
    })
}

module.exports = { registerWebhook, getWebhooks, deleteWebhook }