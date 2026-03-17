const fs = require('fs');
let content = fs.readFileSync('citizen.html', 'utf8');

// Replace imports
content = content.replace(
    /import \{ API_BASE \} from '\.\.\/js\/apiConfig\.js';/,
    "import { API_BASE, apiFetch } from '../js/apiConfig.js';\nimport { getSocket } from '../js/socket.js';"
);

// Replace INIT Promise.all
content = content.replace(
    /loadDashboard\(\);\s*loadDailyFootprint\(\);\s*initMap\(\);\s*setDefaultDateTime\(\);\s*initSocket\(\);/,
    `initMap();
                setDefaultDateTime();
                initSocket();
                
                // Parallel fetching
                Promise.all([
                    loadDashboard(),
                    loadDailyFootprint(),
                    loadMapIssues()
                ]);`
);

// Replace loadDashboard
content = content.replace(
    /async function loadDashboard\(\) \{[\s\S]*?renderIssuesTable\(\[\]\);\n\s*\}/,
   `async function loadDashboard() {
                try {
                    // Check cache first
                    const cachedUser = sessionStorage.getItem('citizen_user');
                    const cachedDash = sessionStorage.getItem('citizen_dash_data');
                    const cacheTime = sessionStorage.getItem('citizen_dash_time');
                    const now = Date.now();
                    
                    let user = null;
                    let dash = { reportedIssues: [], achievements: [], aiInsights: {} };

                    if (cachedUser && cachedDash && cacheTime && now - parseInt(cacheTime) < 30000) {
                        user = JSON.parse(cachedUser);
                        dash = JSON.parse(cachedDash);
                    } else {
                        // Parallel fetch for profile and dashboard info
                        const [profileRes, dashRes] = await Promise.all([
                            apiFetch('/api/auth/me'),
                            apiFetch('/api/user/dashboard').catch(() => null)
                        ]);
                        
                        if (profileRes) user = profileRes;
                        if (dashRes) dash = dashRes;
                        
                        if (user && dash) {
                            sessionStorage.setItem('citizen_user', JSON.stringify(user));
                            sessionStorage.setItem('citizen_dash_data', JSON.stringify(dash));
                            sessionStorage.setItem('citizen_dash_time', now.toString());
                        }
                    }

                    renderProfile(dash.user || user);
                    renderStats(dash);
                    renderAchievements(dash.achievements || []);
                    renderAIInsights(dash.aiInsights || {});
                    
                    allIssues = dash.reportedIssues || [];
                    renderIssuesTable(allIssues);
                } catch (err) {
                    console.error('Dashboard load error:', err);
                    renderIssuesTable([]);
                }
            }`
);

// Replace loadDailyFootprint
content = content.replace(
    /async function loadDailyFootprint\(\) \{[\s\S]*?catch \(e\) \{ console\.log\('Carbon footprint load error:', e\.message\); \}\n\s*\}/,
    `async function loadDailyFootprint() {
                try {
                    const data = await apiFetch('/api/impact/daily-footprint');
                    if (!data || !data.success) return;

                    const { dailyCarbon, goal, progressPercentage, belowGoal } = data;

                    // Update ring
                    document.getElementById('co2Pct').textContent = progressPercentage + '%';
                    const ring = document.getElementById('co2Ring');
                    ring.style.stroke = belowGoal ? '#22c55e' : '#13ec5b';
                    setTimeout(() => {
                        ring.style.strokeDashoffset = 251.2 * (1 - progressPercentage / 100);
                    }, 400);

                    // Update labels
                    document.getElementById('carbonLabel').textContent = \`\${dailyCarbon} / \${goal} kg CO₂\`;
                    document.getElementById('carbonProgress').textContent = \`Progress: \${progressPercentage}%\`;

                    // Success indicator
                    if (belowGoal) {
                        const successEl = document.getElementById('carbonSuccess');
                        successEl.classList.remove('hidden');
                        successEl.classList.add('flex');
                    }
                } catch (e) { console.log('Carbon footprint load error:', e.message); }
            }`
);

// Replace socket.io
content = content.replace(
    /function initSocket\(\) \{[\s\S]*?catch \(e\) \{ console\.log\('Socket init error:', e\.message\); \}\n\s*\}/,
    `function initSocket() {
                try {
                    const socket = getSocket();
                    if (!socket) return;
                    socket.on('new-issue', (issue) => {
                        console.log('Live new issue received:', issue.title);
                        mapIssuesCache.push(issue);
                        refilterMap();
                        rebuildHeatmap();
                    });
                } catch (e) { console.log('Socket init error:', e.message); }
            }`
);

// Replace loadMapIssues
content = content.replace(
    /async function loadMapIssues\(\) \{[\s\S]*?catch \(e\) \{ console\.log\('Map load:', e\.message\); \}\n\s*\}/,
    `async function loadMapIssues() {
                try {
                    const data = await apiFetch('/api/issues/map');
                    if (!data) return;
                    mapIssuesCache = data.issues || [];
                    refilterMap();
                    rebuildHeatmap();
                    if (mapIssuesCache.length > 0) {
                        const bounds = mapIssuesCache.map(i => [i.latitude, i.longitude]);
                        map.fitBounds(bounds, { padding: [30, 30] });
                    }
                } catch (e) { console.log('Map load:', e.message); }
            }`
);

// Replace fetch in submitReport
content = content.replace(
    /const res = await fetch\(`\$\{API\}\/api\/issues\/report`, \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json', Authorization: `Bearer \$\{token\}` \},\s*body: JSON\.stringify\(payload\)\s*\}\);\s*const data = await res\.json\(\);\s*if \(!res\.ok\) throw new Error\(data\.message \|\| 'Submission failed'\);/,
    `const data = await apiFetch('/api/issues/report', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                    if (!data) throw new Error('Submission failed');`
);

// Replace saveProfile body
content = content.replace(
    /async function saveProfile\(e\) \{[\s\S]*?\}\n\s*\}\n\s*catch \{ alert\('Network error\. Try again\.'\); \}\n\s*\}/,
    `async function saveProfile(e) {
                e.preventDefault();
                const bodyData = {
                    name: document.getElementById('editNameInput').value.trim(),
                    email: document.getElementById('editEmailInput').value.trim()
                };
                const pw = document.getElementById('editPasswordInput').value.trim();
                if (pw) bodyData.password = pw;
                try {
                    const data = await apiFetch('/api/auth/me', {
                        method: 'PUT',
                        body: JSON.stringify(bodyData)
                    });
                    if (data) {
                        if (data.token) localStorage.setItem('token', data.token);
                        document.getElementById('profileDisplayName').textContent = data.name;
                        document.getElementById('sidebarName').textContent = data.name;
                        document.getElementById('profileEdit').classList.add('hidden');
                        document.getElementById('profileView').classList.remove('hidden');
                        
                        // Clear cache on profile update
                        sessionStorage.removeItem('citizen_user');
                        sessionStorage.removeItem('citizen_dash_data');
                    } else { alert('Failed to update profile.'); }
                } catch { alert('Network error. Try again.'); }
            }`
);

fs.writeFileSync('citizen.html', content, 'utf8');
console.log('Refactoring complete!');
