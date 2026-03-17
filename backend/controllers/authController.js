const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Simple in-process TTL cache for /auth/me — avoids a DB round-trip on
// every page load when the user data hasn't changed.
const meCache = new Map(); // { userId -> { data, expiresAt } }
const ME_TTL_MS = 30 * 1000; // 30 seconds

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Only fetch what we need to check existence (lean, single field)
        const userExists = await User.findOne({ email }).select("_id").lean();
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || "citizen"
        });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({ token, role: user.role });

    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Select only the fields we actually need for login
        const user = await User.findOne({ email })
            .select("_id name email role password points level xp co2Saved")
            .lean();

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (user.role !== role) {
            return res.status(400).json({ message: "Wrong account type selected" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Warm the me-cache immediately so the first /auth/me after login
        // is served from memory rather than hitting the DB again
        const safeUser = { ...user };
        delete safeUser.password;
        meCache.set(String(user._id), { data: safeUser, expiresAt: Date.now() + ME_TTL_MS });

        res.json({ token, role: user.role });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getMe = async (req, res) => {
    try {
        const userId = String(req.user._id || req.user.id);

        // Serve from in-memory cache if still fresh
        const cached = meCache.get(userId);
        if (cached && Date.now() < cached.expiresAt) {
            return res.json(cached.data);
        }

        // Cache miss — hit DB once, use .lean() for speed
        const user = await User.findById(userId).select("-password").lean();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        meCache.set(userId, { data: user, expiresAt: Date.now() + ME_TTL_MS });
        res.json(user);

    } catch (error) {
        console.error("getMe error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id || req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
        }

        const updatedUser = await user.save();

        // Invalidate the me-cache for this user
        meCache.delete(String(updatedUser._id));

        const token = jwt.sign(
            { id: updatedUser._id, role: updatedUser.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            token
        });

    } catch (error) {
        console.error("updateUser error:", error);
        res.status(500).json({ message: "Server error" });
    }
};