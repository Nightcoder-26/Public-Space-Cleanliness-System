const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null }, // Null means global 'NGO Network'
    senderId: { type: String, required: true }, // Using generic string to support Mock/Real user IDs interchangeably
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ['Authority', 'NGO', 'Citizen'], default: 'NGO' },
    text: { type: String, required: true },
    attachments: [{
        url: String,
        type: { type: String, enum: ['image', 'document', 'video', 'location'] }
    }],
    priority: { type: String, enum: ['Normal', 'Important', 'Emergency'], default: 'Normal' },
    readBy: [{ type: String }], // Array of user/node IDs who read it
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
