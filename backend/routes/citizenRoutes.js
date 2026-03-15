const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createIssue,
    getIssues,
    getMyIssues,
    getMapIssues
} = require('../controllers/issueController');

// POST /api/issues/report — submit a new issue
router.post('/report', protect, createIssue);

// GET /api/issues — all issues (authority panel)
router.get('/', protect, getIssues);

// GET /api/issues/my-issues — logged-in user's issues
router.get('/my-issues', protect, getMyIssues);

// GET /api/issues/map — issues with coords for map
router.get('/map', protect, getMapIssues);

module.exports = router;
