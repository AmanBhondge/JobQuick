require("dotenv").config();
const express = require("express");
const pdfParse = require("pdf-parse");
const axios = require("axios");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.post("/check", async (req, res) => {
    try {

        const category = req.body.category;
        const subcategory = req.body.subcategory;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{
                        text: `generate 15 mcq questions with 1 correct and 3 wrong answers where 5
                         question will be of beginner level, 5 of intermediate level and 5 will be of advanced level 
                         this question will be based on category ${category} with sub category ${subcategory}`
                    }]
                }]
            },
            { headers: { "Content-Type": "application/json" } }
        );

        res.json({ score, feedback: analysis });


    } catch (error) {
        if (error.message === 'Only PDF files are allowed') {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;