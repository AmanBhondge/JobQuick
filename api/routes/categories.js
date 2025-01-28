const express = require('express');
const mongoose = require('mongoose');
const Category = require('../model/category');

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
    try {
        const categoryList = await Category.find();
        res.status(200).json({ success: true, data: categoryList });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get category by ID
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

// Create a new category
router.post('/', async (req, res) => {
    try {
        if (!req.body.title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        // Check if category already exists
        const existingCategory = await Category.findOne({ title: req.body.title });
        if (existingCategory) {
            return res.status(409).json({ success: false, message: 'Category with this title already exists!' });
        }

        const category = new Category({
            title: req.body.title
        });

        await category.save();
        res.status(201).json({ success: true, message: 'Category created successfully', data: category });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Update a category
router.put('/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid Category ID' });
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { title: req.body.title },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found.' });
        }

        res.status(200).json({ success: true, message: 'Category updated successfully', data: category });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Delete a category
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
