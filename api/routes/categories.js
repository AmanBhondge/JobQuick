const Category  = require('../model/category');
const express = require('express');
const router = express.Router();


router.get('/', async (req, res) => {
    try {
        const categoryList = await Category.find();
        res.status(200).json(categoryList);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ message: 'Category not found.' });
        }

        res.status(200).json(category);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


router.post('/', async (req, res) => {
    try {
        
        const existingCategory = await Category.findOne({ title: req.body.title });

        if (existingCategory) {
            return res.status(409).json({ success: false, message: "Category with this title already exists!" });
        }

        
        let category = new Category({
            title: req.body.title
        });

        category = await category.save();

        res.status(201).json({ success: true, message: "Category created successfully", category });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { title: req.body.title }, 
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ message: 'Category not found.' });
        }

        res.status(200).json(category);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});


router.delete('/:id', async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found!' });
        }

        res.status(200).json({ success: true, message: 'Category deleted successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
