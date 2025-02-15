require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const axios = require("axios");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();
const upload = multer({
  fileFilter: (req, file, cb) => {
    // Check if the file is a PDF
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

router.post("/check", upload.single("resume"), checkAuth, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const parsedPDF = await pdfParse(req.file.buffer);
    let resumeText = parsedPDF.text;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Analyze this resume for ATS compatibility. Provide a score out of 100 and suggest improvements. Format response as: \"Score: [number]\" followed by feedback.
  \n${resumeText}`
          }]
        }]
      },
      { headers: { "Content-Type": "application/json" } }
    );

    let analysis = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No feedback received from AI";

    const scoreMatch = analysis.match(/Score:\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

    if (score === null) {
      return res.status(500).json({ error: "Failed to extract score from AI response" });
    }

    res.json({ score, feedback: analysis });

    resumeText = null;
    analysis = null;

  } catch (error) {
    console.error("Error analyzing resume:", error);
    if (error.message === 'Only PDF files are allowed') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;