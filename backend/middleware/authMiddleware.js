const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // .lean() returns a plain JS object instead of a full Mongoose
            // document — eliminates hydration overhead on every request
            req.user = await User.findById(decoded.id).select("-password").lean();

            if (!req.user) {
                return res.status(401).json({ message: "User not found" });
            }

            return next();
        } catch (error) {
            console.error("Auth error:", error.message);
            return res.status(401).json({ message: "Not authorized, token invalid" });
        }
    }

    return res.status(401).json({ message: "Not authorized, no token" });
};

module.exports = { protect };
