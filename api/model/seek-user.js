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

    education: [
        {
            degree: { type: String },
            institution: { type: String },
            specialisation: { type: String },
            startYear: { type: Number },
            endYear: { type: Number }
        }
    ],

    workExperience: [
        {
            company: { type: String },
            position: { type: String },
            startDate: { type: Date },
            endDate: { type: Date }
        }
    ],
});

module.exports = mongoose.model('SeekUser', seekuserSchema);
