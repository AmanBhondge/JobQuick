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
    'image/jpg': 'jpg'
};

const uploadDir = 'public/profilepic';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = isValid ? null : new Error('Invalid image type');
        cb(uploadError, uploadDir);
    },
    filename: (req, file, cb) => {
        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`);
    }
});

const uploadOptions = multer({ storage: storage });

// 🔹 Get All Users (Excluding Password)
router.get('/all', async (req, res) => {
    try {
        const users = await SeekUser.find().select('-password');
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Get User by ID
router.get('/:id', checkAuth, async (req, res) => {
    try {
        const user = await SeekUser.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/signup', uploadOptions.single('image'), async (req, res) => {
    try {

        if (!req.body.email || !req.body.password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const existingUser = await SeekUser.findOne({ email: req.body.email });
        if (existingUser) return res.status(409).json({ message: 'Email already exists' });

        const hash = await bcrypt.hash(req.body.password, 10);

        let profileImg = req.file ? `${req.protocol}://${req.get('host')}/public/profilepic/${req.file.filename}` : '';

        const user = new SeekUser({
            _id: new mongoose.Types.ObjectId(),
            fullName: req.body.fullName || '',
            email: req.body.email,
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
            skills: req.body.skills || '',
            education: req.body.education || [],
            workExperience: req.body.workExperience || [],
        });

        await user.save();
        res.status(201).json({ message: 'User registered successfully' });

    } catch (err) {
        console.error('Signup Error:', err);
        res.status(500).json({ error: err.message });
    }
});


// 🔹 User Login
router.post('/login', async (req, res) => {
    try {
        const user = await SeekUser.findOne({ email: req.body.email });
        if (!user) return res.status(401).json({ message: 'User does not exist' });

        const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid password' });

        const token = jwt.sign({ email: user.email, _id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.status(200).json({ _id: user._id, token: token });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Update User
router.put('/update/:id', uploadOptions.single('image'), checkAuth, async (req, res) => {
    try {
        const existingUser = await SeekUser.findById(req.params.id);
        if (!existingUser) return res.status(404).json({ message: 'User not found' });

        let updatedFields = {
            fullName: req.body.fullName || existingUser.fullName,
            email: req.body.email || existingUser.email,
            phoneNumber: req.body.phoneNumber || existingUser.phoneNumber,
            dateOfBirth: req.body.dateOfBirth || existingUser.dateOfBirth,
            gender: req.body.gender || existingUser.gender,
            address: req.body.address || existingUser.address,
            city: req.body.city || existingUser.city,
            state: req.body.state || existingUser.state,
            country: req.body.country || existingUser.country,
            pincode: req.body.pincode || existingUser.pincode,
            skills: req.body.skills || existingUser.skills,
            education: req.body.education || existingUser.education,
            workExperience: req.body.workExperience || existingUser.workExperience,
            
        };

        if (req.file) {
            const basePath = `${req.protocol}://${req.get('host')}/public/profilepic/`;
            updatedFields.profileImg = `${basePath}${req.file.filename}`;
        }

        const updatedUser = await SeekUser.findByIdAndUpdate(req.params.id, updatedFields, { new: true });

        res.status(200).json({ message: 'User updated successfully', user: updatedUser });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Delete User
router.delete('/delete/:id', checkAuth, async (req, res) => {
    try {
        const user = await SeekUser.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.profileImg) {
            const filePath = `public/profilepic/${user.profileImg.split('/').pop()}`;
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await SeekUser.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'User deleted successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;