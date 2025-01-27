const mongoose = require('mongoose');

const hostuserSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    profileImg: { type: String, default: '' },
    fullName: { type: String },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true, minlength: [6, 'Password length should be more than 6'] },
    phoneNumber: { type: String ,default: ''},
    companyURL: { type: String ,default: ''},
    gender: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    pincode: { type: String, default: '' },

});

module.exports = mongoose.model('HostUser', hostuserSchema);