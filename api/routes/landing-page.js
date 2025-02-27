const express = require('express');
const router = express.Router();
const Feedback = require('../model/feedback');
const Job = require('../model/job');
const TopCompany = require('../model/top-company');
const mongoose = require('mongoose');
const checkAuth = require('../middleware/check-auth');

router.get('/', checkAuth, async (req, res) => {
    try {
        const feedbackList = await Feedback.find();
        const jobList = await Job.find().sort({ dateCreated: -1 }).limit(10).select('title companyName category jobType experience location dateCreated');
        const topcompanyList = await TopCompany.find();

        res.status(200).json({ 
            success: true, 
            data: {
                feedbackList, 
                jobList, 
                topcompanyList 
            } 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;