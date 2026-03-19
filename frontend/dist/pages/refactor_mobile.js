const fs = require('fs');
const path = require('path');

function replaceAll(str, find, replace) {
    return str.split(find).join(replace);
}

// 1. Refactor citizen.html
let citizenHtml = fs.readFileSync('citizen.html', 'utf8');

// Global overflow and padding
citizenHtml = citizenHtml.replace('<body class="bg-background-light dark:bg-background-dark text-[#111813] dark:text-white transition-colors duration-200">', 
    '<body class="bg-background-light dark:bg-background-dark text-[#111813] dark:text-white transition-colors duration-200 overflow-x-hidden">');

// Profile Card
citizenHtml = citizenHtml.replace(
    '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">',
    '<div class="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 text-center sm:text-left w-full">'
);
citizenHtml = citizenHtml.replace(
    '<div class="flex gap-5 items-center">',
    '<div class="flex flex-col sm:flex-row gap-5 items-center w-full">'
);
citizenHtml = citizenHtml.replace(
    '<button id="editProfileBtn"\n                                class="px-4 py-2 bg-background-light dark:bg-white/10 rounded-lg text-sm font-bold border border-[#dbe6df] dark:border-white/10 hover:bg-primary hover:text-[#111813] transition-all">Edit\n                                Profile</button>',
    '<button id="editProfileBtn"\n                                class="px-4 py-2 w-full sm:w-auto bg-background-light dark:bg-white/10 rounded-lg text-sm font-bold border border-[#dbe6df] dark:border-white/10 hover:bg-primary hover:text-[#111813] transition-all">Edit\n                                Profile</button>'
);
// fallback edit btn
citizenHtml = citizenHtml.replace(
    /class="px-4 py-2 bg-background-light dark:bg-white\/10 rounded-lg text-sm font-bold border border-\[#dbe6df\] dark:border-white\/10 hover:bg-primary hover:text-\[#111813\] transition-all"/g,
    'class="px-4 py-2 w-full sm:w-auto bg-background-light dark:bg-white/10 rounded-lg text-sm font-bold border border-[#dbe6df] dark:border-white/10 hover:bg-primary hover:text-[#111813] transition-all"'
);


// Map height
citizenHtml = citizenHtml.replace(
    '#issueMap {\n            height: 340px;\n            border-radius: 0.75rem;\n            z-index: 1;\n        }',
    '#issueMap {\n            height: 250px;\n            border-radius: 0.75rem;\n            z-index: 1;\n            width: 100%;\n        }\n        @media (min-width: 768px) { #issueMap { height: 340px; } }'
);

// Table overflow-x
citizenHtml = citizenHtml.replace(
    '<div\n                        class="bg-white dark:bg-white/5 rounded-xl border border-[#dbe6df] dark:border-white/10 overflow-hidden">\n                        <table class="w-full text-left">',
    '<div\n                        class="bg-white dark:bg-white/5 rounded-xl border border-[#dbe6df] dark:border-white/10 overflow-hidden overflow-x-auto w-full">\n                        <table class="w-full text-left min-w-[600px]">'
);

// Remove duplicate bottom nav in citizen.html to rely on header.js
const footerRegex = /<!-- MOBILE BOTTOM NAV -->[\s\S]*?<\/footer>/;
citizenHtml = citizenHtml.replace(footerRegex, '<!-- MOBILE BOTTOM NAV removed; served by header.js -->');
fs.writeFileSync('citizen.html', citizenHtml);


// 2. Refactor community.html
let communityHtml = fs.readFileSync('community.html', 'utf8');

communityHtml = communityHtml.replace('<body class="bg-background-light dark:bg-background-dark font-display text-[#111813] dark:text-[#f0f4f2]">', 
    '<body class="bg-background-light dark:bg-background-dark font-display text-[#111813] dark:text-[#f0f4f2] overflow-x-hidden">');

// Composer flex gap
communityHtml = communityHtml.replace(
    '<div class="flex gap-2">\n                                    <select id="postCat"',
    '<div class="flex flex-col sm:flex-row gap-2 w-full">\n                                    <select id="postCat"'
);

// Post button
communityHtml = communityHtml.replace(
    '<div\n                                class="flex items-center justify-between border-t border-[#f0f4f2] dark:border-[#2a3e2f] pt-3">\n                                <button type="button"\n                                    onclick="document.getElementById(\'composerExtra\').classList.toggle(\'hidden\')"\n                                    class="p-2 text-[#61896f] hover:bg-primary/10 rounded-lg transition-colors text-sm font-bold flex items-center gap-1">\n                                    <span class="material-symbols-outlined text-xl">tune</span> Options\n                                </button>\n                                <button type="submit" id="submitPostBtn"\n                                    class="bg-primary text-[#111813] px-6 h-9 rounded-lg text-sm font-bold hover:brightness-105 transition-all flex items-center gap-2">\n                                    <span>Post</span><span id="postSpinner"\n                                        class="hidden material-symbols-outlined animate-spin text-sm">progress_activity</span>\n                                </button>\n                            </div>',
    `<div class="flex flex-col sm:flex-row items-center justify-between border-t border-[#f0f4f2] dark:border-[#2a3e2f] pt-3 gap-3 w-full">
                                <button type="button"
                                    onclick="document.getElementById('composerExtra').classList.toggle('hidden')"
                                    class="w-full sm:w-auto p-2 text-[#61896f] hover:bg-primary/10 rounded-lg transition-colors text-sm font-bold flex items-center justify-center sm:justify-start gap-1">
                                    <span class="material-symbols-outlined text-xl">tune</span> Options
                                </button>
                                <button type="submit" id="submitPostBtn"
                                    class="w-full sm:w-auto bg-primary text-[#111813] px-6 h-9 rounded-lg text-sm font-bold hover:brightness-105 transition-all flex items-center justify-center gap-2">
                                    <span>Post</span><span id="postSpinner"
                                        class="hidden material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                </button>
                            </div>`
);

