const Message = require('../models/Message');
const Issue = require('../models/Issue');
const NGO = require('../models/NGO');
const NgoDocument = require('../models/NgoDocument');
const User = require('../models/User');

exports.getMyNGOProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'authority') {
            return res.status(403).json({ error: "Only NGOs/Authorities can have an NGO profile." });
        }

        let ngo = await NGO.findOne({ email: user.email });

        if (!ngo) {
            ngo = new NGO({
                name: user.name || 'My NGO',
                email: user.email,
                specialization: 'General Civic Action',
                location: { latitude: 0, longitude: 0, address: user.location || 'HQ' },
                isVerified: false
            });
            await ngo.save();
        }

        const activeMissions = await Issue.find({ ngoId: ngo._id, status: 'In Progress' }).sort({ createdAt: -1 });
        const resolutionHistory = await Issue.find({ ngoId: ngo._id, status: 'Resolved' }).sort({ updatedAt: -1 });
        const documents = await NgoDocument.find({ ngoId: ngo._id });

        const aiInsights = [
            `Performance analysis indicates an average response time of ${(ngo.averageResponseTime || 1.8).toFixed(1)} hours.`,
            `${activeMissions.length} squads currently tracking active containment vectors.`,
            `Historical resolution success rate maintained safely above minimum thresholds.`
        ];

        res.json({
            profile: ngo,
            activeMissions,
            resolutionHistory,
            documents,
            aiInsights
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load NGO profile." });
    }
};

// Helper to simulate AI Keyword Detection
const detectEmergencyKeywords = (text) => {
    const keywords = ['gas leak', 'chemical spill', 'chemical leak', 'flood', 'fire hazard', 'explosion', 'toxic', 'collapsed structure'];
    const lower = text.toLowerCase();
    for (let k of keywords) {
        if (lower.includes(k)) return true;
    }
    return false;
};

// Simulated AI Summarization logic
const summarizeChatHeuristic = (messages) => {
    if (!messages || messages.length === 0) return "No messages to summarize yet.";
    // Mock summarization: we extract keywords or just provide a template placeholder based on recent text
    let summary = "AI Summary: Based on recent coordination, ";

    let isDispatched = messages.some(m => m.text.toLowerCase().includes('dispatch') || m.text.toLowerCase().includes('en route') || m.text.toLowerCase().includes('on site') || m.text.toLowerCase().includes('arrived'));
    let isConfirmed = messages.some(m => m.text.toLowerCase().includes('confirm') || m.text.toLowerCase().includes('verified'));

    if (isConfirmed && isDispatched) {
        summary += "multiple parties have confirmed the situation and teams are currently on-site attempting resolution.";
    } else if (isDispatched) {
        summary += "teams have been dispatched and are awaiting site verification.";
    } else if (isConfirmed) {
        summary += "the issue has been verified but active teams are not fully deployed yet.";
    } else {
        summary += "authorities and NGOs are actively discussing next steps and preliminary details.";
    }

    // append latest 2 active entities
    const activeEntities = [...new Set(messages.map(m => m.senderName))].slice(-2);
    if (activeEntities.length > 0) {
        summary += ` Leading coordination involves: ${activeEntities.join(', ')}.`;
    }

    return summary;
};

