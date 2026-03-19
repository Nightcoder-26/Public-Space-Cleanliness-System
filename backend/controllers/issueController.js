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

// ── Deduplication radius (degrees ≈ ~111m per 0.001°) ──────────────────────
const GEO_RADIUS = 0.001; // ~111 metres

/**
 * Compute dynamic priority level from reportCount.
 * 1–3  → Low | 4–9 → Medium | 10+ → High
 */
function getPriorityFromCount(count) {
    if (count >= 10) return { level: 'High',   score: Math.min(99, 80 + count) };
    if (count >= 4)  return { level: 'Medium', score: 40 + count * 3 };
    return             { level: 'Low',    score: Math.max(1, count * 10) };
}

// POST /api/issues/report
exports.createIssue = async (req, res) => {
    try {
        const {
            title, description, location, category,
            imageUrl, latitude, longitude, dateTime
        } = req.body;

        const userId = req.user._id;

        // ── 1. Deduplication check ─────────────────────────────────────────
        // Only attempt geo-match when lat/lng are provided
        let existingIssue = null;

        if (latitude != null && longitude != null) {
            existingIssue = await Issue.findOne({
                category,
                status: { $nin: ['Resolved'] },          // ignore resolved issues
                latitude:  { $gte: latitude  - GEO_RADIUS, $lte: latitude  + GEO_RADIUS },
                longitude: { $gte: longitude - GEO_RADIUS, $lte: longitude + GEO_RADIUS }
            }).select('+reportedBy');
        }

        // ── 2a. DUPLICATE path ─────────────────────────────────────────────
        if (existingIssue) {
            const alreadyReported = existingIssue.reportedBy.some(
                id => id.toString() === userId.toString()
            );

            if (alreadyReported) {
                // Same user reporting same issue — reject silently
                return res.status(200).json({
                    success: true,
                    duplicate: true,
                    alreadyReportedByUser: true,
                    issue: existingIssue,
                    reportCount: existingIssue.reportCount,
                    message: 'You have already reported this issue.'
                });
            }

            // New user reporting same issue — increment count
            const newCount = existingIssue.reportCount + 1;
            const { level: newPriorityLevel, score: newPriorityScore } = getPriorityFromCount(newCount);

            const updatedIssue = await Issue.findByIdAndUpdate(
                existingIssue._id,
                {
                    $inc: { reportCount: 1 },
                    $addToSet: { reportedBy: userId },
                    $set: {
                        priorityLevel: newPriorityLevel,
                        priorityScore: newPriorityScore
                    }
                },
                { new: true }
            );

            // Award points to user for confirming the issue (half the normal amount)
            const points = Math.floor((POINTS_MAP[existingIssue.severity] || 50) / 2);
            await User.findByIdAndUpdate(userId, { $inc: { points, totalPointsEarned: points } });
            await Activity.create({
                userId,
                action: 'Confirmed Issue',
                description: `Confirmed existing issue: ${existingIssue.title} at ${existingIssue.location}`,
                impactPoints: points
            });

            return res.status(200).json({
                success: true,
                duplicate: true,
                alreadyReportedByUser: false,
                issue: updatedIssue,
                reportCount: updatedIssue.reportCount,
                priorityLevel: updatedIssue.priorityLevel,
                pointsAwarded: points,
                message: 'This issue already exists. Your report has been counted.'
            });
        }

        // ── 2b. NEW ISSUE path ─────────────────────────────────────────────

        // AI Verification
        const aiEvaluation = verifyIssueReport(title, description);
        const severity = aiEvaluation.severity;
        const points   = POINTS_MAP[severity] || 50;
        const co2Gain  = CO2_MAP[severity]  || 0.5;
        const xpGain   = XP_MAP[severity]   || 25;

        // Priority — for a fresh issue, count = 1 → Low
        const { level: priorityLevel, score: priorityScore } = getPriorityFromCount(1);

        // Authority assignment
        const assignedAuthority = AUTHORITY_MAP[category] || 'City Environmental Affairs Office';

        // Status based on AI confidence
        const status = aiEvaluation.confidence >= 0.7 ? 'Sent to Authority' : 'Submitted';

        const newIssue = new Issue({
            userId,
            title,
            description,
            location,
            category,
            imageUrl:  imageUrl  || null,
            latitude:  latitude  || null,
            longitude: longitude || null,
            dateTime:  dateTime ? new Date(dateTime) : new Date(),
            severity,
            status,
            aiVerified:  aiEvaluation.confidence >= 0.7,
            aiConfidence: aiEvaluation.confidence,
            aiIssueType:  category,
            aiNotes:      aiEvaluation.notes,
            assignedAuthority,
            priorityScore,
            priorityLevel,
            pointsAwarded: points,
            reportCount: 1,
            reportedBy: [userId]
        });

        const savedIssue = await newIssue.save();

        // Award full points + XP + CO2 to reporter
        await User.findByIdAndUpdate(
            userId,
            [
                {
                    $set: {
                        points:            { $add: ['$points', points] },
                        totalPointsEarned: { $add: ['$totalPointsEarned', points] },
                        xp: {
                            $cond: [
                                { $gte: [{ $add: ['$xp', xpGain] }, { $multiply: ['$level', 500] }] },
                                0,
                                { $add: ['$xp', xpGain] }
                            ]
                        },
                        level: {
                            $cond: [
                                { $gte: [{ $add: ['$xp', xpGain] }, { $multiply: ['$level', 500] }] },
                                { $add: ['$level', 1] },
                                '$level'
                            ]
                        },
                        co2Saved: { $add: ['$co2Saved', co2Gain] }
                    }
                }
            ],
            { new: true }
        );

        await PointTransaction.create({
            userId,
            pointsAdded:  points,
            sourceType:   'report',
            sourceId:     savedIssue._id,
            description:  `Reported a ${severity} severity issue: ${title}`
        });

        await Activity.create({
            userId,
            action: 'Reported Issue',
            description: `Reported: ${title} at ${location}`,
            impactPoints: points
        });

        res.status(201).json({
            success: true,
            duplicate: false,
            issue: savedIssue,
            reportCount: 1,
            priorityLevel,
            aiEvaluation: {
                verified:   aiEvaluation.confidence >= 0.7,
                issueType:  category,
                severity:   aiEvaluation.severity,
                confidence: aiEvaluation.confidence,
                notes:      aiEvaluation.notes
            },
            pointsAwarded: points,
            xpGained:      xpGain,
            co2Saved:      co2Gain,
            assignedAuthority,
            message: 'Issue reported successfully.'
        });

        // ── Post-response: community feed + sockets ────────────────────────
        try {
            const communityPost = new CommunityPost({
                userId,
                postType:  'issue',
                category:  'Issue Report',
                title:     title || 'New Civic Issue',
                description: `${category} reported at ${location}. ${description}`,
                imageUrl:  savedIssue.imageUrl,
                location,
                latitude,
                longitude,
                aiLabel:   `${aiEvaluation.severity} Severity`,
                aiSummary: '📝 AI Preview: A new civic issue has been reported and verified by AI.',
                sourceIssueId: savedIssue._id
            });
            await communityPost.save();
            await communityPost.populate('userId', 'name level xp');

            if (req.app.locals.io) {
                const populatedIssue = await Issue.findById(savedIssue._id).populate('userId', 'name');
                req.app.locals.io.emit('new-issue', {
                    _id:         populatedIssue._id,
                    title:       populatedIssue.title,
                    category:    populatedIssue.category,
                    location:    populatedIssue.location,
                    latitude:    populatedIssue.latitude,
                    longitude:   populatedIssue.longitude,
                    severity:    populatedIssue.severity,
                    status:      populatedIssue.status,
                    reportCount: populatedIssue.reportCount,
                    priorityLevel: populatedIssue.priorityLevel,
                    dateReported: populatedIssue.dateReported,
                    reporter:    populatedIssue.userId?.name || 'Anonymous User'
                });
                req.app.locals.io.emit('new_issue_broadcast', populatedIssue);
                req.app.locals.io.emit('new-community-post', communityPost);
            }
        } catch (postError) {
            console.error('Error creating community post or emitting sockets:', postError);
        }

    } catch (error) {
        if (!res.headersSent) {
            console.error('createIssue error:', error);
            const isDev = process.env.NODE_ENV !== 'production';
            res.status(500).json({
                message: isDev
                    ? `Server error: ${error.message}`
                    : 'Server error processing issue report',
                error: error.message
            });
        } else {
            console.error('createIssue error after response sent:', error);
        }
    }
};

// GET /api/issues — all issues (authority view)
exports.getIssues = async (req, res) => {
    try {
        const issues = await Issue
            .find()
            .select('title category severity status location latitude longitude dateReported userId assignedAuthority priorityLevel reportCount')
            .populate('userId', 'name')
            .sort({ dateReported: -1 })
            .limit(200)
            .lean();
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
            .select('title category severity status latitude longitude location dateReported userId reportCount priorityLevel')
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
