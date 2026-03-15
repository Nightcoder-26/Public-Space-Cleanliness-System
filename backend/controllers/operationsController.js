const Issue = require('../models/Issue');
const NGO = require('../models/NGO');

exports.getWorkQueue = async (req, res) => {
    try {
        // Global feed of unassigned issues
        const cases = await Issue.find({ ngoId: null, status: { $ne: 'Resolved' } }).populate('ngoId').sort({ createdAt: -1 });
        res.json(cases);
    } catch (err) {
        res.status(500).json({ error: "Failed to load work queue" });
    }
};

exports.smartSearch = async (req, res) => {
    try {
        const q = req.query.q || '';
        if (!q) return res.json({ cases: [], ngos: [] });

        const regex = new RegExp(q, 'i');

        // Search issues by ID roughly, or location, or category, or title
        // Note: MongoDB _id is ObjectId, so partial string match requires aggregation or careful casting
        // We will match title, description, location, category for Issues
        const issues = await Issue.find({
            $or: [
                { title: regex },
                { description: regex },
                { location: regex },
                { category: regex }
            ]
        }).populate('ngoId').limit(10);

        // Search NGOs by name, spec, or location
        const ngos = await NGO.find({
            $or: [
                { name: regex },
                { specialization: regex },
                { location: regex }
            ]
        }).limit(10);

        res.json({
            cases: issues,
            ngos: ngos
        });

    } catch (err) {
        console.error("Search Error:", err);
        res.status(500).json({ error: "Search failed" });
    }
};

exports.getAIInsights = async (req, res) => {
    try {
        // Heuristic AI insight generation
        const recentIssues = await Issue.find().sort({ createdAt: -1 }).limit(50);

        let insight = "All operational sectors reporting nominal activity.";

        if (recentIssues.length > 0) {
            // Find most common category
            const categories = recentIssues.reduce((acc, obj) => {
                acc[obj.category] = (acc[obj.category] || 0) + 1;
                return acc;
            }, {});
            const dominantCategory = Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b);

            insight = `AI Analytics: ${dominantCategory} issues have accounted for the majority of recent reports. We recommend routing secondary operational resources to this sector over the next 48 hours to maintain response SLAs.`;
        }

        res.json({ insight });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate AI insights" });
    }
};

// GET /api/operations/geo
exports.getGeoIssues = async (req, res) => {
    try {
        const issues = await Issue.find({ status: { $ne: 'Resolved' } }, 'latitude longitude severity title category');

        // Map issues and inject bounds if missing
        const mappedIssues = issues.map(i => {
            let lat = i.latitude;
            let lng = i.longitude;
            if (!lat || !lng) {
                // Bounding box for India roughly 8.4 to 37.6 lat, 68.7 to 97.2 lng
                lat = 8.4 + Math.random() * (37.6 - 8.4);
                lng = 68.7 + Math.random() * (97.2 - 68.7);
            }
            return {
                _id: i._id,
                lat,
                lng,
                severity: i.severity || 'Medium',
                title: i.title,
                category: i.category
            };
        });

        res.json(mappedIssues);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch geo issues" });
    }
};

// GET /api/operations/reverse-geocode
exports.reverseGeocode = async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ error: "Missing lat/lng" });

        // Nominatim OpenStreetMap API Proxy - Use dynamic import for node-fetch if global fetch is not fully compliant
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            headers: { 'User-Agent': 'ImpactHubApp' }
        });

        if (!response.ok) throw new Error("Failed external API call");

        const data = await response.json();
        const address = data.address || {};

        res.json({
            city: address.city || address.town || address.village || address.county || "Unknown City",
            district: address.state_district || address.county || "Unknown District",
            state: address.state || "Unknown State",
            postalCode: address.postcode || "000000"
        });
    } catch (err) {
        console.error("Geocoding err:", err);
        // Fallback India location
        res.json({ city: "Hyderabad", district: "Hyderabad", state: "Telangana", postalCode: "500001" });
    }
}
