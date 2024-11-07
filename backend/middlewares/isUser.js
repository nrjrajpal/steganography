const jwt = require("jsonwebtoken");

const isUser = async (req, res, next) => {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
        res.status(400).json({ message: "Token is missing.", success: false });
        return;
    }
    else {
        try {
            const token = authorizationHeader.split(" ")[1];
            const data = jwt.verify(token, process.env.SECRET);
            if (data.designation.toLowerCase() === "user") {
                req.username = data.username
                req.designation = data.designation
                next()
            } else {
                res.status(401).json({ message: "Unauthorized", success: false });
            }
        } catch (error) {
            res.status(401).json({ message: "An internal server error occurred while authorizing the user: " + error.message, success: false });
        }
    }
};

module.exports = isUser;
