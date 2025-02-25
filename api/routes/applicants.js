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

// Filter Applicants
router.get('/', checkAuth, async (req, res) => {
    try {
        let filter = {};
        const { jobId, applicantId, shortListed, page = 1, limit = 10 } = req.query; 

        if (jobId && mongoose.Types.ObjectId.isValid(jobId)) {
            filter.jobId = jobId;
        }

        if (applicantId && mongoose.Types.ObjectId.isValid(applicantId)) {
            filter.applicantId = applicantId;
        }

        if (shortListed !== undefined) {
            filter.shortListed = shortListed === 'true'; 
        }

        const totalCount = await Applicant.countDocuments(filter);
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;

        const applicants = await Applicant.find(filter)
            .populate('jobId')
            .populate('applicantId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            applicants,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: totalCount,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

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

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid Job ID format." 
            });
        }

        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);

        const applicants = await Applicant.aggregate([
            {
                $match: {
                    jobId: new mongoose.Types.ObjectId(jobId),
                    dateApplied: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$dateApplied" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        const result = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(endDate);
            date.setDate(date.getDate() - (6 - i));
            const dateStr = date.toISOString().split('T')[0];
            
            const dayData = applicants.find(a => a._id === dateStr);
            
            result.push({
                date: dateStr,
                day: date.toLocaleDateString('en-US', { weekday: 'long' }),
                applicants: dayData ? dayData.count : 0
            });
        }

        const totalApplicants = result.reduce((sum, day) => sum + day.applicants, 0);

        const dailyAverage = totalApplicants / 7;

        const highestDay = result.reduce((max, day) => 
            day.applicants > max.applicants ? day : max
        );

        const lowestDay = result.reduce((min, day) => 
            day.applicants < min.applicants ? day : min
        );

        res.status(200).json({
            success: true,
            jobId,
            data: result,
            statistics: {
                totalApplicants,
                dailyAverage: Math.round(dailyAverage * 100) / 100,
                highestDay: {
                    day: highestDay.day,
                    date: highestDay.date,
                    count: highestDay.applicants
                },
                lowestDay: {
                    day: lowestDay.day,
                    date: lowestDay.date,
                    count: lowestDay.applicants
                }
            }
        });

    } catch (error) {
        console.error("Error fetching graph data:", error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
});
//checks applied or not
router.get('/check', async (req, res) => {
    try {
        const { jobId, applicantId } = req.query;

        if (!mongoose.Types.ObjectId.isValid(jobId) || !mongoose.Types.ObjectId.isValid(applicantId)) {
            return res.status(400).json({ message: 'Invalid jobId or applicantId' });
        }

        const existingApplication = await Applicant.findOne({ jobId, applicantId });

        res.status(200).json({ applied: !!existingApplication });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
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