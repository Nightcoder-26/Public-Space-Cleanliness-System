const Donation = require("../models/Donation");
const Project = require("../models/Project");
const User = require("../models/User");
const PointTransaction = require("../models/PointTransaction");
const crypto = require("crypto");

// POST /api/donations  (requires auth)
exports.createDonation = async (req, res) => {
    try {
        const { projectId, amount, paymentMethod } = req.body;
        const userId = req.user._id;

        if (!projectId || !amount || amount <= 0)
            return res.status(400).json({ success: false, message: "projectId and amount are required" });

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        // Generate a simulated transaction ID
        const transactionId = "TXN" + crypto.randomBytes(6).toString("hex").toUpperCase();

        // Calculate CO2 offset for this donation
        const co2Offset = +(amount * project.co2OffsetPerDollar).toFixed(3);

        // Save donation
        const donation = await Donation.create({
            userId, projectId, amount, paymentMethod: paymentMethod || "upi",
            transactionId, status: "success", co2Offset,
        });

        // Update project: currentFunding and donorCount
        await Project.findByIdAndUpdate(projectId, {
            $inc: { currentFunding: amount, donorCount: 1 }
        });

        // Award points to user (10 points per $1 donated)
        const earnedPoints = Math.floor(amount * 10);
        await User.findByIdAndUpdate(userId, {
            $inc: { points: earnedPoints, totalPointsEarned: earnedPoints }
        });

        // Log the point transaction for transparency
        await PointTransaction.create({
            userId,
            pointsAdded: earnedPoints,
            sourceType: "donation",
            sourceId: donation._id,
            description: `Donated $${amount} to ${project.title}`
        });

        res.status(201).json({
            success: true,
            message: "Donation successful! Thank you for your contribution.",
            transactionId,
            co2Offset,
            donation,
        });
    } catch (err) {
        console.error("createDonation error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/donations/recent  — last 10 donations with project info (for donation ticker)
exports.getRecentDonations = async (req, res) => {
    try {
        const donations = await Donation.find({ status: "success" })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("userId", "name")
            .populate("projectId", "title")
            .lean();
        res.json({ success: true, donations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/donations/project/:id - Top and recent donations for a specific project
exports.getProjectDonations = async (req, res) => {
    try {
        const projectId = req.params.id;

        // Get top 3 donors by amount
        const topDonations = await Donation.find({ projectId, status: "success" })
            .sort({ amount: -1 })
            .limit(3)
            .populate("userId", "name")
            .lean();

        // Get 5 most recent donations
        const recentDonations = await Donation.find({ projectId, status: "success" })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("userId", "name")
            .lean();

        res.json({ success: true, topDonations, recentDonations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
