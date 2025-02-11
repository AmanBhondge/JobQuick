const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Applicant = require('../model/applicant');
const checkAuth = require('../middleware/check-auth');

const uploadDir = 'public/resumes';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed. Please upload a PDF file.'), false);
        }
        cb(null, true);
    }
});

// GET all applicants
router.get('/',checkAuth ,  async (req, res) => {
    try {
        let filter = {};

        if (req.query.jobId && mongoose.Types.ObjectId.isValid(req.query.jobId)) {
            filter.jobId = req.query.jobId;
        }

        if (req.query.applicantId && mongoose.Types.ObjectId.isValid(req.query.applicantId)) {
            filter.applicantId = req.query.applicantId;
        }

        if (req.query.shortListed !== undefined) {
            filter.shortListed = req.query.shortListed === 'true'; 
        }

        const applicants = await Applicant.find(filter)
            .populate('jobId')
            .populate('applicantId');

        res.status(200).json(applicants);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET a single applicant by ID
router.get('/:id',checkAuth , async (req, res) => {
    try {
        const applicant = await Applicant.findById(req.params.id).populate('jobId').populate('applicantId');
        if (!applicant) {
            return res.status(404).json({ message: 'Applicant not found' });
        }
        res.status(200).json(applicant);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get("/graph/:jobId", checkAuth, async (req, res) => {
    try {
        const jobId = req.params.jobId;

        // Validate if jobId is provided
        if (!jobId) {
            return res.status(400).json({ success: false, message: "Job ID is required." });
        }

        // Get start and end of the current week (Sunday to Saturday)
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date();
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Aggregate applicants data for the specific job ID
        const applicants = await Applicant.aggregate([
            {
                $match: {
                    jobId: new mongoose.Types.ObjectId(jobId), // Filter by jobId
                    dateApplied: { $gte: startOfWeek, $lte: endOfWeek } // Filter for this week
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$dateApplied" }, // Group by day of the week (1 = Sunday, 7 = Saturday)
                    count: { $sum: 1 } // Count applicants per day
                }
            }
        ]);

        // Mapping MongoDB's dayOfWeek (1 = Sunday, ..., 7 = Saturday) to an array
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const result = Array(7).fill(0).map((_, i) => ({
            day: daysOfWeek[i],
            applicants: applicants.find(a => a._id === i + 1)?.count || 0
        }));

        res.status(200).json({ success: true, jobId, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.post('/',/*upload.single('resume'),*/ checkAuth, async (req, res) => {
    try {
        const { jobId, applicantId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: 'Invalid jobId' });
        }
        if (!mongoose.Types.ObjectId.isValid(applicantId)) {
            return res.status(400).json({ message: 'Invalid applicantId' });
        }

        const existingApplication = await Applicant.findOne({ jobId, applicantId });
        if (existingApplication) {
            return res.status(400).json({ message: 'You have already applied for this job' });
        }

        const applicantData = {
            jobId,
            applicantId,
            shortListed: req.body.shortListed || false
        };

         // if (req.file) {
        //     applicantData.resume = `/resumes/${req.file.filename}`;
        // }

        const newApplicant = new Applicant(applicantData);
        await newApplicant.save();

        res.status(201).json({ message: 'Application submitted successfully', applicant: newApplicant });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/shortlisted/:id',checkAuth , async (req, res) => {
    try {
        const { shortListed } = req.body;

        if (typeof shortListed !== 'boolean') {
            return res.status(400).json({ message: 'Invalid value for shortListed. Must be true or false.' });
        }

        const updatedApplicant = await Applicant.findByIdAndUpdate(
            req.params.id,
            { shortListed },
            { new: true }
        );

        if (!updatedApplicant) {
            return res.status(404).json({ message: 'Applicant not found' });
        }

        res.status(200).json(updatedApplicant);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE an applicant by ID
router.delete('/:id',checkAuth , async (req, res) => {
    try {
        const applicant = await Applicant.findById(req.params.id);
        if (!applicant) {
            return res.status(404).json({ message: 'Applicant not found' });
        }

        // if (applicant.resume) {
        //     fs.unlinkSync(path.join(__dirname, '..', applicant.resume));
        // }

        await Applicant.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Applicant deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Error handling middleware for multer errors
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size exceeds the 5MB limit. Please upload a smaller file.' });
        }
        res.status(400).json({ message: err.message });
    } else if (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;