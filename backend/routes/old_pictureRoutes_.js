const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const crypto = require('crypto');
const sharp = require('sharp');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path');
const NodeRSA = require('node-rsa');
const Picture = require('../models/pictureModel');

// Configure GridFS
let gfs;
const conn = mongoose.connection;
conn.once('open', () => {
    gfs = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'pictures'
    });
});

// Encryption functions
function encryptAES(text, key) {
    try {
        // Generate a random IV
        const iv = crypto.randomBytes(16);

        // Create key buffer of correct length (32 bytes for AES-256)
        const keyBuffer = crypto.createHash('sha256').update(key).digest();

        // Create cipher
        const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);

        // Encrypt the text
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Return both the IV and encrypted data
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('AES Encryption error:', error);
        throw new Error('Encryption failed');
    }
}

function encryptRSA(text, publicKey) {
    try {
        const key = new NodeRSA();
        key.importKey(publicKey, 'public');
        return key.encrypt(text, 'base64');
    } catch (error) {
        console.error('RSA Encryption error:', error);
        throw new Error('Encryption failed');
    }
}

// Convert text to binary string
function textToBinary(text) {
    return text.split('').map(char =>
        char.charCodeAt(0).toString(2).padStart(8, '0')
    ).join('');
}

// LSB steganography with encrypted message
async function applyLSBSteganography(imageBuffer, message, encryptionAlgorithm, key) {
    try {
        // First encrypt the message based on the algorithm
        let encryptedMessage;
        switch (encryptionAlgorithm) {
            case 'AES':
                encryptedMessage = encryptAES(message, key);
                break;
            case 'RSA':
                encryptedMessage = encryptRSA(message, key);
                break;
            default:
                throw new Error('Unsupported encryption algorithm');
        }

        // Convert encrypted message to binary
        const messageBinary = textToBinary(encryptedMessage);

        // Add length prefix to message binary (32 bits for length)
        const lengthPrefix = messageBinary.length.toString(2).padStart(32, '0');
        const fullMessageBinary = lengthPrefix + messageBinary;

        // Convert image to raw pixel data
        const { data, info } = await sharp(imageBuffer)
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Check if image has enough capacity
        if (data.length < fullMessageBinary.length) {
            throw new Error('Image too small to contain the encrypted message');
        }

        // Apply LSB technique
        for (let i = 0; i < fullMessageBinary.length; i++) {
            // Clear the LSB and set it to the message bit
            data[i] = (data[i] & 0xFE) | parseInt(fullMessageBinary[i]);
        }

        // Convert back to image buffer
        return await sharp(data, {
            raw: {
                width: info.width,
                height: info.height,
                channels: info.channels
            }
        }).toFormat('png').toBuffer();
    } catch (error) {
        console.error('Steganography error:', error);
        throw error;
    }
}

// Storage configuration
const storage = new GridFsStorage({
    url: process.env.MONGODB_URI,
    options: { useNewUrlParser: true, useUnifiedTopology: true },
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) return reject(err);

                const pictureID = buf.toString('hex');
                const fileInfo = {
                    filename: pictureID,
                    metadata: {
                        pictureID: pictureID,
                        dateCreated: new Date(),
                        encryptionAlgorithm: req.body.encryptionAlgorithm,
                        key: req.body.key,
                        steganographyTechnique: 'LSB',
                        imageType: file.mimetype,
                        ownerUsername: req.body.ownerUsername,
                        sharedUsernames: req.body.sharedUsernames || []
                    },
                    bucketName: 'pictures'
                };
                resolve(fileInfo);
            });
        });
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
            return;
        }
        cb(null, true);
    }
});

// Decryption functions
function decryptAES(encryptedData, key) {
    try {
        // Split IV and encrypted text
        const [ivHex, encrypted] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');

        // Create key buffer
        const keyBuffer = crypto.createHash('sha256').update(key).digest();

        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);

        // Decrypt the text
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('AES Decryption error:', error);
        throw new Error('Decryption failed');
    }
}

