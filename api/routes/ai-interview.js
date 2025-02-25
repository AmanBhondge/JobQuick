require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const router = express.Router(); 
const Session = require('../model/session');
const getAIQuestion = async (category, session) => {
    try {
        let difficulty = "basic";
        const avgScore = session.scores.length > 0 ? session.scores.reduce((a, b) => a + b, 0) / session.scores.length : 0;
        if (avgScore >= 70 && session.questionNumber >= 5) difficulty = "intermediate";
        if (avgScore >= 80 && session.questionNumber >= 10) difficulty = "advanced";

        const prompt = `Generate a ${difficulty} level ${category} interview question for a verbal response. Ensure uniqueness. Previous: ${session.previousQuestions.join(', ')}`;

        const response = await axios.post(GEMINI_API_URL, { contents: [{ parts: [{ text: prompt }] }] });
        const question = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No question generated.";

        // Get an ideal answer for this question
        const idealAnswerPrompt = `Provide a concise ideal answer (3-5 sentences) for this technical interview question: "${question}"`;
        const idealAnswerResponse = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: idealAnswerPrompt }] }]
        });
        const idealAnswer = idealAnswerResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No ideal answer available.";

        session.previousQuestions.push(question);
        session.idealAnswers.push(idealAnswer);
        await session.save();
        return question;
    } catch (error) {
        console.error("Error fetching question:", error);
        return "Error fetching question.";
    }
};

const evaluateAnswer = async (question, answer, idealAnswer) => {
    try {
        const evaluationPrompt = `
      Technical Interview Evaluation:
      Question: "${question}"
      Candidate Answer: "${answer}"
      Ideal Answer Reference: "${idealAnswer}"
      
      Please evaluate the candidate's answer on the following criteria:
      1. Technical accuracy (worth 40 points)
      2. Completeness (worth 30 points)
      3. Communication clarity (worth 20 points)
      4. Industry best practices (worth 10 points)
      
      First provide a score out of 100 in the format "Score: X/100".
      Then provide a 2-3 sentence evaluation explaining the score.
      Finally, list 1-2 specific areas for improvement.
      `;

        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: evaluationPrompt }] }]
        });

        const evaluation = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No evaluation generated.";
        const scoreMatch = evaluation.match(/Score:\s*(\d+)\/100/i);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

        // Normalize the score to be between 0-10
        const normalizedScore = Math.round(score / 10);

        return {
            score: normalizedScore,
            evaluation,
            originalScore: score
        };
    } catch (error) {
        console.error("Error evaluating answer:", error);
        return { score: 0, evaluation: "Error evaluating answer.", originalScore: 0 };
    }
};

router.post('/api/interview/start', async (req, res) => {
    const { category } = req.body;
    const sessionId = `session_${Date.now()}`;
    const session = new Session({
        sessionId,
        category,
        questionNumber: 0,
        previousQuestions: [],
        previousAnswers: [],
        scores: [],
        evaluations: [],
        idealAnswers: []
    });
    await session.save();
    res.json({ sessionId });
});

router.post('/api/interview/question', async (req, res) => {
    const { sessionId } = req.body;
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: "Session not found." });
    if (session.questionNumber >= 15) return res.json({ message: "Interview completed.", completed: true });

    const question = await getAIQuestion(session.category, session);
    session.questionNumber++;
    await session.save();
    res.json({ question, questionNumber: session.questionNumber });
});

router.post('/api/interview/answer', async (req, res) => {
    const { sessionId, answer } = req.body;
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: "Session not found." });

    const questionIndex = session.questionNumber - 1;
    const question = session.previousQuestions[questionIndex];
    const idealAnswer = session.idealAnswers[questionIndex];

    const { score, evaluation, originalScore } = await evaluateAnswer(question, answer, idealAnswer);
    session.previousAnswers.push(answer);
    session.scores.push(score);
    session.evaluations.push(evaluation);
    await session.save();

    if (session.questionNumber >= 15) {
        const finalScore = session.scores.reduce((a, b) => a + b, 0) / session.scores.length;
        return res.json({
            score,
            finalScore,
            evaluations: session.evaluations,
            completed: true
        });
    }
    res.json({
        score,
        evaluation,
        originalScore
    });
});

router.post('/api/interview/correct-answers', async (req, res) => {
    const { sessionId } = req.body;
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: "Session not found." });

    const correctAnswers = session.previousQuestions.map((question, index) => ({
        question,
        userAnswer: session.previousAnswers[index] || "No answer provided",
        idealAnswer: session.idealAnswers[index] || "No ideal answer available",
        evaluation: session.evaluations[index] || "No evaluation available",
        score: session.scores[index] || 0
    }));

    res.json({ answers: correctAnswers });
});

// New endpoint to get interview progress
router.post('/api/interview/progress', async (req, res) => {
    const { sessionId } = req.body;
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: "Session not found." });

    const progress = {
        category: session.category,
        totalQuestions: 15,
        currentQuestion: session.questionNumber,
        averageScore: session.scores.length > 0 ?
            (session.scores.reduce((a, b) => a + b, 0) / session.scores.length).toFixed(1) : 0
    };

    res.json(progress);
});