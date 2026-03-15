const mongoose = require("mongoose");

const pointTransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    pointsAdded: {
        type: Number,
        required: true
    },
    sourceType: {
        type: String,
        enum: ["donation", "report", "task", "community", "redeem", "bonus"],
        required: true
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false // can be a donationId, issueId, taskId, etc.
    },
    description: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("PointTransaction", pointTransactionSchema);
