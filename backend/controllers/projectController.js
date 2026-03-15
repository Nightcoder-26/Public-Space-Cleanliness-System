const Project = require("../models/Project");
const Donation = require("../models/Donation");

// GET /api/projects — list with optional filters
exports.getProjects = async (req, res) => {
    try {
        const { category, search, sort } = req.query;
        const filter = {};

        if (category && category !== "all") filter.category = category;
        if (search) filter.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
        ];

        let sortObj = { createdAt: -1 }; // newest default
        if (sort === "most_funded") sortObj = { currentFunding: -1 };
        if (sort === "highest_impact") sortObj = { co2OffsetPerDollar: -1 };
        if (sort === "newest") sortObj = { createdAt: -1 };

        const projects = await Project.find(filter).sort(sortObj).lean();

        // Add progress percentage
        projects.forEach(p => {
            p.progressPct = p.fundingGoal > 0 ? Math.min(100, Math.round((p.currentFunding / p.fundingGoal) * 100)) : 0;
        });

        res.json({ success: true, count: projects.length, projects });
    } catch (err) {
        console.error("getProjects error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/projects/:id — single project
exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).lean();
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });
        project.progressPct = project.fundingGoal > 0
            ? Math.min(100, Math.round((project.currentFunding / project.fundingGoal) * 100)) : 0;
        res.json({ success: true, project });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/projects/impact
exports.getProjectImpact = async (req, res) => {
    try {
        const projects = await Project.find({}, 'title category location');

        const impactData = projects.map(p => {
            // Mock India coords
            const lat = 8.4 + Math.random() * (37.6 - 8.4);
            const lng = 68.7 + Math.random() * (97.2 - 68.7);

            return {
                _id: p._id,
                title: p.title,
                category: p.category,
                lat,
                lng,
                treesPlanted: Math.floor(Math.random() * 500) + 10,
                plasticRemoved: Math.floor(Math.random() * 2000) + 50,
                energyGenerated: Math.floor(Math.random() * 100) + 5,
                waterSaved: Math.floor(Math.random() * 10000) + 1000
            };
        });
        res.json(impactData);
    } catch (err) {
        console.error("getProjectImpact error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
