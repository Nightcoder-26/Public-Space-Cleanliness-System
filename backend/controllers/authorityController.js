const Issue = require('../models/Issue');
const NGO = require('../models/NGO');

exports.getDashboardStats = async (req, res) => {
    try {
        const ngo = await NGO.findOne({ email: req.user.email });
        if (!ngo) return res.status(404).json({ error: 'NGO profile not found' });

        const totalIssues = await Issue.countDocuments({ ngoId: ngo._id });
        const resolvedIssues = await Issue.countDocuments({ ngoId: ngo._id, status: 'Resolved' });
        const activeMissions = await Issue.countDocuments({ ngoId: ngo._id, status: 'In Progress' });

        const responseTime = ngo.averageResponseTime ? ngo.averageResponseTime.toFixed(1) + "h" : "N/A";
        const trustScore = ngo.rating ? ngo.rating.toFixed(1) : "N/A";
        const verificationAccuracy = 99.2; // Static for now

        res.json({
            responseTime,
            trustScore,
            resolvedCases: resolvedIssues,
            activeMissions,
            verificationAccuracy,
            totalIssues,
            ngo: ngo
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

exports.getActiveIssues = async (req, res) => {
    try {
        let ngo = await NGO.findOne({ email: req.user.email });

        // Auto-create NGO profile for newly registered authority accounts
        // so they see all available issues right away
        if (!ngo) {
            const User = require('../models/User');
            const user = await User.findById(req.user.id);
            ngo = new NGO({
                name: (user && user.name) ? user.name : 'New NGO',
                email: req.user.email,
                specialization: 'General Civic Action',
                location: { latitude: 0, longitude: 0, address: 'HQ' },
                isVerified: false
            });
            await ngo.save();
        }

        // All unclaimed (ngoId null, not Resolved) + this NGO's own issues
        const issues = await Issue.find({
            $or: [
                { ngoId: ngo._id },
                { ngoId: null, status: { $ne: 'Resolved' } }
            ]
        }).populate('ngoId').sort({ createdAt: -1 });

        res.json(issues);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch issues' });
    }
};

exports.getNGOLeaderboard = async (req, res) => {
    try {
        const ngos = await NGO.find().sort({ rating: -1 }).limit(10);
        res.json(ngos);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
};

exports.acceptIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const ngo = await NGO.findOne({ email: req.user.email });
        if (!ngo) return res.status(404).json({ error: 'NGO profile not found' });

        const issue = await Issue.findById(id);
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        if (issue.ngoId) {
            return res.status(400).json({ error: 'Case already assigned.' });
        }

        issue.status = 'In Progress';
        issue.ngoId = ngo._id;
        await issue.save();

        if (req.app.locals.io) {
            req.app.locals.io.emit('issue_updated', issue);
        }

        res.json({ message: 'Issue accepted', issue });
    } catch (error) {
        console.error("Accept Issue Error:", error);
        res.status(500).json({ error: 'Failed to accept issue' });
    }
};

exports.resolveIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const { proofImages } = req.body;

        const issue = await Issue.findById(id).populate('ngoId');
        if (!issue) return res.status(404).json({ error: 'Issue not found' });

        issue.status = 'Resolved';
        issue.resolvedDate = Date.now();
        issue.resolutionProofImages = proofImages || [];
        await issue.save();

        if (issue.ngoId) {
            const ngo = await NGO.findById(issue.ngoId._id);
            if (ngo) {
                ngo.totalIssuesHandled = (ngo.totalIssuesHandled || 0) + 1;
                ngo.points = (ngo.points || 0) + 50;

                const responseTimeMs = new Date(issue.resolvedDate) - new Date(issue.createdAt);
                const responseTimeHrs = responseTimeMs / (1000 * 60 * 60);

                let speedScore = 5.0;
                if (responseTimeHrs > 24) speedScore = 3.0;
                else if (responseTimeHrs > 12) speedScore = 4.0;

                const completionScore = 5.0; 
                const feedbackScore = 5.0; 
                
                const newRating = (speedScore + completionScore + feedbackScore) / 3;
                
                ngo.rating = ngo.rating ? ((ngo.rating * (ngo.totalIssuesHandled - 1)) + newRating) / ngo.totalIssuesHandled : newRating;
                ngo.averageResponseTime = ngo.averageResponseTime ? ((ngo.averageResponseTime * (ngo.totalIssuesHandled - 1)) + responseTimeHrs) / ngo.totalIssuesHandled : responseTimeHrs;

                await ngo.save();
            }
        }

        if (req.app.locals.io) {
            req.app.locals.io.emit('issue_updated', issue);
        }

        res.json({ message: 'Issue resolved', issue });
    } catch (error) {
        console.error("Resolve Issue Error:", error);
        res.status(500).json({ error: 'Failed to resolve issue' });
    }
};
