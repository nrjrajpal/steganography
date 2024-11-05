const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    ownedPictureIDs: [{ type: String }],
    sharedPictureIDs: [{ type: String }],
    joiningDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
