const Issue = require('../models/Issue');
const Activity = require('../models/Activity');
const User = require('../models/User');
const PointTransaction = require('../models/PointTransaction');
const CommunityPost = require("../models/CommunityPost");
const { verifyIssueReport } = require('./aiGamificationController');
const { AUTHORITY_MAP } = require('../utils/authorityMap');

// Point values by severity
const POINTS_MAP = { Low: 50, Medium: 150, High: 400 };
// CO2 offset per severity (kg)
const CO2_MAP = { Low: 0.5, Medium: 2.0, High: 5.0 };
// XP per severity
const XP_MAP = { Low: 25, Medium: 75, High: 200 };

// POST /api/issues/report
exports.createIssue = async (req, res) => {
    try {
        const {
            title, description, location, category,
            imageUrl, latitude, longitude, dateTime
        } = req.body;

        // 1. AI Verification using heuristic + image signal
        const aiEvaluation = verifyIssueReport(title, description);
        const severity = aiEvaluation.severity;
        const points = POINTS_MAP[severity] || 50;
        const co2Gain = CO2_MAP[severity] || 0.5;
        const xpGain = XP_MAP[severity] || 25;

        // Priority calculation
        let priorityScore = 0;
        let priorityLevel = 'Low';
        if (severity === 'High') {
            priorityScore = Math.floor(Math.random() * 20) + 80; // 80-99
            priorityLevel = priorityScore >= 90 ? 'Critical' : 'High';
        } else if (severity === 'Medium') {
            priorityScore = Math.floor(Math.random() * 30) + 40; // 40-69
            priorityLevel = 'Medium';
        } else {
            priorityScore = Math.floor(Math.random() * 40); // 0-39
            priorityLevel = 'Low';
        }

        // 2. Authority assignment
        const assignedAuthority = AUTHORITY_MAP[category] || 'City Environmental Affairs Office';

        // 3. Determine status based on AI confidence
        const status = aiEvaluation.confidence >= 0.7
            ? 'Sent to Authority'
            : 'Submitted'; // Low confidence → manual moderation

        // 4. Create issue
        const newIssue = new Issue({
            userId: req.user._id,
            title,
            description,
            location,
            category,
            imageUrl: imageUrl || null,
            latitude: latitude || null,
            longitude: longitude || null,
            dateTime: dateTime ? new Date(dateTime) : new Date(),
            severity,
            status: aiEvaluation.confidence >= 0.7 ? 'Sent to Authority' : 'Submitted',
            aiVerified: aiEvaluation.confidence >= 0.7,
            aiConfidence: aiEvaluation.confidence,
            aiIssueType: category,
            aiNotes: aiEvaluation.notes,
            assignedAuthority,
            priorityScore,
            priorityLevel,
            pointsAwarded: points
        });

        const savedIssue = await newIssue.save();

        // 5. Award points + XP + CO2
        await User.findByIdAndUpdate(req.user._id, {
            $inc: {
                points,
                totalPointsEarned: points,
                xp: xpGain,
                co2Saved: co2Gain
            }
        });

        // 6. Level up check
        const updatedUser = await User.findById(req.user._id);
        if (updatedUser.xp >= updatedUser.level * 500) {
            await User.findByIdAndUpdate(req.user._id, {
                $inc: { level: 1 },
                $set: { xp: 0 }
            });
        }

        // 7. Log point transaction
        await PointTransaction.create({
            userId: req.user._id,
            pointsAdded: points,
            sourceType: 'report',
            sourceId: savedIssue._id,
            description: `Reported a ${severity} severity issue: ${title}`
        });

        // 8. Log activity
        await Activity.create({
            userId: req.user._id,
            action: 'Reported Issue',
            description: `Reported: ${title} at ${location}`,
            impactPoints: points
        });

        res.status(201).json({
            success: true,
            issue: savedIssue,
            aiEvaluation: {
                verified: aiEvaluation.confidence >= 0.7,
                issueType: category,
                severity: aiEvaluation.severity,
                confidence: aiEvaluation.confidence,
                notes: aiEvaluation.notes
            },
            pointsAwarded: points,
            xpGained: xpGain,
            co2Saved: co2Gain,
            assignedAuthority
        });

        try {
            // Auto-create CommunityPost for the feed
            const communityPost = new CommunityPost({
                userId: req.user._id,
                postType: 'issue',
                category: 'Issue Report',
                title: title || 'New Civic Issue',
                description: `${category} reported at ${location}. ${description}`,
                imageUrl: newIssue.imageUrl,
                location,
                latitude,
                longitude,
                aiLabel: `${aiEvaluation.severity} Severity`,
                aiSummary: '📝 AI Preview: A new civic issue has been reported in the community and verified by AI.',
                sourceIssueId: newIssue._id
            });
            await communityPost.save();
            await communityPost.populate('userId', 'name level xp');

            // Feature 4: Emit socket event for live map updates
            if (req.app.locals.io) {
                // Re-fetch populated issue to ensure consistent data structure
                const populatedIssue = await Issue.findById(newIssue._id).populate("userId", "name");

                req.app.locals.io.emit('new-issue', {
                    _id: populatedIssue._id,
                    title: populatedIssue.title,
                    category: populatedIssue.category,
                    location: populatedIssue.location,
                    latitude: populatedIssue.latitude,
                    longitude: populatedIssue.longitude,
                    severity: populatedIssue.severity,
                    status: populatedIssue.status,
                    dateReported: populatedIssue.dateReported,
                    reporter: populatedIssue.userId ? populatedIssue.userId.name : 'Anonymous User'
                });

                // Emit for Authority Dashboard specifically
                req.app.locals.io.emit('new_issue_broadcast', populatedIssue);

                // Emit for community feed
                req.app.locals.io.emit('new-community-post', communityPost);
            }
        } catch (postError) {
            console.error('Error creating community post or emitting sockets:', postError);
        }
    } catch (error) {
        if (!res.headersSent) {
            console.error('createIssue error:', error);
            res.status(500).json({ message: 'Server error processing issue report', error: error.message });
        } else {
            console.error('createIssue error after response sent:', error);
        }
    }
};

// GET /api/issues — all issues (authority view)
exports.getIssues = async (req, res) => {
    try {
        const issues = await Issue.find().populate('userId', 'name').sort({ dateReported: -1 });
        res.status(200).json(issues);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving issues' });
    }
};

// GET /api/issues/my-issues — user's own issues
exports.getMyIssues = async (req, res) => {
    try {
        const issues = await Issue.find({ userId: req.user._id })
            .sort({ dateReported: -1 })
            .lean();
        res.status(200).json({ success: true, issues });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving your issues' });
    }
};

// GET /api/issues/map — all issues with geolocation for map
exports.getMapIssues = async (req, res) => {
    try {
        const issues = await Issue.find({ latitude: { $ne: null }, longitude: { $ne: null } })
            .select('title category severity status latitude longitude location dateReported userId')
            .populate('userId', 'name')
            .lean();
        const mapped = issues.map(i => ({
            ...i,
            reporter: i.userId?.name || 'Anonymous'
        }));
        res.status(200).json({ success: true, issues: mapped });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving map issues' });
    }
};
