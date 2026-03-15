const express = require("express");
const router = express.Router();
const { getImpactSummary } = require("../controllers/impactController");
const { getDashboard } = require("../controllers/citizenController");
const { protect } = require("../middleware/authMiddleware");

// GET /api/user/dashboard — full citizen dashboard data
router.get("/dashboard", protect, getDashboard);

// GET /api/user/impact-summary — donation-based impact
router.get("/impact-summary", protect, getImpactSummary);

module.exports = router;
