const express = require("express");
const router = express.Router();
const { createDonation, getRecentDonations, getProjectDonations } = require("../controllers/donationController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createDonation);
router.get("/recent", getRecentDonations);
router.get("/project/:id", getProjectDonations);

module.exports = router;
