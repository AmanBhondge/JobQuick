const express = require('express');
const mongoose = require('mongoose');
const Category = require('../model/category');
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get('/', checkAuth, async (req, res) => {
    try {
        const categoryList = await Category.find();
        res.status(200).json({ success: true, data: categoryList });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid Category ID' });
        }

        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found.' });
        }

        res.status(200).json({ success: true, data: category });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        if (!req.body.title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        const existingCategory = await Category.findOne({ title: req.body.title });
        if (existingCategory) {
            return res.status(409).json({ success: false, message: 'Category with this title already exists!' });
        }

        const category = new Category({
            title: req.body.title,
            subcategories: req.body.subcategories || []
        });

        await category.save();
        res.status(201).json({ success: true, message: 'Category created successfully', data: category });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid Category ID' });
        }

        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found!' });
        }

        res.status(200).json({ success: true, message: 'Category deleted successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;