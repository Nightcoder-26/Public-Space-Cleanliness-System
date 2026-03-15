const express = require('express');
const router = express.Router();
const authorityController = require('../controllers/authorityController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard', authorityController.getDashboardStats);
router.get('/issues', authorityController.getActiveIssues);
router.get('/ngos/leaderboard', authorityController.getNGOLeaderboard);
router.post('/issues/:id/accept', authorityController.acceptIssue);
router.post('/issues/:id/resolve', authorityController.resolveIssue);

module.exports = router;
