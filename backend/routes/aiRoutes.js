const express = require("express");
const router = express.Router();
const { getCarbonAdvice, chatAssistant, getImpactInsights } = require("../controllers/aiAdvisorController");

// POST /api/ai/carbon-advisor  — main analysis
router.post("/carbon-advisor", getCarbonAdvice);

// POST /api/ai/chat  — chat assistant
router.post("/chat", chatAssistant);

// GET /api/ai/impact-insights — ImpactHub AI modules
router.get("/impact-insights", getImpactInsights);

module.exports = router;
