const fs = require('fs');
let headerJs = fs.readFileSync('header.js', 'utf8');

const targetStr = `<a href="rewards.html" class="flex flex-col items-center gap-1 \${isActive('rewards') ? 'text-primary' : 'text-[#61896f]'}">
            <span class="material-symbols-outlined">emoji_events</span>
            <span class="text-[10px] font-bold">Rewards</span>
        </a>
        <a href="impact.html" class="flex flex-col items-center gap-1 \${isActive('impact') ? 'text-primary' : 'text-[#61896f]'}">`;

const replaceStr = `<a href="rewards.html" class="flex flex-col items-center gap-1 \${isActive('rewards') ? 'text-primary' : 'text-[#61896f]'}">
            <span class="material-symbols-outlined">emoji_events</span>
            <span class="text-[10px] font-bold">Rewards</span>
        </a>
        
        <!-- Report Issue FAB (Floating Action Button) for mobile -->
        \${isActive('citizen') ? \`
        <button onclick="openReportModal ? openReportModal() : null"
            class="hidden lg:hidden size-12 -mt-8 rounded-full bg-primary text-[#111813] sm:flex flex items-center justify-center shadow-lg border-4 border-white dark:border-background-dark relative z-50 hover:scale-105 transition-transform" style="display: flex;">
            <span class="material-symbols-outlined text-2xl">add</span>
        </button>
        \` : ''}

        <a href="impact.html" class="flex flex-col items-center gap-1 \${isActive('impact') ? 'text-primary' : 'text-[#61896f]'}">`;

// Handle windows line endings vs linux line endings
const normTargetStr = targetStr.replace(/\r/g, '');
headerJs = headerJs.replace(normTargetStr, replaceStr.replace(/\r/g, ''));
headerJs = headerJs.replace(targetStr, replaceStr); // Try direct too if original had \r

fs.writeFileSync('header.js', headerJs);
console.log("Replaced successfully");
