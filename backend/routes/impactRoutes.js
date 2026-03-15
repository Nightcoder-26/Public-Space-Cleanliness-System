const express = require('express');
const router = express.Router();
const { getDailyFootprint, getImpactOverview, getCarbonHistory } = require('../controllers/impactController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/impact/daily-footprint
router.get('/daily-footprint', protect, getDailyFootprint);

// GET /api/impact/overview
router.get('/overview', getImpactOverview);

// GET /api/impact/carbon/history
// Using standard REST pattern under impact scope
router.get('/carbon/history', getCarbonHistory);

module.exports = router;
