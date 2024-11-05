const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    adminID: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    joiningDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admin', adminSchema);
