const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel")
const Admin = require("../models/adminModel")

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

module.exports = router