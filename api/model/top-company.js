const mongoose = require('mongoose');

const topCompanySchema = new mongoose.Schema({
    companyName : { type: String, required: true },
    companyEmail : { type: String, required: true },
    companyURL : { type: String, required: true },
    companyDescription : { type: String, required: true }
    });

module.exports = mongoose.model('TopCompany', topCompanySchema);