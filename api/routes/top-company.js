const express = require('express');
const router = express.Router();
const TopCompany = require('../model/top-company');
const checkAuth = require('../middleware/check-auth');

router.get('/',checkAuth, async (req, res) => {
    try {
        const topcompanyList = await TopCompany.find();
        res.status(200).json({ success: true, data: topcompanyList });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/',checkAuth, async (req, res) => {
    try {
        const topcompany = new TopCompany(req.body);
        await topcompany.save();
        res.status(201).json({ success: true, message: 'Feedback submitted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;