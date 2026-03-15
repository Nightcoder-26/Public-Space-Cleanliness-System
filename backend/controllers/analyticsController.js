const Report = require("../models/Report");
const Project = require("../models/Project");
const User = require("../models/User");

exports.getDashboardData = async (req, res) => {
    try {

        const totalReports = await Report.countDocuments();
        const totalProjects = await Project.countDocuments();
        const totalUsers = await User.countDocuments();

        // Fake monthly aggregation example
        const monthlyData = [45, 62, 78, 55, 85, 98];

        res.json({
            carbonMitigation: totalReports * 2, // example logic
            activePartnerships: totalProjects,
            engagementReach: totalUsers,
            monthlyCO2: monthlyData
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

const Report = require("../models/Report");

// PUBLIC LANDING STATS
exports.getPublicStats = async (req, res) => {
    try {
        const totalReports = await Report.countDocuments();
        const resolvedReports = await Report.countDocuments({ status: "resolved" });
        const verifiedReports = await Report.countDocuments({ verified: true });
        const totalCities = await Report.distinct("city");

        res.json({
            totalReports,
            resolvedReports,
            verifiedReports,
            totalCities: totalCities.length
        });

    } catch (err) {
        res.status(500).json({ message: "Failed to fetch stats" });
    }
};