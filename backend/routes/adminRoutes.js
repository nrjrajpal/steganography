const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Admin = require("../models/adminModel")
const User = require("../models/userModel")

const isAdmin = require("../middlewares/isAdmin")

router.use(express.json());

router.post("/addAdmin", async (req, res) => {
    try {
        const { adminID, name, email, password } = req.body
        if (adminID == null || name == null || email == null || password == null) {
            res.status(400).json({ message: "The request body doesn't contain all the fields that are required to add the new admin", success: false });
            return
        }
        const adminI = await Admin.findOne({ adminID })
        if (adminI) {
            res.status(409).json({ message: "This ID has already been taken", success: false });
            return
        }
        const adminE = await Admin.findOne({ email })
        if (adminE) {
            res.status(409).json({ message: "An admin account with this email already exists", success: false });
            return
        }
        const userE = await User.findOne({ email })
        if (userE) {
            res.status(409).json({ message: "A user account with this email already exists", success: false });
            return
        }
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        var admin = await Admin.create({ adminID, name, email, password: hash })
        delete admin.password;

        const token = jwt.sign({ username: adminID, designation: "admin" }, process.env.SECRET, { expiresIn: "3d" })

        res.status(200).json({ message: "Admin created successfully!", success: true, admin, token })
    } catch (error) {
        res.status(500).json({
            message: "An internal server error occurred while adding the admin: " + error.message,
            success: false,
        });
    }
})

router.get("/getAllAdmins", isAdmin, async (req, res) => {
    try {
        const admins = await Admin.find().select('-_id -password -__v')
        res.status(200).json({ message: "Success!", success: true, admins })
    } catch (error) {
        res.status(500).json({
            message: "An internal server error occurred while getting all admins' details: " + error.message,
            success: false,
        });
    }
})

module.exports = router;