exports.sendMessage = async (req, res) => {
    try {
        const { senderId, senderName, senderRole, text, attachments = [], priority = 'Normal', issueId = null } = req.body;

        // 1. Detect Keywords
        const isEmergency = detectEmergencyKeywords(text);
        let finalPriority = priority;
        let aiSystemAlert = null;

        if (isEmergency) {
            finalPriority = 'Emergency';
            aiSystemAlert = {
                type: 'SYSTEM_ALERT',
                title: 'CRITICAL HAZARD DETECTED',
                message: `AI intercepted emergency keywords in comms regarding ${issueId || 'Global Network'}: "${text}"`
            };
        }

        const msgRecord = new Message({
            senderId, senderName, senderRole, text, attachments, priority: finalPriority, issueId
        });

        const savedMsg = await msgRecord.save();

        // 2. Broadcast
        if (req.app.locals.io) {
            const io = req.app.locals.io;
            // if issueId is present, broadcast to that room. else global
            const room = issueId ? `issue_${issueId}` : 'global_ngo_network';

            io.to(room).emit('chat_message', savedMsg);

            // 3. Emit system wide alert to authority namespace if emergency
            if (aiSystemAlert) {
                // We'll emit globally so the UI catches it regardless of room
                io.emit('system_alert', aiSystemAlert);
            }
        }

        res.status(201).json(savedMsg);
    } catch (err) {
        res.status(500).json({ error: "Failed to send message", details: err.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const msgs = await Message.find({ issueId: null }).sort({ createdAt: 1 });
        res.json(msgs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch global messages" });
    }
}

exports.getMessagesByIssue = async (req, res) => {
    try {
        const msgs = await Message.find({ issueId: req.params.issueId }).sort({ createdAt: 1 });
        res.json(msgs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch issue messages" });
    }
}

exports.getDirectory = async (req, res) => {
    try {
        const ngos = await NGO.find().sort({ rating: -1, totalIssuesHandled: -1 });
        res.json(ngos);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch directory" });
    }
}

exports.smartTeamFormation = async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.issueId);
        if (!issue) return res.status(404).json({ error: "Issue not found" });

        // Heuristic mapping: "Waste Management" + "Water Quality" etc.
        let requiredSpecializations = [issue.category];
        if (issue.title.toLowerCase().includes('water') || issue.description.toLowerCase().includes('water')) {
            requiredSpecializations.push('Water Quality');
            requiredSpecializations.push('Contamination Control');
        }

        // Fetch top NGOs matching any of these specializations
        const recommended = await NGO.find({
            specialization: {
                $in: requiredSpecializations.map(s => {
                    // Soft matching (Regex) for mock DB safety
                    return new RegExp(s, 'i')
                })
            }
        }).sort({ rating: -1 }).limit(2);

        res.json({
            issueId: issue._id,
            recommendationReason: `Based on the ${issue.category} requirement and context clues in the description, AI recommends a joint task force specializing in ${requiredSpecializations.join(' and ')}.`,
            recommendedNGOs: recommended
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate AI team formation" });
    }
}

exports.getChatSummary = async (req, res) => {
    try {
        const msgs = await Message.find({ issueId: req.params.issueId }).sort({ createdAt: 1 });
        const summary = summarizeChatHeuristic(msgs);
        res.json({ summary });
    } catch (err) {
        res.status(500).json({ error: "Failed to summarize chat" });
    }
}

exports.getNGOProfile = async (req, res) => {
    try {
        const ngo = await NGO.findById(req.params.ngoId);
        if (!ngo) return res.status(404).json({ error: "NGO not found" });

        // Fetch active missions (issues assigned to this NGO with status 'In Progress')
        const activeMissions = await Issue.find({ ngoId: ngo._id, status: 'In Progress' }).sort({ createdAt: -1 });

        // Fetch resolution history (issues assigned to this NGO with status 'Resolved')
        const resolutionHistory = await Issue.find({ ngoId: ngo._id, status: 'Resolved' }).sort({ updatedAt: -1 });

        // Fetch Documents
        const documents = await NgoDocument.find({ ngoId: ngo._id });

        // Mock AI Insights based on heuristic data
        const speedInsight = ngo.averageResponseTime < 2 ? "resolves issues highly efficiently, faster than average." : "maintains steady response times.";
        const aiInsights = [
            `${ngo.name} ${speedInsight}`,
            "Most incidents handled in the primary operating district.",
            `Demonstrates high success rate handling ${ngo.specialization} cases.`
        ];

        res.json({
            profile: ngo,
            activeMissions,
            resolutionHistory,
            documents,
            aiInsights
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch NGO profile" });
    }
}

exports.updateNGOProfile = async (req, res) => {
    try {
        const ngoId = req.params.ngoId;

        const updatableFields = [
            'name', 'missionStatement', 'foundedYear', 'specialization',
            'areasOfExpertise', 'extendedExpertise', 'directorName',
            'emergencyContact', 'headquarters', 'email', 'website', 'logo', 'operatingStatus', 'operationalRegions'
        ];

        let updateData = {};
        for (let field of updatableFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        if (typeof updateData.extendedExpertise === 'string') {
            updateData.extendedExpertise = updateData.extendedExpertise.split(',').map(s => s.trim()).filter(s => s);
        }
        if (typeof updateData.areasOfExpertise === 'string') {
            updateData.areasOfExpertise = updateData.areasOfExpertise.split(',').map(s => s.trim()).filter(s => s);
        }
        if (typeof updateData.operationalRegions === 'string') {
            updateData.operationalRegions = updateData.operationalRegions.split(',').map(s => s.trim()).filter(s => s);
        }

        const updatedNgo = await NGO.findByIdAndUpdate(ngoId, updateData, { new: true });

        if (!updatedNgo) return res.status(404).json({ error: "NGO not found" });

        res.json({ message: "Profile updated successfully", profile: updatedNgo });

    } catch (err) {
        res.status(500).json({ error: "Failed to update NGO profile" });
    }
}
