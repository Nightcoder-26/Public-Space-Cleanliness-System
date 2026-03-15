const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, '')));

// ── ImpactHub Tab Routes ──────────────────────────────────────────────────────
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'pages/analytics.html')));
app.get('/gis-maps', (req, res) => res.sendFile(path.join(__dirname, 'pages/gis-maps.html')));
app.get('/policy-trends', (req, res) => res.sendFile(path.join(__dirname, 'pages/policy-trends.html')));
app.get('/impact-reports', (req, res) => res.sendFile(path.join(__dirname, 'pages/impact-reports.html')));

// Handle clean URLs (e.g., /auth/login -> /auth/login.html)
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        return next();
    }
    const htmlPath = path.join(__dirname, `${req.path}.html`);
    res.sendFile(htmlPath, (err) => {
        if (err) {
            next(); // If the file doesn't exist, proceed to 404
        }
    });
});

// Fallback to 404
app.use((req, res) => {
    res.status(404).send('404 - File Not Found');
});

app.listen(PORT, () => {
    console.log(`Frontend server running on http://localhost:${PORT}`);
});

