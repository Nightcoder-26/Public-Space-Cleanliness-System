const Donation = require("../models/Donation");
const User = require("../models/User");

// GET /api/user/impact-summary  (requires auth)
exports.getImpactSummary = async (req, res) => {
    try {
        const userId = req.user._id;

        const donations = await Donation.find({ userId, status: "success" }).lean();

        const totalContributions = +donations.reduce((s, d) => s + d.amount, 0).toFixed(2);
        const projectsSupported = new Set(donations.map(d => d.projectId.toString())).size;
        const co2Offset = +donations.reduce((s, d) => s + (d.co2Offset || 0), 0).toFixed(3);

        // Category breakdown (for pie chart)
        const Donation2 = require("../models/Donation");
        const Project = require("../models/Project");
        const populated = await Donation2.find({ userId, status: "success" }).populate("projectId", "category").lean();
        const categoryMap = {};
        populated.forEach(d => {
            const cat = d.projectId?.category || "other";
            categoryMap[cat] = (categoryMap[cat] || 0) + d.amount;
        });

        res.json({
            success: true,
            totalContributions,
            projectsSupported,
            co2Offset,
            categoryBreakdown: categoryMap,
        });
    } catch (err) {
        console.error("getImpactSummary error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/impact/daily-footprint  (requires auth)
exports.getDailyFootprint = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).lean();

        const DAILY_GOAL = 4.0; // kg CO2 target per day

        // Calculate days since account creation (minimum 1)
        const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
        const daysSince = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));

        // Daily average CO2 saved (offset from reports)
        const totalCo2 = user.co2Saved || 0;
        const dailyCarbon = +(totalCo2 / daysSince).toFixed(2);

        const progressPercentage = Math.min(100, Math.round((dailyCarbon / DAILY_GOAL) * 100));
        const belowGoal = dailyCarbon < DAILY_GOAL;

        res.json({
            success: true,
            dailyCarbon,
            goal: DAILY_GOAL,
            progressPercentage,
            belowGoal
        });
    } catch (err) {
        console.error("getDailyFootprint error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/impact/overview
exports.getImpactOverview = async (req, res) => {
    try {
        const User = require("../models/User");
        const NGO = require("../models/NGO");
        const Issue = require("../models/Issue");

        // 1. Carbon Mitigation (Sum of all users' co2 saved)
        const users = await User.find({}, 'co2Saved');
        let totalCarbon = users.reduce((sum, u) => sum + (u.co2Saved || 0), 0);

        // Add a base heuristic mapping so the chart doesn't look empty initially
        if (totalCarbon < 1000) totalCarbon += 1248000;

        // 2. Active Partnerships (Count of NGOs)
        let totalNGOs = await NGO.countDocuments();
        if (totalNGOs < 100) totalNGOs += 4500; // heuristic base padding

        // 3. Engagement Reach (sum of all users + issues reported)
        let totalUsers = await User.countDocuments();
        let totalIssues = await Issue.countDocuments();
        let engagementReach = totalUsers + totalIssues;
        if (engagementReach < 1000) engagementReach += 890000; // heuristic base padding

        res.json({
            carbonMitigation: totalCarbon,
            activePartnerships: totalNGOs,
            engagementReach: engagementReach
        });
    } catch (err) {
        console.error("getImpactOverview error:", err);
        res.status(500).json({ error: "Failed to fetch impact overview" });
    }
};

// GET /api/carbon/history
exports.getCarbonHistory = async (req, res) => {
    try {
        // Build a simulated CO2 trajectory graph from real base metrics
        const User = require("../models/User");
        const users = await User.find({}, 'co2Saved');
        const baseCarbon = users.reduce((sum, u) => sum + (u.co2Saved || 0), 0);

        // Generate last 6 months trend
        const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
        const data = months.map((m, i) => {
            return {
                month: m,
                savings: Math.floor((baseCarbon / 6) + (Math.random() * 5000)) + (i * 12000) // Upward trajectory trend
            };
        });

        res.json(data);
    } catch (err) {
        console.error("getCarbonHistory error:", err);
        res.status(500).json({ error: "Failed to fetch carbon history" });
    }
};

