const express = require("express");
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer')
const { Jimp } = require("jimp");
const { intToRGBA, rgbaToInt } = require("@jimp/utils");
const aesjs = require('aes-js');
const fetch = require('node-fetch');
require('dotenv').config()

const Picture = require("../models/pictureModel");
const User = require("../models/userModel")

const isUser = require("../middlewares/isUser")

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
// const { getSignedUrl, S3RequestPresigner } = require("@aws-sdk/s3-request-presigner");
const { getSignedUrl } = require("@aws-sdk/cloudfront-signer");
const { CloudFrontClient, CreateInvalidationCommand } = require("@aws-sdk/client-cloudfront");

const randomNameGen = (len = 16) => crypto.randomBytes(len).toString('hex')

const bucketName = process.env.BUCKET_NAME
const bucketRegion = process.env.BUCKET_REGION
const cloudFrontDistID = process.env.CLOUD_FRONT_DIST_ID

const s3 = new S3Client({ region: bucketRegion })
const cloudFront = new CloudFrontClient({ region: bucketRegion })

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

router.use(express.json());

function encryptMessageAES(dataBuffer) {
    const key = crypto.randomBytes(32); // 256-bit key
    const iv = crypto.randomBytes(16);  // 128-bit IV
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

    const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);

    return {
        key: key.toString("base64"),
        iv: iv.toString("base64"),
        encryptedMessage: encrypted.toString("base64")
    };
}

function decryptMessageAES(key, iv, encryptedMessage) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'base64'), Buffer.from(iv, 'base64'));

    let decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedMessage, 'base64')), decipher.final()]);

    // Convert the decrypted Buffer to a string (assuming UTF-8 encoding)
    return decrypted.toString('utf8');
}

function encryptMessage3DES(message) {
    const key = crypto.randomBytes(24);
    const cipher = crypto.createCipheriv('des-ede3', key, null);
    let encrypted = cipher.update(message, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const keyBase64 = key.toString('base64');
    return {
        key: keyBase64,
        encryptedMessage: encrypted
    };
}

function decryptMessage3DES(keyBase64, encryptedBase64) {
    const key = Buffer.from(keyBase64, 'base64');
    const decipher = crypto.createDecipheriv('des-ede3', key, null);
    let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function textToBinary(text) {
    return text.split("").map(char => {
        return char.charCodeAt(0).toString(2).padStart(8, "0");
    }).join("");
}

function binaryToText(binaryString) {
    return binaryString.match(/.{8}/g).map(byte => String.fromCharCode(parseInt(byte, 2))).join("");
}

async function embedMessageLSB(imageBuffer, encryptedMessage, mimeType) {
    const binaryMessage = textToBinary(encryptedMessage) + "00000000";

    const image = await Jimp.read(imageBuffer);
    const { width, height } = image.bitmap;

    let messageIndex = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (messageIndex >= binaryMessage.length) break;

            const pixelColor = image.getPixelColor(x, y);
            const rgba = intToRGBA(pixelColor);

            rgba.b = (rgba.b & 0xFE) | parseInt(binaryMessage[messageIndex], 2);

            messageIndex++;
            image.setPixelColor(rgbaToInt(rgba.r, rgba.g, rgba.b, rgba.a), x, y);
        }
    }

    const quality = mimeType === Jimp.MIME_JPEG ? 90 : undefined;
    return await image.getBuffer(mimeType, { quality });
}

async function extractMessageLSB(imageBuffer) {
    const image = await Jimp.read(imageBuffer);
    const { width, height } = image.bitmap;

    let binaryMessage = "";
    let endOfMessage = false;

    for (let y = 0; y < height && !endOfMessage; y++) {
        for (let x = 0; x < width && !endOfMessage; x++) {
            const pixelColor = image.getPixelColor(x, y);
            const rgba = intToRGBA(pixelColor);
            const blueChannelLSB = rgba.b & 1;
            binaryMessage += blueChannelLSB;

            if (binaryMessage.slice(-8) === "00000000") {
                endOfMessage = true;
                binaryMessage = binaryMessage.slice(0, -8);
            }
        }
    }

    return binaryToText(binaryMessage);
}

// router.post("/temp", isUser, async (req, res) => {
//     console.log(req.username)
// })

