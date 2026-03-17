const fs = require('fs');
let content = fs.readFileSync('citizen.html', 'utf8');

// Replace Stats Widgets HTML
content = content.replace(
    /<div\s*class="flex-1 bg-white[^>]*>\s*<p class="text-\[#61896f\][^>]*>Impact Points<\/p>\s*<div class="flex items-end gap-2">\s*<p id="impactPoints"([^>]+)>—<\/p>\s*<p class="text-primary text-sm font-bold pb-1 flex items-center"><span\s*class="material-symbols-outlined text-sm">trending_up<\/span>\+pts<\/p>\s*<\/div>\s*<\/div>/,
    `<div class="flex-1 bg-white dark:bg-white/5 rounded-xl border border-[#dbe6df] dark:border-white/10 p-5 flex flex-col justify-center">
                            <p class="text-[#61896f] text-xs font-bold uppercase tracking-wider mb-1">Impact Points</p>
                            <div id="impactSkeleton" class="flex items-end gap-2 animate-pulse">
                                <div class="h-10 w-24 bg-[#dbe6df] dark:bg-white/10 rounded"></div>
                            </div>
                            <div id="impactContent" class="hidden items-end gap-2">
                                <p id="impactPoints" class="text-4xl font-black tracking-tighter">—</p>
                                <p class="text-primary text-sm font-bold pb-1 flex items-center"><span class="material-symbols-outlined text-sm">trending_up</span>+pts</p>
                            </div>
                        </div>`
);

content = content.replace(
    /<div class="flex-1 bg-\[#111813\][^>]*>\s*<p class="text-white\/60[^>]*>CO₂ Saved<\/p>\s*<div class="flex items-end gap-2">\s*<p id="co2Saved"([^>]+)>—<\/p>\s*<span class="text-white\/60 text-lg font-bold pb-1">kg<\/span>\s*<\/div>\s*<\/div>/,
    `<div class="flex-1 bg-[#111813] rounded-xl p-5 flex flex-col justify-center">
                            <p class="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">CO₂ Saved</p>
                            <div id="co2Skeleton" class="flex items-end gap-2 animate-pulse">
                                <div class="h-10 w-20 bg-white/10 rounded"></div>
                            </div>
                            <div id="co2Content" class="hidden items-end gap-2">
                                <p id="co2Saved" class="text-white text-4xl font-black tracking-tighter">—</p>
                                <span class="text-white/60 text-lg font-bold pb-1">kg</span>
                            </div>
                        </div>`
);

// Replace status filter HTML
content = content.replace(
    /<div class="flex gap-2">\s*<select id="statusFilter" onchange="filterIssues\(\)"\s*class="text-xs font-semibold bg-white dark:bg-white\/10 border border-\[#dbe6df\] dark:border-white\/10 rounded-lg px-3 py-1\.5">\s*<option value="">All Statuses<\/option>\s*<option>Submitted<\/option>\s*<option>AI Verified<\/option>\s*<option>Sent to Authority<\/option>\s*<option>In Progress<\/option>\s*<option>Resolved<\/option>\s*<\/select>\s*<\/div>/,
    `<div class="flex gap-2 items-center">
                            <div class="relative hidden sm:block">
                                <span class="material-symbols-outlined absolute left-2.5 top-1.5 text-[#61896f] text-sm">search</span>
                                <input id="issueSearch" type="text" placeholder="Search issues..." autocomplete="off"
                                    class="pl-8 pr-3 py-1.5 w-40 md:w-56 text-xs font-semibold bg-white dark:bg-white/10 border border-[#dbe6df] dark:border-white/10 rounded-lg focus:outline-none focus:border-primary transition-colors" />
                            </div>
                            <select id="statusFilter"
                                class="text-xs font-semibold bg-white dark:bg-white/10 border border-[#dbe6df] dark:border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary transition-colors">
                                <option value="">All Statuses</option>
                                <option>Submitted</option>
                                <option>AI Verified</option>
                                <option>Sent to Authority</option>
                                <option>In Progress</option>
                                <option>Resolved</option>
                            </select>
                        </div>`
);


// Replace renderStats
content = content.replace(
    /function renderStats\(dash\) \{[\s\S]*?const co2Pct = Math\.min/,
    `function renderStats(dash) {
                document.getElementById('impactPoints').textContent = (dash.impactPoints || 0).toLocaleString();
                const co2 = dash.user?.co2Saved || 0;
                document.getElementById('co2Saved').textContent = co2.toFixed(1);

                document.getElementById('impactSkeleton').classList.add('hidden');
                document.getElementById('impactContent').classList.remove('hidden');
                document.getElementById('impactContent').classList.add('flex');
                document.getElementById('co2Skeleton').classList.add('hidden');
                document.getElementById('co2Content').classList.remove('hidden');
                document.getElementById('co2Content').classList.add('flex');

                // CO2 ring (goal: 50kg)
                const co2Pct = Math.min`
);

// Replace filterIssues
content = content.replace(
    /function filterIssues\(\) \{\s*const val = document\.getElementById\('statusFilter'\)\.value;\s*renderIssuesTable\(val \? allIssues\.filter\(i => i\.status === val\) : allIssues\);\s*\}/,
    `let filterTimeout;
            function filterIssues() {
                clearTimeout(filterTimeout);
                filterTimeout = setTimeout(() => {
                    const statusVal = document.getElementById('statusFilter').value;
                    const searchVal = document.getElementById('issueSearch')?.value.toLowerCase() || '';
                    
                    const filtered = allIssues.filter(i => {
                        const matchStatus = !statusVal || i.status === statusVal;
                        const matchSearch = !searchVal || 
                                            i.title?.toLowerCase().includes(searchVal) || 
                                            i.location?.toLowerCase().includes(searchVal);
                        return matchStatus && matchSearch;
                    });
                    renderIssuesTable(filtered);
                }, 300);
            }
            
            document.addEventListener('DOMContentLoaded', () => {
                const sInput = document.getElementById('issueSearch');
                if(sInput) sInput.addEventListener('input', filterIssues);
                const sFilter = document.getElementById('statusFilter');
                if(sFilter) sFilter.addEventListener('change', filterIssues);
            });`
);

fs.writeFileSync('citizen.html', content, 'utf8');
console.log('UI optimizations applied');