function decryptRSA(encryptedData, privateKey) {
    try {
        const key = new NodeRSA();
        key.importKey(privateKey, 'private');
        return key.decrypt(encryptedData, 'utf8');
    } catch (error) {
        console.error('RSA Decryption error:', error);
        throw new Error('Decryption failed');
    }
}

// Extract binary message from image
async function extractMessageFromImage(imageBuffer) {
    try {
        // Convert image to raw pixel data
        const { data, info } = await sharp(imageBuffer)
            .raw()
            .toBuffer({ resolveWithObject: true });

        // First extract 32 bits for length
        let lengthBinary = '';
        for (let i = 0; i < 32; i++) {
            lengthBinary += (data[i] & 1).toString();
        }
        const messageLength = parseInt(lengthBinary, 2);

        // Extract message bits
        let messageBinary = '';
        for (let i = 32; i < 32 + messageLength; i++) {
            messageBinary += (data[i] & 1).toString();
        }

        // Convert binary to text
        let message = '';
        for (let i = 0; i < messageBinary.length; i += 8) {
            const byte = messageBinary.substr(i, 8);
            message += String.fromCharCode(parseInt(byte, 2));
        }

        return message;
    } catch (error) {
        console.error('Message extraction error:', error);
        throw error;
    }
}

// Modified upload endpoint to return encoded image
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Validation code remains the same...

        // Apply encryption and steganography
        const stegoBuffer = await applyLSBSteganography(
            req.file.buffer,
            req.body.message,
            req.body.encryptionAlgorithm,
            req.body.key
        );

        // Create new picture document
        const picture = new Picture({
            pictureID: req.file.filename,
            encryptionAlgorithm: req.body.encryptionAlgorithm,
            key: req.body.key,
            steganographyTechnique: 'LSB',
            imageType: req.file.mimetype,
            ownerUsername: req.body.ownerUsername,
            sharedUsernames: req.body.sharedUsernames || []
        });

        // Save picture metadata
        await picture.save();

        // Save to GridFS
        const writeStream = gfs.openUploadStream(req.file.filename, {
            metadata: picture.toObject()
        });
        writeStream.write(stegoBuffer);
        writeStream.end();

        // Convert stegoBuffer to base64 for response
        const encodedImage = stegoBuffer.toString('base64');

        res.status(201).json({
            success: true,
            picture: {
                pictureID: picture.pictureID,
                dateCreated: picture.dateCreated,
                imageType: picture.imageType,
                ownerUsername: picture.ownerUsername,
                encryptionAlgorithm: picture.encryptionAlgorithm
            },
            encodedImage: `data:${picture.imageType};base64,${encodedImage}`
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// New route to decrypt message
router.post('/decrypt/:pictureID', async (req, res) => {
    try {
        if (!req.body.key) {
            return res.status(400).json({ error: 'Decryption key is required' });
        }

        const picture = await Picture.findOne({ pictureID: req.params.pictureID });
        if (!picture) {
            return res.status(404).json({ error: 'Picture not found' });
        }

        const files = await gfs.find({ filename: req.params.pictureID }).toArray();
        if (!files || files.length === 0) {
            return res.status(404).json({ error: 'Image file not found' });
        }

        // Get the image buffer
        const chunks = [];
        const readStream = gfs.openDownloadStream(files[0]._id);

        for await (const chunk of readStream) {
            chunks.push(chunk);
        }

        const imageBuffer = Buffer.concat(chunks);

        // Extract encrypted message
        const encryptedMessage = await extractMessageFromImage(imageBuffer);

        // Decrypt the message
        let decryptedMessage;
        if (picture.encryptionAlgorithm === 'AES') {
            decryptedMessage = decryptAES(encryptedMessage, req.body.key);
        } else if (picture.encryptionAlgorithm === 'RSA') {
            decryptedMessage = decryptRSA(encryptedMessage, req.body.key);
        } else {
            throw new Error('Unsupported encryption algorithm');
        }

        res.status(200).json({
            success: true,
            decryptedMessage: decryptedMessage
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;