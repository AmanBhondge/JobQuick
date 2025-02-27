const express = require('express');
const router = express.Router();
const Feedback = require('../model/feedback');

router.get('/', async (req, res) => {
    try {
        const feedbackList = await Feedback.find(); 
        res.status(200).json({ success: true, data: feedbackList });
    } catch (err) { 
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const feedback = new Feedback(req.body);
        await feedback.save();
        res.status(201).json({ success: true, data: feedback });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;