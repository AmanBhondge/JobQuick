const mongoose = require('mongoose');

const categorySchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    }
});


categorySchema.set('toJSON', {
    virtuals: true,
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