router.post("/addPicture", isUser, upload.single("picture"), async (req, res) => {
    try {
        // console.log("Here...")
        const { encryptionAlgorithm, steganographyTechnique, secretMessage } = req.body;
        if (encryptionAlgorithm == null || steganographyTechnique == null || secretMessage == null)
            res.status(400).json({ message: "The request body doesn't contain all the fields that are required to add the new picture", success: false });
        // console.log("Body: ", req.body);
        // console.log("File: ", req.file);
        const ownerUsername = req.username
        let key, encryptedMessage;
        let iv = "N/A";

        let user = await User.findOne({ username: ownerUsername })
        if (!user) {
            res.status(409).json({ message: "Invalid username", success: false });
            return
        }

        // console.log(encryptionAlgorithm)
        if (encryptionAlgorithm === "AES") {
            ({ key, iv, encryptedMessage } = encryptMessageAES(secretMessage));
            // console.log("AES: \n" + encryptedMessage + "\n" + key)
            // console.log(decryptMessageAES(key, iv, encryptedMessage));
        } else if (encryptionAlgorithm === "3DES") {
            ({ key, encryptedMessage } = encryptMessage3DES(secretMessage));
            // console.log("3DES: \n" + encryptedMessage + "\n" + key)
            // console.log(decryptMessage3DES(key, encryptedMessage));
        } else {
            res.status(400).json({ message: "Invalid encryption algorithm", success: false });
            return
        }

        let stegoImageBuffer;
        if (steganographyTechnique === "LSB") {
            stegoImageBuffer = await embedMessageLSB(req.file.buffer, encryptedMessage, req.file.mimetype);
        } else {
            res.status(400).json({ message: "Invalid steganography technique", success: false });
            return
        }

        const picName = randomNameGen() + "-" + ownerUsername

        const params = {
            Bucket: bucketName,
            Key: picName,
            Body: stegoImageBuffer,
            ContentType: req.file.mimetype,
        }

        const command = new PutObjectCommand(params)
        await s3.send(command)

        const picture = await Picture.create({
            pictureID: picName,
            dateCreated: Date.now(),
            encryptionAlgorithm,
            key,
            iv,
            steganographyTechnique,
            imageType: req.file.mimetype,
            ownerUsername,
            sharedUsernames: [],
            // imageURL: null
        })

        user.ownedPictureIDs.push(picName);
        const updatedUser = await User.findOneAndUpdate({ username: ownerUsername }, user, { new: true });
        // console.log(updatedUser)

        res.status(200).json({ success: true, message: "Uploaded the picture", picture });
    } catch (error) {
        res.status(500).json({
            message: "An internal server error occurred while adding the picture: " + error.message,
            success: false,
        });
    }
})

router.get("/getPictures", isUser, async (req, res) => {
    try {
        const username = req.username;
        // console.log(username)
        const user = await User.findOne({ username })
        if (!user) {
            res.status(409).json({ message: "Invalid username", success: false });
            return
        }
        let pictures = user.ownedPictureIDs.concat(user.sharedPictureIDs)
        let URLs = []
        // console.log(pictures)
        for (i = 0; i < pictures.length; i++) {
            //SIGNED CDN:
            imageURL = getSignedUrl({
                url: "https://d4ufo66bxjs9z.cloudfront.net/" + pictures.at(i),
                dateLessThan: new Date(Date.now() + 1000 * 60 * 60 * 24), //Enpires after 1 day
                privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
                keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID
            })
            URLs.push({ pictureID: pictures.at(i), imageURL })
        }

        //UNSIGNED CDN:
        // picture.imageURL = "https://d4ufo66bxjs9z.cloudfront.net/" + picture.pictureID

        // SIGNED s3:
        // const params = {
        //     Bucket: bucketName,
        //     Key: picture.pictureID,
        // }
        // const command = new GetObjectCommand(params);
        // const url = await getSignedUrl(s3, command, { expiresIn: 7200 }); //7200 seconds
        // picture.imageURL = url
        // }
        res.status(200).json({ URLs, success: true })
    }
    catch (error) {
        res.status(500).json({
            message: "An internal server error occurred while getting the pictures: " + error.message,
            success: false,
        });
    }
})

