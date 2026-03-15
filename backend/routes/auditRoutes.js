const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

router.get('/logs', auditController.getLogs);
// Internal helper to create logs from other controllers
router.post('/log', auditController.createLog);

module.exports = router;
