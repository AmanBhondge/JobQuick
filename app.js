require('dotenv').config();
const express = require("express");
const app = express();
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');

const seekUserRoute = require('./api/routes/seek-user');
const hostUserRoute = require('./api/routes/host-user');
const atsRoute = require('./api/routes/ats-score-checker');
const categoriesRoute = require('./api/routes/categories');
const jobRoute = require('./api/routes/jobs');
const applicantRoute = require('./api/routes/applicants');

const { MONGO_URI } = require('./config');

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");
    } catch (err) {
        console.error("❌ MongoDB Connection Failed:", err.message);
        process.exit(1);
    }
};

connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

// Static Files
app.use('/public/profilepic', express.static(path.join(__dirname, 'public', 'profilepic')));
app.use('/public/resumes', express.static(path.join(__dirname, 'public', 'resumes')));

// Routes (Pass `io` to Routes)
app.use((req, res, next) => {
    req.io = app.get("io"); // Attach `io` to `req` so routes can use it
    next();
});

app.use('/seekuser', seekUserRoute);
app.use('/hostuser', hostUserRoute);
app.use('/ats', atsRoute);
app.use('/categories', categoriesRoute);
app.use('/job', jobRoute);
app.use('/applicants', applicantRoute);

app.use((req, res, next) => {
    res.status(404).json({ message: "❌ Bad Request - Route Not Found" });
});

module.exports = app;
