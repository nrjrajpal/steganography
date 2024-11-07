const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel")
const Picture = require("../models/pictureModel")
const Admin = require("../models/adminModel")

const isAdminOrUser = require("../middlewares/isAdminOrUser")
const isAdmin = require("../middlewares/isAdmin")


const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { CloudFrontClient, CreateInvalidationCommand } = require("@aws-sdk/client-cloudfront");

const bucketName = process.env.BUCKET_NAME
const bucketRegion = process.env.BUCKET_REGION
const cloudFrontDistID = process.env.CLOUD_FRONT_DIST_ID
const s3 = new S3Client({ region: bucketRegion })
const cloudFront = new CloudFrontClient({ region: bucketRegion })

router.use(express.json());


router.post("/updateUser", isAdminOrUser, async (req, res) => {
    try {
        let { username, name, email, password } = req.body
        if (username == null || username == "") {
            res.status(400).json({ message: "Username is required to get the users's details", success: false });
            return
        }
        const existingUser = await User.findOne({ username });
        if(existingUser){
            if(name == null || name == "") name = existingUser.name; 
            if(email == null || email == "") email = existingUser.email; 
            else{
                const admin = await Admin.findOne({ email })
                if (admin) {
                    res.status(409).json({ message: "An admin account with this email already exists", success: false });
                    return
                }
                const user = await User.findOne({ email })
                if (user && username !== user.username) {
                    res.status(409).json({ message: "A user account with this email already exists", success: false });
                    return
                }
            }

            if(password !== null && password !== ""){
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(password, salt);
                updatedFields = { name, password: hash, email, ownedPictureIDs:existingUser.ownedPictureIDs, sharedPictureIDs:existingUser.sharedPictureIDs, joiningDate: existingUser.joiningDate };
            }
            else{
                updatedFields = { name, password: existingUser.password, email, ownedPictureIDs:existingUser.ownedPictureIDs, sharedPictureIDs:existingUser.sharedPictureIDs,  joiningDate: existingUser.joiningDate };
            }

            const updatedDoc = await User.findOneAndUpdate({ username }, updatedFields, { new: true });

            if (updatedDoc) {
                res.status(200).json({ message: "Updated User details", user: updatedDoc, success: true });
            } else {
                res.status(500).json({ message: "Failed to update user details", success: false });
            }
        }
        else{
            res.status(400).json({ message: "User does not exist", success: false });
        }
    } catch (error) {
        res.status(500).json({
            message: "An internal server error occurred while updating the user : " + error.message,
            success: false,
        });
    }
})

router.post("/addUser", async (req, res) => {
    try {
        const { username, name, email, password } = req.body
        if (username == null || name == null || email == null || password == null) {
            res.status(400).json({ message: "The request body doesn't contain all the fields that are required to add the new user", success: false });
            return
        }
        const userN = await User.findOne({ username })
        if (userN) {
            res.status(409).json({ message: "This username is unavailable", success: false });
            return
        }
        const userE = await User.findOne({ email })
        if (userE) {
            res.status(409).json({ message: "Account with this email already exists", success: false });
            return
        }
        const adminE = await Admin.findOne({ email })
        if (adminE) {
            res.status(409).json({ message: "Account with this email already exists", success: false });
            return
        }
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        var user = await User.create({ username, name, email, password: hash, ownedPictureIDs: [], sharedPictureIDs: [] })
        user = user.toObject();
        delete user._id;
        delete user.password;
        delete user.__v;


        const token = jwt.sign({ username, designation: "user" }, process.env.SECRET, { expiresIn: "3d" })

        res.status(200).json({ message: "User created successfully!", success: true, user, token })
    } catch (error) {
        res.status(500).json({
            error: "An internal server error occurred while adding the user: " + error.message,
            success: false,
        });
    }
})

router.get("/getAllUsers", isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-_id -password -__v')
        res.status(200).json({ message: "Success!", success: true, users })
    } catch (error) {
        res.status(500).json({
            message: "An internal server error occurred while getting all users' details: " + error.message,
            success: false,
        });
    }
})

router.get("/getUser/:username", isAdminOrUser, async (req, res) => {
    try {
        const { username } = req.params
        if (username == null) {
            res.status(400).json({ message: "Username is required to get the user's deatils", success: false });
            return
        }
        const user = await User.findOne({ username }).select('-_id -password -__v')
        if (user) {
            res.status(200).json({ message: "Fetched user details successfully!", success: true, user })
            return
        } else {
            res.status(409).json({ message: "Invalid username", success: false });
            return
        }
    } catch (error) {
        res.status(500).json({
            message: "An internal server error occurred while getting the user's details: " + error.message,
            success: false,
        });
    }
})

router.post("/deleteUser", isAdminOrUser, async (req, res) => {
    try {
        const { username } = req.body
        if (username == null || username == "") {
            res.status(400).json({ message: "Username is required", success: false });
            return
        }
        if (username !== req.username && req.designation !== "admin") {
            res.status(409).json({ message: "You are not allowed to delete this user account", success: false });
            return
        }

        const existingUser = await User.findOne({ username });

        if(existingUser){
            // for owned pictures
            for (const pictureID of existingUser.ownedPictureIDs) {
        
                const picture = await Picture.findOne({ pictureID });
        
                if (username !== picture.ownerUsername)
                    continue

                existingUser.ownedPictureIDs = existingUser.ownedPictureIDs.filter(picID => picID !== pictureID);
        
                await User.findOneAndUpdate({ username }, existingUser, { new: true });
        
                for (const username_ of picture.sharedUsernames) {
                    let user_ = await User.findOne({ username: username_ })
                    if (user_) {
                        user_.sharedPictureIDs = user_.sharedPictureIDs.filter(picID => picID !== pictureID);
                        await User.findOneAndUpdate({ username: username_ }, user_, { new: true });
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

                console.log("Deleted picture: ", pictureID);
            }

            // for shared pictures
            for (const pictureID of existingUser.sharedPictureIDs) {
                const sharedPicData = await Picture.findOne({ pictureID });
                sharedPicData.sharedUsernames = sharedPicData.sharedUsernames.filter(userName => userName !== username);
                await Picture.findOneAndUpdate({ pictureID }, sharedPicData, { new: true });
            }

            await User.deleteOne({ username });
            res.status(200).json({ message: "User Deleted Successfully", success: true, username: username })
        }
        res.status(400).json({ message: "User does not exist", success: false });

    } catch (error) {
        res.status(500).json({
            message: "An internal server error occurred while getting all users' details: " + error.message,
            success: false,
        });
    }
})

module.exports = router