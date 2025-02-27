const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    feedback: { type: String, required: true },
    date: { type: Date, default: Date.now },
    userRole: { type: String, required: true },
    experience: { type: String}
});

module.exports = mongoose.model('Feedback', feedbackSchema);