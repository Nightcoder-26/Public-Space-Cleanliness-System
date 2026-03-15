const mongoose = require("mongoose");

const ecoTaskSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    points: {
        type: Number,
        required: true
    },
    difficulty: {
        type: String,
        enum: ["small", "medium", "high"],
        default: "small"
    },
    status: {
        type: String,
        enum: ["pending", "completed"],
        default: "pending"
    }
}, { timestamps: true });

module.exports = mongoose.model("EcoTask", ecoTaskSchema);
