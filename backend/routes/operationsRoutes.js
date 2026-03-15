const express = require('express');
const router = express.Router();
const operationsController = require('../controllers/operationsController');

router.get('/workqueue', operationsController.getWorkQueue);
router.get('/search', operationsController.smartSearch);
router.get('/insights', operationsController.getAIInsights);

// GIS and location wrappers
router.get('/geo', operationsController.getGeoIssues);
router.get('/reverse-geocode', operationsController.reverseGeocode);

module.exports = router;
