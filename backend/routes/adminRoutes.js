const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Admin = require("../models/adminModel")
const User = require("../models/userModel")

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

router.post("/updateAdmin", async (req, res) => {
    try {
        const { name, adminID, password,email } = req.body;
        if (adminID == null || name == null || email == null) {
            res.status(400).json({ message: "The request body doesn't contain all the fields that are required to update admin", success: false });
            return
        }

        const existingAdmin = await Admin.findOne({ adminID });
        let updatedFields;
        if (existingAdmin) {
            const adminE = await Admin.findOne({ email })
            if (adminE && email!== adminE.email) {
                res.status(409).json({ message: "An admin account with this email already exists", success: false });
                return
            }
            const userE = await User.findOne({ email })
            if (userE) {
                res.status(409).json({ message: "A user account with this email already exists", success: false });
                return
            }

            if(password == null){
                updatedFields = { name, password:existingAdmin.password, email, joiningDate:existingAdmin.joiningDate };
            }
            else{
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(password, salt);
                updatedFields = { name, password:hash, email, joiningDate:existingAdmin.joiningDate };
            }
            const updatedDocument = await Admin.findOneAndUpdate(
                { adminID },
                updatedFields,
                { new: true }
            );

            if (updatedDocument) {
                res.status(200).json({ message:"Update Admin details", admin:updatedDocument,success: true });
            } else {
                res.status(500).json({ message: "Failed to update admin.", success: false });
            }
        } else {
            res.status(404).json({
                error: `Admin with adminID ${adminID} does not exist.`,
                success: false
            });
        }
    } catch (error) {
        console.error("An error occurred while updating the admin:", error);
        res.status(500).json({
            error: "An internal server error occurred while updating the admin.",
            success: false
        });
    }
});

module.exports = router