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
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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

// POST a new applicant with a PDF resume
router.post('/', upload.single('resume'), async (req, res) => {
    try {
        
        if (!mongoose.Types.ObjectId.isValid(req.body.jobId)) {
            return res.status(400).json({ message: 'Invalid jobId' });
        }
        if (!mongoose.Types.ObjectId.isValid(req.body.applicantId)) {
            return res.status(400).json({ message: 'Invalid applicantId' });
        }

        const applicantData = {
            jobId: req.body.jobId,
            applicantId: req.body.applicantId,
            shortListed: req.body.shortListed || false
        };

        if (req.file) {
            applicantData.resume = `/resumes/${req.file.filename}`;
        }

        const newApplicant = new Applicant(applicantData);
        await newApplicant.save();

        res.status(201).json(newApplicant);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/shortlisted/:id', async (req, res) => {
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
router.delete('/:id', checkAuth, async (req, res) => {
    try {
        const applicant = await Applicant.findById(req.params.id);
        if (!applicant) {
            return res.status(404).json({ message: 'Applicant not found' });
        }

        if (applicant.resume) {
            fs.unlinkSync(path.join(__dirname, '..', applicant.resume));
        }

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