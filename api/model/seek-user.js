const mongoose = require('mongoose');

const seekuserSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    profileImg: { type: String, default: '' },
    fullName: { type: String, trim: true },
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: [6, 'Password length should be more than 6'] },
    phoneNumber: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    gender: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    pincode: { type: String, default: '' },
    skills: { type: [String]},
    projectUrl: { type: String, default: '' },
    summary: { type: String, default: '' },
    resume: { type: String, default: '' },
    eduDegree: { type: String, default: '' },
    eduInstitution: { type: String, default: '' },
    eduSpecialisation: { type: String, default: '' },
    eduStartYear: { type: String, default: '' },
    eduEndYear: { type: String, default: '' },
    expCompany: { type: String, default: '' },
    expPosition: { type: String, default: '' },
    expStartYear: { type: String, default: '' },
    expEndYear: { type: String, default: '' },

});

module.exports = mongoose.model('SeekUser', seekuserSchema);
