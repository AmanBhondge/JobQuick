require("dotenv").config();
const express = require("express");
const router = express.Router();
const axios = require("axios");
const checkAuth = require("../middleware/check-auth");

// Store generated questions in memory (consider using Redis or a database for production)
const userQuestions = new Map();

// Helper function to format question
const formatQuestion = (questionData, currentIndex, totalQuestions) => {
    const [questionText, ...optionsAndAnswer] = questionData.split('\n').filter(line => line.trim());
    const options = optionsAndAnswer.slice(0, 4);
    const correctAnswer = optionsAndAnswer.find(line => line.startsWith('Correct:'))?.split(':')[1]?.trim();
    const level = optionsAndAnswer.find(line => line.startsWith('Level:'))?.split(':')[1]?.trim();

    return {
        text: questionText.replace('Q:', '').trim(),
        options,
        correctAnswer,
        level,
        questionNumber: currentIndex + 1,
        totalQuestions
    };
};

// Generate initial questions
router.post("/generate", checkAuth, async (req, res) => {
    try {
        const { category, subcategory } = req.body;
        const userId = req.userData.userId;

        if (!category || !subcategory) {
            return res.status(400).json({ 
                success: false, 
                error: "Category and subcategory are required." 
            });
        }

        const prompt = `Generate 15 multiple-choice questions (MCQs) with 4 options each (1 correct and 3 incorrect).
        - 5 beginner-level questions
        - 5 intermediate-level questions
        - 5 advanced-level questions
        Each question should be based on:
        - Category: ${category}
        - Subcategory: ${subcategory}
        Format each question as:
        Q: [Question text]
        A) [Option 1]
        B) [Option 2]
        C) [Option 3]
        D) [Option 4]
        Correct: [A/B/C/D]
        Level: [Beginner/Intermediate/Advanced]`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }]
            },
            { 
                headers: { "Content-Type": "application/json" },
                timeout: 30000
            }
        );

        const generatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            return res.status(500).json({ 
                success: false, 
                error: "Failed to generate questions from API." 
            });
        }

        // Split text into individual questions
        const questions = generatedText.split(/Q:/)
            .filter(q => q.trim())
            .map(q => 'Q:' + q.trim());

        // Store questions for this user
        userQuestions.set(userId, {
            questions,
            currentIndex: 0,
            category,
            subcategory,
            timestamp: Date.now()
        });

        // Send first question
        const firstQuestion = formatQuestion(questions[0], 0, questions.length);

        res.json({
            success: true,
            question: firstQuestion,
            isLastQuestion: questions.length === 1
        });

    } catch (error) {
        console.error("Error generating questions:", error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error. Please try again." 
        });
    }
});

// Get next question
router.get("/next", checkAuth, (req, res) => {
    try {
        const userId = req.userData.userId;
        const userSession = userQuestions.get(userId);

        if (!userSession) {
            return res.status(404).json({ 
                success: false, 
                error: "No active question session found. Please generate new questions." 
            });
        }

        const { questions, currentIndex } = userSession;

        // Check if all questions have been sent
        if (currentIndex >= questions.length) {
            userQuestions.delete(userId);
            return res.status(404).json({ 
                success: false, 
                error: "All questions have been answered. Please generate new questions." 
            });
        }

        // Get next question
        const question = formatQuestion(
            questions[currentIndex], 
            currentIndex, 
            questions.length
        );

        // Increment index for next request
        userSession.currentIndex++;

        // Check if this was the last question
        const isLastQuestion = userSession.currentIndex >= questions.length;

        res.json({
            success: true,
            question,
            isLastQuestion
        });

        // Clean up if this was the last question
        if (isLastQuestion) {
            userQuestions.delete(userId);
        }

    } catch (error) {
        console.error("Error getting next question:", error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error. Please try again." 
        });
    }
});

// Reset questions
router.post("/reset", checkAuth, (req, res) => {
    const userId = req.userData.userId;
    userQuestions.delete(userId);
    res.json({ 
        success: true, 
        message: "Question session reset successfully" 
    });
});

// Cleanup old sessions periodically
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [userId, session] of userQuestions.entries()) {
        if (session.timestamp < oneHourAgo) {
            userQuestions.delete(userId);
        }
    }
}, 60 * 60 * 1000);

module.exports = router;