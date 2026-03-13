const axios = require("axios")
const webhookModel = require("../models/webhook.model")

async function triggerWebhook(event, data) {
    // Find all webhooks listening to this event
    const webhooks = await webhookModel.find({
        events: event,
        isActive: true
    })

    // Send POST request to each registered URL
    for (const webhook of webhooks) {
        try {
            await axios.post(webhook.url, {
                event,
                data,
                timestamp: new Date()
            })
            console.log(`✅ Webhook sent to ${webhook.url} for event: ${event}`)
        } catch (error) {
            console.error(`❌ Webhook failed for ${webhook.url}: ${error.message}`)
        }
    }
}

module.exports = { triggerWebhook }