const mongoose = require('mongoose');

const seekuserSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    profileImg: { type: String, default: '' },
    fullName: { type: String},
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true, minlength: [6, 'Password length should be more than 6'] },
    phoneNumber: { type: String ,default: ''},
    dateOfBirth: { type: String, default: '' },
    gender: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    pincode: { type: String, default: '' },
    skills: { type: String, default: '' },

    education: [
        {
            degree: { type: String, required: true },
            institution: { type: String, required: true },
            specialisation: { type: String, required: true },
            startYear: { type: Number, required: true },
            endYear: { type: Number }
        }
    ],

    workExperience: [
        {
            company: { type: String, required: true },
            position: { type: String, required: true },
            startDate: { type: Date, required: true },
            endDate: { type: Date }
        }
    ],

});

module.exports = mongoose.model('SeekUser', seekuserSchema);