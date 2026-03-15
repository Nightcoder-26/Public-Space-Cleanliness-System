const express = require("express");
const router = express.Router();
const { getDashboardData, getPublicStats } = require("../controllers/analyticsController");
const authMiddleware = require("../middleware/authMiddleware");

// Protected Dashboard
router.get("/dashboard", authMiddleware, getDashboardData);

// Public Landing Page Stats
router.get("/stats", getPublicStats);

module.exports = router;