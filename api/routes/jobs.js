const Job = require("../model/job");
const Category = require("../model/category");
const HostUser = require("../model/host-user");
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

// Multer storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/profilepic");
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// Get all jobs
router.get("/", async (req, res) => {
    try {
        let filter = {};
        if (req.query.categories) {
            filter = { category: req.query.categories.split(",") };
        }

        const jobList = await Job.find(filter).populate("category").populate("createdBy");
        res.send(jobList);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get a job by ID
router.get("/:id", checkAuth, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid Job ID format" });
        }

        const job = await Job.findById(req.params.id).populate("category").populate("createdBy");

        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found!" });
        }

        res.send(job);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create a new job with image upload
// POST Request to Create a Job
router.post("/",checkAuth, upload.single("profileImg"), async (req, res) => {
    try {
        // Validate category title
        if (!req.body.categoryTitle) {
            return res.status(400).json({ success: false, message: "Missing Category Title" });
        }

        // Validate createdBy ID
        if (!req.body.createdBy || !mongoose.isValidObjectId(req.body.createdBy)) {
            return res.status(400).json({ success: false, message: "Invalid or missing CreatedBy ID" });
        }

        // Fetch category by title
        const category = await Category.findOne({ title: req.body.categoryTitle });
        if (!category) return res.status(400).json({ success: false, message: "Category not found" });

        // Fetch hostUser
        const hostUser = await HostUser.findById(req.body.createdBy);
        if (!hostUser) return res.status(400).json({ success: false, message: "HostUser not found" });

        // Create new job
        const job = new Job({
            _id: new mongoose.Types.ObjectId(),
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
            category: category._id, // Use the fetched category's ID
            createdBy: req.body.createdBy,
            profileImg: req.file ? `/public/profilepic/${req.file.filename}` : "",
        });

        // Save job in the database
        const savedJob = await job.save();
        res.status(201).json({ success: true, message: "Job created successfully", job: savedJob });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Update a job with image upload
router.put("/:id", checkAuth, upload.single("profileImg"), async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).send("Invalid Job ID");
        }

        const existingJob = await Job.findById(req.params.id);
        if (!existingJob) {
            return res.status(404).send("Job not found!");
        }

        if (req.body.category && !mongoose.isValidObjectId(req.body.category)) {
            return res.status(400).send("Invalid Category ID");
        }

        if (req.body.createdBy && !mongoose.isValidObjectId(req.body.createdBy)) {
            return res.status(400).send("Invalid CreatedBy ID");
        }

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
                createdBy: req.body.createdBy || existingJob.createdBy,
                profileImg: req.file ? `/public/profilepic/${req.file.filename}` : existingJob.profileImg,
            },
            { new: true }
        );

        res.send(job);
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});

// Delete a job
router.delete("/:id", checkAuth, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).send("Invalid Job ID");
        }

        const job = await Job.findByIdAndDelete(req.params.id);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found!" });
        }

        res.status(200).json({ success: true, message: "The Job is deleted!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
