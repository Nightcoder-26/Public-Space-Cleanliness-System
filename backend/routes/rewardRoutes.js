const express = require("express");
const router = express.Router();
const rewardController = require("../controllers/rewardController");
const { protect } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

// Dashboards & general queries
router.get("/dashboard", rewardController.getDashboard);
router.get("/leaderboard", rewardController.getLeaderboard);

// Interactions
router.post("/redeem", rewardController.redeemReward);
router.post("/claim-task", rewardController.claimTask);

module.exports = router;
