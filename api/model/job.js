const mongoose = require('mongoose');

const jobSchema = mongoose.Schema({
    companyName: {
        type: String,
        required: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    phoneNo: {
        type: Number,
        required: true
    },
    numOfEmployee: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    jobType: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    workType: {
        type: String,
        required: true
    },
    minEducation: {
        type: String,
        required: true
    },
    experience: {
        type: String,
        required: true
    },
    interviewType: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    noOfOpeaning: {
        type: Number,
        required: true,
        min: 1
    },
    minPackage: {
        type: String,
        required: true,
        
    },
    maxPackage: {
        type: String,
        required: true,
        
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required:true
    },
    dateCreated: {
        type: Date,
        default: Date.now,
    },
    createdBy : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HostUser',
        required: true
    }

});


jobSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

jobSchema.set('toJSON', {
    virtuals: true,
});


exports.Job = mongoose.model('Job', jobSchema);