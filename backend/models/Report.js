const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
    title: String,
    category: String,
    image: String,
    location: String,
    severity: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low"
    },
    verified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ["pending", "in-progress", "resolved"],
        default: "pending"
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

module.exports = mongoose.model("Report", reportSchema);