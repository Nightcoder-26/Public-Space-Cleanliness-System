const User = require('../models/User');
const Issue = require('../models/Issue');
const PointTransaction = require('../models/PointTransaction');

// GET /api/user/dashboard
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId).select('-password').lean({ virtuals: true });

        const reportedIssues = await Issue.find({ userId })
            .sort({ dateReported: -1 })
            .limit(10)
            .lean();

        const recentTransactions = await PointTransaction.find({ userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // AI Insights — aggregate top categories
        const allIssues = await Issue.find({}).lean();
        const categoryCount = {};
        allIssues.forEach(issue => {
            categoryCount[issue.category] = (categoryCount[issue.category] || 0) + 1;
        });
        const topCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category, count]) => ({ category, count }));

        // Compute achievements based on activity
        const totalIssues = await Issue.countDocuments({ userId });
        const resolvedIssues = await Issue.countDocuments({ userId, status: 'Resolved' });

        const achievements = [];
        if (totalIssues >= 1) achievements.push({ icon: 'verified', title: 'First Report', earned: true });
        if (totalIssues >= 5) achievements.push({ icon: 'electric_bolt', title: 'Fast Responder', earned: true });
        if (resolvedIssues >= 1) achievements.push({ icon: 'eco', title: 'Leaf Lover', earned: true });
        if (resolvedIssues >= 3) achievements.push({ icon: 'diversity_3', title: 'Community Pillar', earned: true });
        // Always show locked ones
        if (!achievements.find(a => a.title === 'City Guardian'))
            achievements.push({ icon: 'diamond', title: 'City Guardian', earned: false });
        if (!achievements.find(a => a.title === 'Kind Neighbor'))
            achievements.push({ icon: 'volunteer_activism', title: 'Kind Neighbor', earned: false });

        res.json({
            success: true,
            user: {
                name: user.name,
                email: user.email,
                level: user.level || 1,
                xp: user.xp || 0,
                nextLevelXP: (user.level || 1) * 500,
                co2Saved: user.co2Saved || 0,
                memberSince: user.createdAt
                    ? new Date(user.createdAt).toLocaleString('en-US', { month: 'short', year: 'numeric' })
                    : 'N/A',
                location: user.location || ''
            },
            impactPoints: user.points || 0,
            totalPointsEarned: user.totalPointsEarned || 0,
            reportedIssues: reportedIssues.map(issue => ({
                _id: issue._id,
                title: issue.title,
                location: issue.location,
                category: issue.category,
                severity: issue.severity,
                status: issue.status,
                dateReported: issue.dateReported,
                pointsAwarded: issue.pointsAwarded || 0,
                aiVerified: issue.aiVerified,
                aiConfidence: issue.aiConfidence,
                imageUrl: issue.imageUrl,
                latitude: issue.latitude,
                longitude: issue.longitude,
                assignedAuthority: issue.assignedAuthority
            })),
            recentActivity: recentTransactions,
            achievements,
            aiInsights: {
                topCategories,
                totalCityIssues: allIssues.length,
                resolvedCityIssues: allIssues.filter(i => i.status === 'Resolved').length,
                hotspot: topCategories[0]
                    ? `${topCategories[0].category} is the most reported issue this month with ${topCategories[0].count} reports.`
                    : 'No issues reported yet. Be the first to report!'
            }
        });
    } catch (err) {
        console.error('getDashboard error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
