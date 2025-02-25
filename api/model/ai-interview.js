const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: String,
    category: String,
    questionNumber: Number,
    previousQuestions: [String],
    previousAnswers: [String],
    scores: [Number],
    evaluations: [String],
    idealAnswers: [String]
});

module.exports = mongoose.model('Session', sessionSchema);