const mongoose = require("mongoose");

const redemptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    rewardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reward",
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "fulfilled", "cancelled"],
        default: "pending"
    },
    deliveryAddress: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Redemption", redemptionSchema);
