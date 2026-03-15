const mongoose = require('mongoose');

const NgoDocumentSchema = new mongoose.Schema({
    ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('NgoDocument', NgoDocumentSchema);