router.get("/getHiddenMessage/:pictureID", isUser, async (req, res) => {
    try {
        const { pictureID } = req.params;
        // console.log(pictureID)
        const picture = await Picture.findOne({ pictureID });
        if (!picture) {
            res.status(404).json({
                message: "Picture not found",
                success: false,
            });
            return
        }

        const signedUrl = getSignedUrl({
            url: `https://d4ufo66bxjs9z.cloudfront.net/${picture.pictureID}`,
            dateLessThan: new Date(Date.now() + 1000 * 60 * 10),
            privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
            keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID
        });
        // console.log(signedUrl)
        const response = await fetch(signedUrl);
        if (!response.ok) {
            throw new Error("Failed to fetch the image from CloudFront");
        }
        const imageBuffer = await response.buffer();

        const encryptedMessage = await extractMessageLSB(imageBuffer);

        let originalMessage;
        if (picture.encryptionAlgorithm === "AES") {
            originalMessage = decryptMessageAES(picture.key, picture.iv, encryptedMessage);
        } else if (picture.encryptionAlgorithm === "3DES") {
            originalMessage = decryptMessage3DES(picture.key, encryptedMessage);
        } else {
            res.status(400).json({
                message: "Unknown encryption algorithm",
                success: false,
            });
            return
        }

        res.status(200).json({ message: originalMessage, success: true });
    } catch (error) {
        res.status(500).json({
            message: "An internal server error occurred while retrieving the hidden message: " + error.message,
            success: false,
        });
    }
});

router.delete("/deletePicture", isUser, async (req, res) => {
    try {
        const { pictureID } = req.body;
        const username = req.username;
        if (!pictureID)
            return res.status(400).json({ message: "The request body doesn't contain pictureID", success: false });

        const picture = await Picture.findOne({ pictureID });
        if (!picture)
            return res.status(404).json({ message: `Picture with ID ${pictureID} doesn't exist`, success: false });

        if (username !== picture.ownerUsername)
            return res.status(403).json({ message: "You can't delete this picture as you don't own it.", success: false });

        // const users = picture.sharedUsernames.concat(picture.ownerUsername)
        let user = await User.findOne({ username })
        user.ownedPictureIDs = user.ownedPictureIDs.filter(picID => picID !== pictureID);

        await User.findOneAndUpdate({ username }, user, { new: true });

        for (const username_ of picture.sharedUsernames) {
            let user = await User.findOne({ username: username_ })
            if (user) {
                user.sharedPictureIDs = user.sharedPictureIDs.filter(picID => picID !== pictureID);
                await User.findOneAndUpdate({ username: username_ }, user, { new: true });
            }
        }
        const params = {
            Bucket: bucketName,
            Key: pictureID,
        };
        const command = new DeleteObjectCommand(params);
        await s3.send(command);

        //CallerReference is a unique name for identicication of this deletion request... CloudFront ignores the(duplicate) request if accidentally 2 or more are sent(when the caller reference and details are same for all of them)
        const params2 = {
            DistributionId: cloudFrontDistID,
            InvalidationBatch: {
                CallerReference: pictureID,
                Paths: {
                    Quantity: 1,
                    Items: [
                        "/" + pictureID
                    ]
                }
            }
        }
        // console.log("/" + picture.pictureID)
        const command2 = new CreateInvalidationCommand(params2)
        await cloudFront.send(command2)
        await Picture.deleteOne({ pictureID });


        res.status(200).json({ message: "Picture deleted successfully", success: true, pictureID: pictureID });
    } catch (error) {
        res.status(500).json({
            message: "An internal server error occurred while deleting the picture: " + error.message,
            success: false,
        });
    }
});

router.post("/shareImage", async (req, res) => {
    try {
        const { pictureID, sharedUsernames } = req.body;
        if (pictureID == null || sharedUsernames.length <= 0) {
            res.status(400).json({ message: "The request body doesn't contain all the fields that are required to share the picture", success: false });
            return
        }

        let picture = await Picture.findOne({ pictureID })
        if (!picture) {
            res.status(409).json({ message: "Invalid pictureID", success: false });
            return
        }

        let skippedUsers = []
        let sharedUsers = []

        for (const username of sharedUsernames) {
            let user = await User.findOne({ username })
            if (!user) {
                skippedUsers.push(username)
            }
            else {
                sharedUsers.push(username)
                // user.sharedPictureIDs.push(pictureID);
                user.sharedPictureIDs = Array.from(new Set([...user.sharedPictureIDs, pictureID]))
                const updatedUser = await User.findOneAndUpdate({ username }, user, { new: true });
                // console.log(updatedUser)
            }
        }

        picture.sharedUsernames = Array.from(new Set([...picture.sharedUsernames, ...sharedUsernames]))

        const updatedPicture = await Picture.findOneAndUpdate({ pictureID }, picture, { new: true });
        // console.log(updatedPicture)
        res.status(200).json({ message: "Shared the image with following users: " + sharedUsers, success: true, skippedUsers })
    } catch (error) {
        res.status(500).json({
            message: "An internal server error occurred while sharing the picture: " + error.message,
            success: false,
        });
    }
})

module.exports = router;