const express = require("express");
const router = express.Router();
const { getProjects, getProjectById, getProjectImpact } = require("../controllers/projectController");

// Static routes first before parameter routes
router.get("/impact", getProjectImpact);

router.get("/", getProjects);
router.get("/:id", getProjectById);

module.exports = router;
