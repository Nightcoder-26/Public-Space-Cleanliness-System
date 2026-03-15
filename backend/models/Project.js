const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    fullDescription: { type: String, default: "" },
    category: { type: String, enum: ["environment", "infrastructure", "education", "healthcare"], required: true },
    image: { type: String, default: "" },
    fundingGoal: { type: Number, required: true },
    currentFunding: { type: Number, default: 0 },
    location: { type: String, default: "" },
    organization: { type: String, default: "" },
    verifiedType: { type: String, enum: ["gov", "ngo"], default: "ngo" },
    co2OffsetPerDollar: { type: Number, default: 0 },   // kg CO2 per $1 donated
    co2Impact: { type: String, default: "" },   // human-readable eg. "50 tons CO2 per year"
    donorCount: { type: Number, default: 0 },
    impactMetrics: [{ label: String, value: String }],
    tags: [String],
    featured: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
