require('dotenv').config();
const express = require("express");
const app = express();
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');

const userRoute = require('./api/routes/user');
const atsRoute = require('./api/routes/ats-score-checker');


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

app.use('/public/profilepic', express.static(path.join(__dirname, 'public', 'profilepic')));
app.use('/public/resumes', express.static(path.join(__dirname, 'public', 'resumes')));

app.use('/user', userRoute);
app.use('/ats', atsRoute);



app.use((req, res, next) => {
    res.status(404).json({ message: "❌ Bad Request - Route Not Found" });
});

module.exports = app;
