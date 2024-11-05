const mongoose = require('mongoose');

const pictureSchema = new mongoose.Schema({
    pictureID: { type: String, required: true, unique: true },
    dateCreated: { type: Date, default: Date.now },
    encryptionAlgorithm: { type: String, enum: ['AES', '3DES'], required: true },
    key: { type: String, required: true },
    iv: { type: String, required: true },
    steganographyTechnique: { type: String, enum: ['LSB', 'PVD', 'DCT'], required: true },
    imageType: { type: String, required: true },
    ownerUsername: { type: String, required: true },
    sharedUsernames: [{ type: String }],
    // imageURL: { type: String, default: null }
});

module.exports = mongoose.model('Picture', pictureSchema);
