// AI Gamification Engine 
// Provides smart recommendations and verification for Gamification tasks.
const PointTransaction = require("../models/PointTransaction");
const User = require("../models/User");

// 1. Issue Verification AI (Mock/Heuristic based on description)
exports.verifyIssueReport = (title, description) => {
    const text = (title + " " + description).toLowerCase();

    // High Severity keywords
    if (text.match(/(fire|toxic|chemical|spill|severe|huge|massive|dangerous|hazard|deforestation|illegal dumping|pollution|accident|urgent)/)) {
        return { severity: "High", points: 400, confidence: 0.92, notes: "AI determined this issue is a high priority hazard." };
    }
    // Medium Severity keywords
    if (text.match(/(leak|water|broken|damaged|overflow|blocked|drain|pothole|vandalism|graffiti)/)) {
        return { severity: "Medium", points: 150, confidence: 0.85, notes: "AI determined this issue requires moderate attention." };
    }
    // Low Severity keywords / Default
    return { severity: "Low", points: 50, confidence: 0.78, notes: "AI determined this is a routine maintenance issue." };
};

// 2. Task Recommendation AI
exports.generateDailyChallenges = (userId) => {
    // In a real LLM scenario, this would query OpenAI.
    // We provide a curated rotating list of eco-tasks.
    const allTasks = [
        { title: "Zero Waste Day", description: "Avoid single-use plastics entirely for 24 hours.", points: 200, difficulty: "high" },
        { title: "Plant-Based Meal", description: "Eat one fully vegetarian or vegan meal today.", points: 50, difficulty: "small" },
        { title: "Public Transit Hero", description: "Use public transportation instead of driving for your commute.", points: 75, difficulty: "medium" },
        { title: "Recycling Champion", description: "Properly wash and sort 5 recyclable items.", points: 25, difficulty: "small" },
        { title: "Energy Saver", description: "Turn off all standby appliances before going to sleep.", points: 50, difficulty: "small" },
        { title: "Active Commute", description: "Walk or cycle for at least 2km instead of taking a car.", points: 75, difficulty: "medium" },
        { title: "Community Clean-up", description: "Spend 15 minutes picking up litter in your local park.", points: 200, difficulty: "high" }
    ];

    // Randomly pick 3 tasks using a deterministic seed based on date and userId
    const dateStr = new Date().toISOString().split('T')[0];
    const hash = Array.from(userId.toString() + dateStr).reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const selected = [];
    const pool = [...allTasks];
    for (let i = 0; i < 3; i++) {
        const index = (hash + i) % pool.length;
        selected.push(pool.splice(index, 1)[0]);
    }

    return selected;
};

// API Endpoint to manually fetch recommendations
exports.getRecommendations = (req, res) => {
    const challenges = exports.generateDailyChallenges(req.user._id);
    res.json({ success: true, ai_recommendations: challenges });
};

// 3. Reward Recommendation AI
exports.recommendReward = (userPoints, allRewards) => {
    // Filter out rewards the user already has enough points for
    const lockedRewards = allRewards.filter(r => r.pointsRequired > userPoints);

    if (lockedRewards.length === 0) {
        return "You have unlocked the entire ecosystem of eco-rewards! Check back soon for more exclusives.";
    }

    // Sort by pointsRequired to find the absolute closest goal
    lockedRewards.sort((a, b) => a.pointsRequired - b.pointsRequired);
    const target = lockedRewards[0];
    const diff = target.pointsRequired - userPoints;

    return `You are only ${diff.toLocaleString()} points away from unlocking the ${target.title}! Keep completing tasks to reach your goal.`;
};
