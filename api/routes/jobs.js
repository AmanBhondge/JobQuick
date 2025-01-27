const { Job } = require('../model/job');
const express = require('express');
const { Category } = require('../model/category');
const { HostUser } = require('../model/host-user');
const router = express.Router();
const mongoose = require('mongoose');
const checkAuth = require('../middleware/check-auth');

// Get all jobs with full user object in createdBy
router.get(`/`, async (req, res) => {
    try {
        let filter = {};
        if (req.query.categories) {
            filter = { category: req.query.categories.split(',') };
        }

        const jobList = await Job.find(filter)
            .populate('category')
            .populate('createdBy');
        
        res.send(jobList);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get a job by ID with full user object in createdBy
router.get(`/:id`,checkAuth, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate('category')
            .populate('createdBy');
        
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found!' });
        }
        res.send(job);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create a new job
router.post(`/`,checkAuth, async (req, res) => {
    try {
        const category = await Category.findById(req.body.category);
        if (!category) return res.status(400).send('Invalid Category');

        const hostUser = await HostUser.findById(req.body.createdBy);
        if (!hostUser) return res.status(400).send('Invalid HostUser');

        let job = new Job({
            companyName: req.body.companyName,
            fullName: req.body.fullName,
            phoneNo: req.body.phoneNo,
            numOfEmployee: req.body.numOfEmployee,
            title: req.body.title,
            jobType: req.body.jobType,
            location: req.body.location,
            workType: req.body.workType,
            minEducation: req.body.minEducation,
            experience: req.body.experience,
            interviewType: req.body.interviewType,
            description: req.body.description,
            noOfOpeaning: req.body.noOfOpeaning,
            minPackage: req.body.minPackage,
            maxPackage: req.body.maxPackage,
            category: req.body.category,
            createdBy: req.body.createdBy
        });

        job = await job.save();
        res.send(job);
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});

// Update a job
router.put('/:id',checkAuth, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).send('Invalid Job Id');
        }

        const existingJob = await Job.findById(req.params.id);
        if (!existingJob) {
            return res.status(404).send('Job not found!');
        }

        const category = await Category.findById(req.body.category);
        if (!category) return res.status(400).send('Invalid Category');

        const hostUser = await HostUser.findById(req.body.createdBy);
        if (!hostUser) return res.status(400).send('Invalid HostUser');

        const job = await Job.findByIdAndUpdate(
            req.params.id,
            {
                companyName: req.body.companyName || existingJob.companyName,
                fullName: req.body.fullName || existingJob.fullName,
                phoneNo: req.body.phoneNo || existingJob.phoneNo,
                numOfEmployee: req.body.numOfEmployee || existingJob.numOfEmployee,
                title: req.body.title || existingJob.title,
                jobType: req.body.jobType || existingJob.jobType,
                location: req.body.location || existingJob.location,
                workType: req.body.workType || existingJob.workType,
                minEducation: req.body.minEducation || existingJob.minEducation,
                experience: req.body.experience || existingJob.experience,
                interviewType: req.body.interviewType || existingJob.interviewType,
                description: req.body.description || existingJob.description,
                noOfOpeaning: req.body.noOfOpeaning || existingJob.noOfOpeaning,
                minPackage: req.body.minPackage || existingJob.minPackage,
                maxPackage: req.body.maxPackage || existingJob.maxPackage,
                category: req.body.category || existingJob.category,
                createdBy: req.body.createdBy || existingJob.createdBy
            },
            { new: true }
        );

        res.send(job);
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});

// Delete a job
router.delete('/:id',checkAuth, async (req, res) => {
    try {
        const job = await Job.findByIdAndDelete(req.params.id);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found!" });
        }
        res.status(200).json({ success: true, message: 'The Job is deleted!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
