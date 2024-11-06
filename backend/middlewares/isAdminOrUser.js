const jwt = require("jsonwebtoken");

const isAdminOrUser = async (req, res, next) => {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
        res.status(400).json({ error: "Token is missing.", success: false });
        return;
    }
    else {
        try {
            const token = authorizationHeader.split(" ")[1];
            const data = jwt.verify(token, process.env.SECRET);
            if (data.designation.toLowerCase() === "admin") {
                req.username = data.username
                req.designation = data.designation
                // console.log(req.username)
                next()
            } else if (data.designation.toLowerCase() === "user") {
                req.username = data.username
                req.designation = data.designation
                // console.log(req.username)
                next()
            } else {
                res.status(401).json({ message: "Unauthorized", success: false });
            }
        } catch (error) {
            res.status(401).json({ message: "An internal server error occurred while authorizing the admin/user: " + error.message, success: false });
        }
    }
};

module.exports = isAdminOrUser;