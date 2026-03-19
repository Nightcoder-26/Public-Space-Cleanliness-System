const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Issue = require('./models/Issue');

dotenv.config();

const GEO_RADIUS = 0.001;

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        const issues = await Issue.find({}).sort({ dateReported: 1 }); // Oldest first
        console.log(`Found ${issues.length} total issues.`);

        let deletedCount = 0;
        let mergedCount = 0;

        const primaries = [];

        for (const issue of issues) {
            // Find if there is a matching primary issue
            const matchIndex = primaries.findIndex(p => {
                if (p.category !== issue.category) return false;
                if (!p.latitude || !p.longitude || !issue.latitude || !issue.longitude) return false;

                const latDiff = Math.abs(p.latitude - issue.latitude);
                const lngDiff = Math.abs(p.longitude - issue.longitude);
                return latDiff <= GEO_RADIUS && lngDiff <= GEO_RADIUS;
            });

            if (matchIndex === -1) {
                // This is a new unique issue
                primaries.push(issue);
            } else {
                // This is a duplicate. Merge into primary and delete.
                const primary = primaries[matchIndex];
                
                // Add reportedBy if not present
                let newlyAdded = false;
                if (!primary.reportedBy.includes(issue.userId)) {
                    primary.reportedBy.push(issue.userId);
                    newlyAdded = true;
                }
                
                primary.reportCount = (primary.reportCount || 1) + 1;
                
                // Dynamic priority
                if (primary.reportCount >= 10) primary.priorityLevel = 'High';
                else if (primary.reportCount >= 4) primary.priorityLevel = 'Medium';
                else primary.priorityLevel = 'Low';

                // We will save primaries at the end, but delete the duplicate now
                await Issue.findByIdAndDelete(issue._id);
                deletedCount++;
                mergedCount++;
                console.log(`Merged duplicate issue ID: ${issue._id} into primary ID: ${primary._id}`);
            }
        }

        // Save updated primaries
        for (const primary of primaries) {
            // Only save if it was updated (reportCount > 1)
            if (primary.reportCount > 1) {
                await primary.save();
                console.log(`Updated primary issue ${primary._id} to reportCount ${primary.reportCount}`);
            }
        }

        console.log(`Migration complete. Deleted ${deletedCount} duplicate issues. Merged ${mergedCount} issues.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
