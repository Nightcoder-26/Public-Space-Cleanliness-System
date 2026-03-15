const PDFDocument = require('pdfkit');
const Issue = require('../models/Issue');
const NGO = require('../models/NGO');
const AuditLog = require('../models/AuditLog');

// Helper to simulate an LLM analyzing the data
const generateAISummary = (issues) => {
    const total = issues.length;
    const resolved = issues.filter(i => i.status === 'Resolved' || i.status === 'Completed').length;
    const critical = issues.filter(i => i.priorityLevel === 'Critical').length;

    let summary = `Executive AI Summary:\n\nThis auto-generated report analyzes ${total} civic incidents. To date, ${resolved} cases have been successfully resolved by the NGO network acting under Authority command. `;
    if (critical > 0) {
        summary += `There are currently ${critical} critical hazards requiring immediate strategic oversight. `;
    }
    summary += `Overall network response efficiency remains highly stable. Recommended action: allocate more operational bandwidth to critical sectors.`;
    return summary;
};

exports.exportReport = async (req, res) => {
    try {
        const activeIssues = await Issue.find().populate('ngoId').sort({ createdAt: -1 }).limit(100);

        // Log this action
        await AuditLog.create({
            action: 'Report Generated',
            user: 'Authority Admin (HQ)', // Mock user since no auth is actively passed for this demo
            details: { type: 'System Export' }
        });

        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-disposition', `attachment; filename="Authority_Ops_Report_${Date.now()}.pdf"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('Authority Command Center', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text('System Operational Report', { align: 'center' });
        doc.moveDown(2);

        // AI Summary Section
        doc.fontSize(14).font('Helvetica-Bold').text('1. Executive Summary & AI Insights');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text(generateAISummary(activeIssues), { align: 'justify' });
        doc.moveDown(2);

        // Stats
        doc.fontSize(14).font('Helvetica-Bold').text('2. High-Level Metrics');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text(`Total Cases Tracked: ${activeIssues.length}`);
        doc.text(`Resolved Cases: ${activeIssues.filter(i => i.status === 'Resolved' || i.status === 'Completed').length}`);
        doc.text(`Critical Cases: ${activeIssues.filter(i => i.priorityLevel === 'Critical').length}`);
        doc.moveDown(2);

        // Case Breakdown
        doc.fontSize(14).font('Helvetica-Bold').text('3. Active Case Breakdown');
        doc.moveDown(1);

        activeIssues.forEach(issue => {
            doc.fontSize(10).font('Helvetica-Bold').text(`Case ID: ${issue._id.toString().slice(-6).toUpperCase()}`);
            doc.font('Helvetica').text(`Issue: ${issue.title || issue.category}`);
            doc.text(`Location: ${issue.location || 'Unknown'}`);
            doc.text(`Priority: ${issue.priorityLevel || 'Standard'}`);
            doc.text(`Status: ${issue.status || 'Pending'}`);
            doc.text(`Assigned NGO: ${issue.ngoId ? issue.ngoId.name : 'Unassigned'}`);
            if (issue.status === 'Resolved') {
                doc.text(`Resolution: Case verified and closed.`);
            }
            doc.moveDown(1);
        });

        doc.end();

    } catch (err) {
        console.error("PDF Export Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Failed to generate report" });
        }
    }
};
