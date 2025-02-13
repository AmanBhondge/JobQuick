require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const axios = require("axios");

const app = express();
const upload = multer();

app.post("/check", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const parsedPDF = await pdfParse(req.file.buffer);
    let resumeText = parsedPDF.text;
    console.log("🔹 Parsed Resume:", resumeText);

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
    console.log("AI Response:", analysis);

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
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = app;