const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const Resume = require('../model/ats-score-checker');
const mongoose = require('mongoose');
const natural = require('natural');

const router = express.Router();

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
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'), false);
        }
        cb(null, true);
    }
});

const tokenizer = new natural.WordTokenizer();

const calculateATSScore = (resumeText, jobDescription) => {

    const resumeWords = tokenizer.tokenize(resumeText.toLowerCase());
    const jobWords = tokenizer.tokenize(jobDescription.toLowerCase());

    const stemmer = natural.PorterStemmer;
    const resumeStemmed = resumeWords.map(word => stemmer.stem(word));
    const jobStemmed = jobWords.map(word => stemmer.stem(word));

    const matchedKeywords = jobStemmed.filter(word => resumeStemmed.includes(word));
    const atsScore = jobStemmed.length > 0 ? (matchedKeywords.length / jobStemmed.length) * 100 : 0;

    return {
        atsScore: Math.round(atsScore),
        keywordsMatched: [...new Set(matchedKeywords)]
    };
};

router.post('/upload', upload.single('resume'), async (req, res) => {
    try {

        const { userId, jobDescription } = req.body;

        if (!req.file || !userId || !jobDescription) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const pdfBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(pdfBuffer);
        const resumeText = pdfData.text;

        const { atsScore, keywordsMatched } = calculateATSScore(resumeText, jobDescription);

        const resume = new Resume({
            userId,
            resumeFile: req.file.path,
            resumeText,
            jobDescription,
            atsScore,
            keywordsMatched
        });

        const savedResume = await resume.save();
        res.status(201).json(savedResume);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/score/:userId', async (req, res) => {
    try {
        const resumes = await Resume.find({ userId: req.params.userId }).sort({ createdAt: -1 });

        if (!resumes.length) {
            return res.status(404).json({ message: "No resumes found for this user" });
        }

        res.status(200).json(resumes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;