const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    pointsRequired: { type: Number, required: true },
    rewardType: { type: String, enum: ['Digital', 'Physical', 'Impact', 'Exclusive', 'digital', 'physical', 'impact', 'exclusive'], required: true },
    image: { type: String },
    stock: { type: Number, default: 100 },
    deliveryType: { type: String },
    co2Impact: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Reward", rewardSchema);
