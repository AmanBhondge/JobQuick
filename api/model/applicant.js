const mongoose = require('mongoose');

const applicantSchema = mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Job'
    },
    applicantId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'SeekUser'
    },
    // resume: {
    //     type: String,
    //     default: ''
    // },
    shortListed: {
        type: Boolean,
        default: false
    },
    dateApplied: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Applicant', applicantSchema);