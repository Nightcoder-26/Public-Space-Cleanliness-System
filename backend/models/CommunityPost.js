const mongoose = require('mongoose');

const CommunityPostSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    postType: {
        type: String,
        enum: ['issue', 'success', 'event', 'update'],
        default: 'update'
    },
    category: {
        type: String,
        enum: ['Success Story', 'Civic Update', 'Environmental Action', 'Community Event', 'Issue Report'],
        default: 'Civic Update'
    },
    title: { type: String, default: '' },
    description: { type: String, required: true },
    imageUrl: { type: String, default: null },
    location: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    commentCount: { type: Number, default: 0 },
    // AI fields
    aiLabel: { type: String, default: '' },
    aiSummary: { type: String, default: '' },
    flagged: { type: Boolean, default: false },
    // Link to source issue if auto-generated
    sourceIssueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null }
}, { timestamps: true });

module.exports = mongoose.model('CommunityPost', CommunityPostSchema);
