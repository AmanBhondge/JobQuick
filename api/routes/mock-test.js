require("dotenv").config();
const express = require("express");
const axios = require("axios");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

let questionSet = [];
let answerKey = [];
let userAnswers = [];

// Generate questions
router.post("/generate", checkAuth, async (req, res) => {
    try {
        const { category, subcategory } = req.body;

        if (!category || !subcategory) {
            return res.status(400).json({ error: "Category and subcategory are required." });
        }

        const prompt = `Generate 15 multiple-choice questions (MCQs) with 4 options each (1 correct and 3 incorrect).
        - 5 beginner-level questions
        - 5 intermediate-level questions
        - 5 advanced-level questions
        Each question should be based on:
        - Category: ${category}
        - Subcategory: ${subcategory}
        - Format: {"question": "...", "options": ["...", "...", "...", "..."], "correct": "..."}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] },
            { headers: { "Content-Type": "application/json" } }
        );

        // Extract and parse JSON from response
        const generatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!generatedText) return res.status(500).json({ error: "Failed to generate questions from API." });

        questionSet = JSON.parse(generatedText);
        answerKey = questionSet.map(q => q.correct); // Store correct answers
        userAnswers = []; // Reset user answers

        res.json({ success: true, message: "Questions generated successfully!" });

    } catch (error) {
        console.error("Error generating questions:", error.response?.data || error.message);
        res.status(500).json({ error: "Internal server error. Please try again." });
    }
});

// Get a single question by index
router.get("/question/:index", checkAuth, (req, res) => {
    const index = parseInt(req.params.index);
    if (index >= 0 && index < questionSet.length) {
        res.json({ success: true, question: questionSet[index] });
    } else {
        res.json({ success: false, message: "No more questions available" });
    }
});

// Store user answer
router.post("/answer", checkAuth, (req, res) => {
    const { index, answer } = req.body;
    if (index < 0 || index >= questionSet.length) {
        return res.status(400).json({ error: "Invalid question index." });
    }

    userAnswers[index] = answer;
    res.json({ success: true, message: "Answer recorded." });
});

// Evaluate user answers
router.post("/evaluate", checkAuth, (req, res) => {
    if (userAnswers.length !== questionSet.length) {
        return res.status(400).json({ error: "Incomplete answers submitted." });
    }

    let correctCount = 0;
    let results = userAnswers.map((ans, index) => {
        const isCorrect = ans === answerKey[index];
        if (isCorrect) correctCount++;
        return { question: questionSet[index].question, userAnswer: ans, correct: answerKey[index], isCorrect };
    });

    res.json({ success: true, correctCount, total: questionSet.length, results });
});

module.exports = router;