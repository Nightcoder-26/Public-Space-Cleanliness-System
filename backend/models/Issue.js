const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
        type: String,
        required: true,
        enum: [
            'Garbage Dump',
            'Water Leakage',
            'Illegal Dumping',
            'Air Pollution',
            'Road Damage',
            'Tree Cutting',
            'Public Safety',
            'Other Environmental Issues',
            'General Maintenance'
        ],
        default: 'General Maintenance'
    },
    location: { type: String, required: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Low'
    },
    status: {
        type: String,
        default: 'Submitted',
        enum: ['Submitted', 'AI Verified', 'Sent to Authority', 'In Progress', 'Resolved']
    },
    imageUrl: { type: String, default: null },
    dateTime: { type: Date, default: Date.now },
    dateReported: { type: Date, default: Date.now },
    resolvedDate: { type: Date, default: null },
    // AI Verification
    aiVerified: { type: Boolean, default: false },
    aiConfidence: { type: Number, default: 0 },
    aiIssueType: { type: String, default: '' },
    aiNotes: { type: String, default: '' },
    // Authority assignment
    assignedAuthority: { type: String, default: '' },
    ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', default: null },
    priorityScore: { type: Number, default: 0 },
    priorityLevel: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low', 'Standard'],
        default: 'Low'
    },
    assignmentReason: { type: String, default: '' },
    resolutionProofImages: [{ type: String }],
    responseSpeedScore: { type: Number, default: 0 },
    impactScore: { type: Number, default: 0 },
    verificationAccuracyScore: { type: Number, default: 0 },
    // Gamification
    pointsAwarded: { type: Number, default: 0 },
    upvotes: { type: Number, default: 0 }
}, { timestamps: true });

// --- Performance Indexes ---
// Speed up per-user issue queries (citizen dashboard)
IssueSchema.index({ userId: 1, dateReported: -1 });
// Speed up authority/status-based filtering
IssueSchema.index({ status: 1, dateReported: -1 });
// Speed up geo-proximity queries (community nearby feature)
IssueSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model('Issue', IssueSchema);