// P-6 padding to P-4
communityHtml = communityHtml.replace(/p-6/g, 'p-4 md:p-6');

fs.writeFileSync('community.html', communityHtml);

// 3. header.js (Mobile Navigation)
let headerJs = fs.readFileSync('../components/header.js', 'utf8');

// Convert fixed px text for smaller display in panel
headerJs = headerJs.replace(/text-lg/g, 'text-base sm:text-lg');

fs.writeFileSync('../components/header.js', headerJs);

// 4. index.html (Landing Page)
let indexHtml = fs.readFileSync('../index.html', 'utf8');
indexHtml = indexHtml.replace(/px-6/g, 'px-4 md:px-6');

// Hamburger Menu Toggle Added
indexHtml = indexHtml.replace(
    '<div class="hidden md:flex space-x-8 text-sm font-medium text-slate-600">',
    `<div class="hidden md:flex space-x-8 text-sm font-medium text-slate-600">`
);

// Add mobile menu script directly to index
if(!indexHtml.includes('mobileMenu')) {
    indexHtml = indexHtml.replace(
        '<div class="flex items-center space-x-4">\n        <a class="text-sm font-semibold text-slate-700 hover:text-brand px-4 py-2 transition-colors"\n          href="auth/login.html">Log In</a>\n        <a class="bg-brand hover:bg-brand-dark text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-brand/20 active:scale-95 inline-block text-center"\n          href="auth/login.html">Get Started</a>\n      </div>',
        `
        <!-- Hamburger Button -->
        <button id="mobileMenuBtn" class="md:hidden p-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand rounded-md">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
        </button>
        <!-- Desktop Nav -->
        <div class="hidden md:flex items-center space-x-4">
            <a class="text-sm font-semibold text-slate-700 hover:text-brand px-4 md:px-6 py-2 transition-colors" href="auth/login.html">Log In</a>
            <a class="bg-brand hover:bg-brand-dark text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-brand/20 active:scale-95 inline-block text-center" href="auth/login.html">Get Started</a>
        </div>
      </div>
      
      <!-- Mobile Nav Drawer -->
      <div id="mobileMenu" class="hidden absolute top-20 left-0 w-full bg-white shadow-xl border-t border-slate-100 flex-col items-center py-6 space-y-4 md:hidden z-40">
        <a class="text-slate-600 font-semibold w-full text-center py-2 hover:bg-brand/10" href="#problem">Our Mission</a>
        <a class="text-slate-600 font-semibold w-full text-center py-2 hover:bg-brand/10" href="#how-it-works">How it Works</a>
        <a class="text-slate-600 font-semibold w-full text-center py-2 hover:bg-brand/10" href="#dashboard">Platform</a>
        <div class="h-px bg-slate-200 w-3/4 mx-auto my-2"></div>
        <a class="text-brand font-bold w-full text-center py-2" href="auth/login.html">Log In</a>
        <a class="bg-brand text-white px-8 py-3 rounded-full font-bold shadow-md w-3/4 text-center mt-2" href="auth/login.html">Get Started</a>
      </div>
      
      <script>
        document.getElementById('mobileMenuBtn').addEventListener('click', function() {
            const menu = document.getElementById('mobileMenu');
            menu.classList.toggle('hidden');
            menu.classList.toggle('flex');
        });
      </script>
        `
    );
}

// Ensure hero buttons stack on mobile and span full width
indexHtml = indexHtml.replace(
    '<div class="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">',
    '<div class="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 w-full">'
);
indexHtml = indexHtml.replace(
    '<a class="w-full sm:w-auto px-8 py-4 bg-brand text-white font-bold rounded-2xl shadow-xl shadow-brand/30 hover:shadow-brand/40 hover:-translate-y-1 transition-all inline-block text-center"',
    '<a class="w-full sm:w-auto px-6 py-4 bg-brand text-white font-bold rounded-2xl shadow-xl shadow-brand/30 hover:shadow-brand/40 transition-all inline-block text-center"'
);
indexHtml = indexHtml.replace(
    '<a class="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 border border-slate-200 font-bold rounded-2xl shadow-sm hover:bg-slate-50 transition-all inline-block text-center"',
    '<a class="w-full sm:w-auto px-6 py-4 bg-white text-slate-900 border border-slate-200 font-bold rounded-2xl shadow-sm hover:bg-slate-50 transition-all inline-block text-center"'
);

fs.writeFileSync('../index.html', indexHtml);

console.log("Refactoring applied successfully.");
