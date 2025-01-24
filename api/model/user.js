const mongoose = require('mongoose');


const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    userId: { type: String, unique: true, required: true },
    name: { type: String, },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phoneNumber: {type: String, },
    dateOfBirth: {type : String, default: ''},
    gender: {type : String, default: ''},
    profileImg: {type : String, default: ''},
    address: {type : String, default: ''},
    city: {type : String, default: ''},
    state: {type : String, default: ''},
    country: {type : String, default: ''},
    pincode: {type : String, default: ''},
    higestEducation : {type : String, default: ''},
    skills : {type : String, default: ''},
    workExperience : {type : String, default: ''},
    role : {type : String, default: ''},
    
});

module.exports = mongoose.model('User', userSchema);