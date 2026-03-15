const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    action: { type: String, required: true },
    user: { type: String, required: true },
    targetId: { type: String, default: null }, // e.g. Case ID, NGO ID
    details: { type: Object, default: {} },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
