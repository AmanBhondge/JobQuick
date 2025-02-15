require("dotenv").config();
const express = require("express");
const pdfParse = require("pdf-parse");
const axios = require("axios");
const checkAuth = require("../middleware/check-auth");

const app = express();

app.post("/check", async (req, res) => {
  try {

    const parsedPDF = await pdfParse(req.file.buffer);
    let resumeText = parsedPDF.text;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `genetrate questions and answer
  \n${category}and \n${subcategory}`
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
    if (error.message === 'Only PDF files are allowed') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = app;