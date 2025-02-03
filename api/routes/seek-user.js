require('dotenv').config();
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SeekUser = require('../model/seek-user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const checkAuth = require('../middleware/check-auth');

const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
    'application/pdf': 'pdf' // ✅ Added support for PDF files
};

// Ensure upload directories exist
const profilePicDir = 'public/profilepic';
const resumeDir = 'public/resumes';

if (!fs.existsSync(profilePicDir)) fs.mkdirSync(profilePicDir, { recursive: true });
if (!fs.existsSync(resumeDir)) fs.mkdirSync(resumeDir, { recursive: true });

// Multer Storage Configurations
const storage = (destination) =>
    multer.diskStorage({
        destination: (req, file, cb) => {
            const isValid = FILE_TYPE_MAP[file.mimetype];
            if (!isValid) return cb(new Error('Invalid file type'), false);
            cb(null, destination);
        },
        filename: (req, file, cb) => {
            const fileName = file.originalname.split(' ').join('-');
            const extension = FILE_TYPE_MAP[file.mimetype];
            cb(null, `${fileName}-${Date.now()}.${extension}`);
        }
    });

const uploadProfilePic = multer({ storage: storage(profilePicDir) });
const uploadResume = multer({ storage: storage(resumeDir) });

// ✅ Signup Route (Accepts Profile Image & Resume)
router.post('/signup', uploadProfilePic.single('profileImg'), uploadResume.single('resume'), async (req, res) => {
    try {
        if (!req.body.email || !req.body.password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const existingUser = await SeekUser.findOne({ email: req.body.email.trim().toLowerCase() });
        if (existingUser) return res.status(409).json({ message: 'Email already exists' });

        const hash = await bcrypt.hash(req.body.password, 10);
        const profileImg = req.file ? `${req.protocol}://${req.get('host')}/public/profilepic/${req.file.filename}` : '';
        const resumePath = req.file ? `${req.protocol}://${req.get('host')}/public/resumes/${req.file.filename}` : '';

        const user = new SeekUser({
            _id: new mongoose.Types.ObjectId(),
            fullName: req.body.fullName ? req.body.fullName.trim() : '',
            email: req.body.email.trim().toLowerCase(),
            password: hash,
            phoneNumber: req.body.phoneNumber || '',
            dateOfBirth: req.body.dateOfBirth || '',
            gender: req.body.gender || '',
            address: req.body.address || '',
            city: req.body.city || '',
            state: req.body.state || '',
            country: req.body.country || '',
            pincode: req.body.pincode || '',
            profileImg: profileImg,
            resume: resumePath, // ✅ Saving resume file path
            skills: req.body.skills ? (Array.isArray(req.body.skills) ? req.body.skills : req.body.skills.split(',').map(s => s.trim())) : [],
            projectUrl: req.body.projectUrl || '',
            summary: req.body.summary || '',
            eduDegree: req.body.eduDegree || '',
            eduInstitution: req.body.eduInstitution || '',
            eduSpecialisation: req.body.eduSpecialisation || '',
            eduStartYear: req.body.eduStartYear || '',
            eduEndYear: req.body.eduEndYear || '',
            expCompany: req.body.expCompany || '',
            expPosition: req.body.expPosition || '',
            expStartYear: req.body.expStartYear || '',
            expEndYear: req.body.expEndYear || '',
        });

        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user by email
        const user = await SeekUser.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Token valid for 7 days
        );

        // Exclude password from response
        const { password: _, ...userData } = user.toObject();

        res.status(200).json({
            message: 'Login successful',
            token,
            user: userData
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ✅ Update User (Supports Resume & Profile Image)
router.put('/update/:id', uploadProfilePic.single('profileImg'), uploadResume.single('resume'), checkAuth, async (req, res) => {
    try {
        const existingUser = await SeekUser.findById(req.params.id);
        if (!existingUser) return res.status(404).json({ message: 'User not found' });

        let updatedFields = {
            fullName: req.body.fullName ? req.body.fullName.trim() : existingUser.fullName,
            phoneNumber: req.body.phoneNumber || existingUser.phoneNumber,
            dateOfBirth: req.body.dateOfBirth || existingUser.dateOfBirth,
            gender: req.body.gender || existingUser.gender,
            address: req.body.address || existingUser.address,
            city: req.body.city || existingUser.city,
            state: req.body.state || existingUser.state,
            country: req.body.country || existingUser.country,
            pincode: req.body.pincode || existingUser.pincode,
            skills: req.body.skills ? (Array.isArray(req.body.skills) ? req.body.skills : req.body.skills.split(',').map(s => s.trim())) : existingUser.skills,
            projectUrl: req.body.projectUrl || existingUser.projectUrl,
            summary: req.body.summary || existingUser.summary,
            eduDegree: req.body.eduDegree || existingUser.eduDegree,
            eduInstitution: req.body.eduInstitution || existingUser.eduInstitution,
            eduSpecialisation: req.body.eduSpecialisation || existingUser.eduSpecialisation,
            eduStartYear: req.body.eduStartYear || existingUser.eduStartYear,
            eduEndYear: req.body.eduEndYear || existingUser.eduEndYear,
            expCompany: req.body.expCompany || existingUser.expCompany,
            expPosition: req.body.expPosition || existingUser.expPosition,
            expStartYear: req.body.expStartYear || existingUser.expStartYear,
            expEndYear: req.body.expEndYear || existingUser.expEndYear,
        };

        if (req.file) {
            if (req.file.mimetype === 'application/pdf') {
                updatedFields.resume = `${req.protocol}://${req.get('host')}/public/resumes/${req.file.filename}`;
            } else {
                updatedFields.profileImg = `${req.protocol}://${req.get('host')}/public/profilepic/${req.file.filename}`;
            }
        }

        const updatedUser = await SeekUser.findByIdAndUpdate(req.params.id, updatedFields, { new: true });
        res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ Delete User & Remove Files
router.delete('/delete/:id', checkAuth, async (req, res) => {
    try {
        const user = await SeekUser.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.profileImg) {
            const profileImgPath = `public/profilepic/${user.profileImg.split('/').pop()}`;
            if (fs.existsSync(profileImgPath)) fs.unlinkSync(profileImgPath);
        }

        if (user.resume) {
            const resumePath = `public/resumes/${user.resume.split('/').pop()}`;
            if (fs.existsSync(resumePath)) fs.unlinkSync(resumePath);
        }

        await SeekUser.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;