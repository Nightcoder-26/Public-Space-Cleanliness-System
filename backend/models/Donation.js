const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["upi", "credit_card", "debit_card", "net_banking", "qr"], default: "upi" },
    transactionId: { type: String, default: "" },
    status: { type: String, enum: ["pending", "success", "failed"], default: "success" },
    co2Offset: { type: Number, default: 0 },  // kg CO2 offset from this donation
}, { timestamps: true });

module.exports = mongoose.model("Donation", donationSchema);
