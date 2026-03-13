const mongoose = require("mongoose")

const webhookSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    url: {
        type: String,
        required: [true, "Webhook URL is required"]
    },
    events: {
        type: [String],
        enum: ["transaction.success", "transaction.failed"],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

const webhookModel = mongoose.model("webhook", webhookSchema)

module.exports = webhookModel