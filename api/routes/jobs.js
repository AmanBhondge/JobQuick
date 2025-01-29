const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const Job = require("../model/job");
const Category = require("../model/category");
const HostUser = require("../model/host-user");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

// Multer Storage Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/profilepic");
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// ✅ Get All Jobs
router.get("/", checkAuth, async (req, res) => {
    try {
        let filter = {};

        // 🔹 Normalize and Match Category (Supports multiple categories)
        if (req.query.categories && req.query.categories.trim() !== "") {
            const categoryTitles = req.query.categories.split(",").map(title => 
                title.replace(/\s+/g, "").toLowerCase() // Remove spaces & lowercase
            );

            const categories = await Category.find({
                title: { 
                    $in: categoryTitles.map(title => new RegExp(`^${title}$`, "i")) 
                }
            });

            if (categories.length > 0) {
                filter.category = { $in: categories.map(cat => cat._id) };
            }
        }

        // 🔹 Normalize and Match Job Title
        if (req.query.title && req.query.title.trim() !== "") {
            const normalizedTitle = req.query.title.replace(/\s+/g, "").toLowerCase();
            filter.title = { $regex: new RegExp(normalizedTitle, "i") };
        }

        // 🔹 Normalize and Match Job Type
        if (req.query.jobType && req.query.jobType.trim() !== "") {
            const normalizedJobType = req.query.jobType.replace(/\s+/g, "").toLowerCase();
            filter.jobType = { $regex: new RegExp(normalizedJobType, "i") };
        }

        // 🔹 Normalize and Match Work Type
        if (req.query.workType && req.query.workType.trim() !== "") {
            const normalizedWorkType = req.query.workType.replace(/\s+/g, "").toLowerCase();
            filter.workType = { $regex: new RegExp(normalizedWorkType, "i") };
        }

        // 🔹 Normalize and Match Experience
        if (req.query.experience && req.query.experience.trim() !== "") {
            const normalizedExperience = req.query.experience.replace(/\s+/g, "").toLowerCase();
            filter.experience = { $regex: new RegExp(normalizedExperience, "i") };
        }

        // 🔹 Fetch Jobs with Filters Applied
        const jobList = await Job.find(filter)
            .populate("category", "title")
            .populate("createdBy", "fullName email");

        res.status(200).json({ success: true, jobs: jobList });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ Get Job by ID
router.get("/:id", checkAuth, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid Job ID format" });
        }

        const job = await Job.findById(req.params.id)
            .populate("category", "title")
            .populate("createdBy", "fullName email");

        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found!" });
        }

        res.status(200).json(job);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ Create a New Job
router.post("/", checkAuth, upload.single("profileImg"), async (req, res) => {
    try {
        const { companyName, companyEmail, companyURL, fullName, phoneNo, numOfEmployee, title, jobType, location, workType, minEducation, experience, interviewType, companyDescription, jobDescription, noOfOpeaning, minPackage, maxPackage, categoryTitle, createdBy, skills } = req.body;

        // 🔹 Validate required fields
        if (!companyName || !companyEmail || !companyURL || !fullName || !phoneNo || !title || !jobType || !location || !workType || !minEducation || !experience || !interviewType || !companyDescription || !jobDescription || !noOfOpeaning || !minPackage || !maxPackage || !categoryTitle || !createdBy || !skills) {
            return res.status(400).json({ success: false, message: "All fields are required!" });
        }

        if (!mongoose.isValidObjectId(createdBy)) {
            return res.status(400).json({ success: false, message: "Invalid CreatedBy ID" });
        }

        // 🔹 Validate skills (ensure it's an array)
        const skillArray = Array.isArray(skills) ? skills : skills.split(",").map(s => s.trim());
        if (skillArray.length === 0) {
            return res.status(400).json({ success: false, message: "At least one skill is required" });
        }

        // 🔹 Find Category by Title
        const categoryExists = await Category.findOne({ title: categoryTitle });
        if (!categoryExists) return res.status(400).json({ success: false, message: "Category not found" });

        // 🔹 Validate host user existence
        const hostUser = await HostUser.findById(createdBy);
        if (!hostUser) return res.status(400).json({ success: false, message: "Host user not found" });

        // 🔹 Prepare job data
        const job = new Job({
            _id: new mongoose.Types.ObjectId(),
            companyName,
            companyEmail,
            companyURL,
            fullName,
            phoneNo,
            numOfEmployee,
            title,
            jobType,
            location,
            workType,
            minEducation,
            experience,
            interviewType,
            companyDescription,
            jobDescription,
            noOfOpeaning,
            minPackage,
            maxPackage,
            category: categoryExists._id,
            createdBy,
            skills: skillArray,
            profileImg: req.file ? `/public/profilepic/${req.file.filename}` : "",
        });

        // Save Job
        const savedJob = await job.save();
        res.status(201).json({ success: true, message: "Job created successfully", job: savedJob });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ✅ Update a Job
router.put("/:id", checkAuth, upload.single("profileImg"), async (req, res) => {
    try {
        const jobId = req.params.id;

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: "Invalid Job ID format" });
        }

        let job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found!" });
        }

        // 🔹 Prepare updated job data
        const updatedData = {
            companyName: req.body.companyName || job.companyName,
            companyEmail: req.body.companyEmail || job.companyEmail,
            companyURL: req.body.companyURL || job.companyURL,
            fullName: req.body.fullName || job.fullName,
            phoneNo: req.body.phoneNo || job.phoneNo,
            numOfEmployee: req.body.numOfEmployee || job.numOfEmployee,
            title: req.body.title || job.title,
            jobType: req.body.jobType || job.jobType,
            location: req.body.location || job.location,
            workType: req.body.workType || job.workType,
            minEducation: req.body.minEducation || job.minEducation,
            experience: req.body.experience || job.experience,
            interviewType: req.body.interviewType || job.interviewType,
            companyDescription: req.body.companyDescription || job.companyDescription,
            jobDescription: req.body.jobDescription || job.jobDescription,
            noOfOpeaning: req.body.noOfOpeaning || job.noOfOpeaning,
            minPackage: req.body.minPackage || job.minPackage,
            maxPackage: req.body.maxPackage || job.maxPackage,
            category: req.body.category || job.category,
            skills: req.body.skills ? (Array.isArray(req.body.skills) ? req.body.skills : req.body.skills.split(",").map(s => s.trim())) : job.skills,
            profileImg: req.file ? `/public/profilepic/${req.file.filename}` : job.profileImg,
        };

        // 🔹 Update the job
        job = await Job.findByIdAndUpdate(jobId, updatedData, { new: true });

        res.status(200).json({ success: true, message: "Job updated successfully", job });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ Delete a Job
router.delete("/:id", checkAuth, async (req, res) => {
    try {
        const jobId = req.params.id;

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: "Invalid Job ID format" });
        }

        const job = await Job.findByIdAndDelete(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found!" });
        }

        res.status(200).json({ success: true, message: "Job deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
