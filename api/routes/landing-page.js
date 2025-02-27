const express = require('express');
const router = express.Router();
const Feedback = require('../model/feedback');
const Job = require('../model/job');
const TopCompany = require('../model/top-company');
const Category = require('../model/category');
const mongoose = require('mongoose');
const checkAuth = require('../middleware/check-auth');

router.get('/', checkAuth, async (req, res) => {
    try {
        const feedbackList = await Feedback.find();
        const jobList = await Job.find()
            .sort({ dateCreated: -1 })
            .limit(10)
            .select('title companyName category jobType experience location dateCreated');

        const topcompanyList = await TopCompany.find();

        const categories = await Category.find();
        const categoryList = await Promise.all(categories.map(async (category) => {
            const jobCount = await Job.countDocuments({ category: category._id });
            return {
                ...category._doc,  
                jobCount           
            };
        }));

        res.status(200).json({ 
            success: true, 
            data: {
                feedbackList, 
                jobList, 
                topcompanyList, 
                categoryList
            } 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


module.exports = router;