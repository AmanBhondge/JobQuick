const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const Job = require("../model/job");
const Category = require("../model/category");
const HostUser = require("../model/host-user");
const checkAuth = require("../middleware/check-auth");
const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/profilepic");
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

//Filter Section
router.get("/filter", checkAuth, async (req, res) => {
    try {
        let filter = {};

        if (req.query.categories && req.query.categories.trim() !== "") {
            const categoryTitles = req.query.categories.split(",").map(title => title.trim().toLowerCase());

            const categories = await Category.find({
                title: { $in: categoryTitles.map(title => new RegExp(`^${title}$`, "i")) }
            });

            if (categories.length > 0) {
                filter.category = { $in: categories.map(cat => cat._id) };
            }
        }

        if (req.query.title && req.query.title.trim() !== "") {
            filter.title = { $regex: new RegExp(req.query.title.trim(), "i") };
        }
        if (req.query.jobType && req.query.jobType.trim() !== "") {
            filter.jobType = { $regex: new RegExp(req.query.jobType.trim(), "i") };
        }
        if (req.query.workType && req.query.workType.trim() !== "") {
            filter.workType = { $regex: new RegExp(req.query.workType.trim(), "i") };
        }
        if (req.query.experience && req.query.experience.trim() !== "") {
            filter.experience = { $regex: new RegExp(req.query.experience.trim(), "i") };
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const jobList = await Job.find(filter)
            .populate("category", "title")
            .populate("createdBy", "fullName email")
            .skip(skip)
            .limit(limit);

        const totalJobs = await Job.countDocuments(filter);

        res.status(200).json({
            success: true,
            jobs: jobList,
            pagination: {
                total: totalJobs,
                page: page,
                limit: limit,
                totalPages: Math.ceil(totalJobs / limit)
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET jobs by createdBy (User ID)
router.get("/createdby/:creatorId", checkAuth, async (req, res) => {
    try {
        const { creatorId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(creatorId)) {
            return res.status(400).json({ success: false, message: "Invalid creatorId" });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const jobs = await Job.find({ createdBy: creatorId })
            .populate("category", "title")
            .populate("createdBy", "fullName email")
            .skip(skip)
            .limit(limit);

        const totalJobs = await Job.countDocuments({ createdBy: creatorId });

        res.status(200).json({
            success: true,
            jobs,
            pagination: {
                total: totalJobs,
                page,
                limit,
                totalPages: Math.ceil(totalJobs / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

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

router.post("/", checkAuth, upload.single("profileImg"), async (req, res) => {
    try {
        const { companyName, companyEmail, companyURL, fullName, phoneNo, numOfEmployee, title, jobType, location, workType, minEducation, experience, interviewType, companyDescription, jobDescription, noOfOpeaning, minPackage, maxPackage, categoryTitle, createdBy, skills } = req.body;

        if (!companyName || !companyEmail || !companyURL || !fullName || !phoneNo || !title || !jobType || !location || !workType || !minEducation || !experience || !interviewType || !companyDescription || !jobDescription || !noOfOpeaning || !minPackage || !maxPackage || !categoryTitle || !createdBy || !skills) {
            return res.status(400).json({ success: false, message: "All fields are required!" });
        }

        if (!mongoose.isValidObjectId(createdBy)) {
            return res.status(400).json({ success: false, message: "Invalid CreatedBy ID" });
        }

        const skillArray = Array.isArray(skills) ? skills : skills.split(",").map(s => s.trim());
        if (skillArray.length === 0) {
            return res.status(400).json({ success: false, message: "At least one skill is required" });
        }

        const categoryExists = await Category.findOne({ title: categoryTitle });
        if (!categoryExists) return res.status(400).json({ success: false, message: "Category not found" });

        const hostUser = await HostUser.findById(createdBy);
        if (!hostUser) return res.status(400).json({ success: false, message: "Host user not found" });

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
            profileImg: req.file ? `${req.protocol}://${req.get('host')}/public/profilepic/${req.file.filename}` : "",
        });

        const savedJob = await job.save();
        res.status(201).json({ success: true, message: "Job created successfully", job: savedJob });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete("/:id", checkAuth, async (req, res) => {
    try {
        const jobId = req.params.id;

        if (!mongoose.isValidObjectId(jobId)) {
            return res.status(400).json({ success: false, message: "Invalid Job ID format" });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found!" });
        }

        // ✅ Delete profile image if it exists
        if (job.profileImg) {
            const imagePath = path.join(__dirname, '..', 'public', 'profilepic', path.basename(job.profileImg));
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Applicant.deleteMany({ jobId });

        await Job.findByIdAndDelete(jobId);

        res.status(200).json({ success: true, message: "Job and related applicants deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;