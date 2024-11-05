const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Admin = require("../models/adminModel")
const User = require("../models/userModel")

router.use(express.json());

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body
        if (email == null || password == null) {
            res.status(400).json({ message: "Missing email or password", success: false });
            return
        }
        const userE = await User.findOne({ email })
        const adminE = await Admin.findOne({ email })
        if (userE) {
            const valid = await bcrypt.compare(password, userE.password)
            if (valid) {
                const token = jwt.sign({ username: userE.username, designation: "user" }, process.env.SECRET, { expiresIn: "3d" })
                res.status(200).json({ message: "Login successful", success: true, token, designation: "user" })
            } else {
                res.status(401).json({ message: "Incorrect email or password", success: false });
            }
        }
        else if (adminE) {
            const valid = await bcrypt.compare(password, adminE.password)
            if (valid) {
                const token = jwt.sign({ username: adminE.adminID, designation: "admin" }, process.env.SECRET, { expiresIn: "3d" })
                res.status(200).json({ message: "Login successful", success: true, token, designation: "admin" })
            } else {
                res.status(401).json({ message: "Incorrect email or password", success: false });
            }
        }
        else {
            res.status(401).json({ message: "Incorrect email or password", success: false });
        }
    } catch (error) {
        res.status(500).json({
            message: "An internal server error occurred while logging in: " + error.message,
            success: false,
        });
    }
})

module.exports = router