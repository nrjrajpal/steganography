const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel")
const Admin = require("../models/adminModel")

const isAdminOrUser = require("../middlewares/isAdminOrUser")
const isAdmin = require("../middlewares/isAdmin")

router.use(express.json());

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
        delete user.password;

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

module.exports = router