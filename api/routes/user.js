require('dotenv').config();
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../model/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const checkAuth = require('../middleware/check-auth')

const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
};

const uploadDir = 'public/profilepic';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
0
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = isValid ? null : new Error('Invalid image type');
        cb(uploadError, uploadDir);
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`);
    }
});

const uploadOptions = multer({ storage: storage });

const CounterSchema = mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', CounterSchema);

async function generateUniqueId() {
    const counter = await Counter.findOneAndUpdate(
        { _id: 'userId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return `WI${counter.seq}`;
}

router.get('/all', async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', checkAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).select('-password'); 

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/signup', uploadOptions.single('image'), async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email });

        if (existingUser) {
            return res.status(409).json({ message: 'Email not available' });
        }

        const hash = await bcrypt.hash(req.body.password, 10);
        const uniqueId = await generateUniqueId();

        let profileImg = '';
        if (req.file) {
            const fileName = req.file.filename;
            const basePath = `${req.protocol}://${req.get('host')}/public/profilepic/`;
            profileImg = `${basePath}${fileName}`;
        }

        const user = new User({
            _id: new mongoose.Types.ObjectId(),
            userId: uniqueId,
            password: hash,
            name: req.body.name,
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
            dateOfBirth: req.body.dateOfBirth,
            gender: req.body.gender,
            address: req.body.address,
            city: req.body.city,
            state: req.body.state,
            country: req.body.country,
            pincode: req.body.pincode,
            profileImg: profileImg,
            higestEducation: req.body.higestEducation,
            skills: req.body.skills,
            workExperience: req.body.workExperience,
            role: req.body.role,
        });

        const result = await user.save();
        res.status(200).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ LOGIN
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(401).json({ message: 'User does not exist' });
        }

        const isPasswordValid = await bcrypt.compare(req.body.password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign(
            { email: user.email, userId: user.userId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            // email: user.email,
            // userId: user.userId,
            _id: user._id,
            token: token,
            // name: user.name,
            // phoneNumber: user.phoneNumber,
            // dateOfBirth: user.dateOfBirth,
            // gender: user.gender,
            // address: user.address,
            // profileImg: user.profileImg,
            // city: user.city,
            // state: user.state,
            // country: user.country,
            // pincode: user.pincode,
            // pinhigestEducationcode: user.higestEducation,
            // skills: user.skills,
            // workExperience: user.workExperience,
            // role: user.role,
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/update/:id', uploadOptions.single('image'), checkAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        const existingUser = await User.findById(userId);

        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        let updatedFields = {
            name: req.body.name || existingUser.name,
            email: req.body.email || existingUser.email,
            phoneNumber: req.body.phoneNumber || existingUser.phoneNumber,
            dateOfBirth: req.body.dateOfBirth || existingUser.dateOfBirth,
            gender: req.body.gender || existingUser.gender,
            address: req.body.address || existingUser.address,
            city: req.body.city || existingUser.city,
            state: req.body.state || existingUser.state,
            country: req.body.country || existingUser.country,
            pincode: req.body.pincode || existingUser.pincode,
            higestEducation: req.body.higestEducation || existingUser.higestEducation,
            skills: req.body.skills || existingUser.skills,
            workExperience: req.body.workExperience || existingUser.workExperience,
            role: req.body.role || existingUser.role,
        };


        if (req.file) {
            const fileName = req.file.filename;
            const basePath = `${req.protocol}://${req.get('host')}/public/profilepic/`;
            updatedFields.profileImg = `${basePath}${fileName}`;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, { new: true });

        res.status(200).json({ message: 'User updated successfully', user: updatedUser });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.delete('/delete/:id', checkAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }


        if (user.profileImg) {
            const filePath = `public/profilepic/${user.profileImg.split('/').pop()}`;
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await User.findByIdAndDelete(userId);
        res.status(200).json({ message: 'User deleted successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
