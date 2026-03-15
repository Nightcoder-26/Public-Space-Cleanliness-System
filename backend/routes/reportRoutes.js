const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.post('/export', reportController.exportReport);

module.exports = router;
