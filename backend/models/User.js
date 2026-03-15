const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: {
        type: String,
        enum: ["citizen", "authority"],
        default: "citizen"
    },
    points: { type: Number, default: 0 },
    totalPointsEarned: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    co2Saved: { type: Number, default: 0 },
    location: { type: String, default: "" },
    avatarUrl: { type: String, default: "" }
}, { timestamps: true });

// Computed memberSince from createdAt
userSchema.virtual("memberSince").get(function () {
    return this.createdAt
        ? this.createdAt.toLocaleString("en-US", { month: "short", year: "numeric" })
        : "N/A";
});

// XP required for next level (formula: level * 500)
userSchema.virtual("nextLevelXP").get(function () {
    return this.level * 500;
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("User", userSchema);