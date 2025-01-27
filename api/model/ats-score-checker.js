const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resumeFile: { type: String, required: true }, // Store uploaded PDF path
    resumeText: { type: String }, // Extracted text from PDF
    jobDescription: { type: String, required: true },
    atsScore: { type: Number, default: 0 },
    keywordsMatched: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Resume', resumeSchema);
