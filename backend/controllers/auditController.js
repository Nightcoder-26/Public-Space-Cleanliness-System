const AuditLog = require('../models/AuditLog');

exports.getLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch logs" });
    }
};

exports.createLog = async (req, res) => {
    try {
        const { action, user, targetId, details } = req.body;
        const log = new AuditLog({ action, user, targetId, details });
        await log.save();
        res.status(201).json(log);
    } catch (err) {
        res.status(500).json({ error: "Failed to save log" });
    }
};
