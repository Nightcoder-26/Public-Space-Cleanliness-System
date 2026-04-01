const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all HTML and JS files in frontend
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.html') || file.endsWith('.js')) {
                 arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

const files = getAllFiles('./frontend');

const replacements = [
    { regex: /<text y=%22\.9em%22 font-size=%2290%22>(?:Â¿|ï¿½|)<\/text><\/svg>">/g, replace: '' },
    { regex: /Ã¢Â”Â€/g, replace: '—' },
    { regex: /ÃƒÂ¢Ã¢Â‚Â¬Ã‚Â¢/g, replace: '•' },
    { regex: /ÃƒÂ¢Ã¢Â‚Â¬”/g, replace: '—' },
    { regex: /ÃƒÂ¢Ã¢Â‚Â¬“/g, replace: '—' },
    { regex: /ÃƒÂ¢Ã¢Â€ÂšÃ¢Â€Âš/g, replace: '₂' },
    { regex: /Ã¢Â‚Â‚/g, replace: '₂' },
    { regex: /COÃƒÂ¢Ã¢Â€ÂšÃ¢Â€Âš/g, replace: 'CO₂' }, // Just in case
    { regex: /Ãƒ°Ã…Â¸’Ã‚Â¡/g, replace: '💡' },
    { regex: /Ãƒ°Ã…Â¸Ã…Â½Ã¢Â€°/g, replace: '🎉' },
    { regex: /ÃƒÂ¢Ã‚Â Ã…Â’/g, replace: '❌' },
    { regex: /ÃƒÂ¢Ã…Â““/g, replace: '✓' },
    { regex: /ÃƒÂ¢Ã…Â“Ã‹Â†Ã¯Â¸Â /g, replace: '✈️' },
    { regex: /â€”/g, replace: '—' },
    { regex: /â€¢/g, replace: '•' },
    { regex: /â€“/g, replace: '—' },
    { regex: /â‚‚/g, replace: '₂' },
    { regex: /ðŸ’¡/g, replace: '💡' },
    { regex: /ðŸŽ‰/g, replace: '🎉' },
    { regex: /ðŸ› ï¸/g, replace: '🛍️' },
    { regex: /ðŸ¥¦/g, replace: '🥦' },
    { regex: /ðŸš—/g, replace: '🚗' },
    { regex: /ðŸ  /g, replace: '🏠' },
    { regex: /ðŸ“ /g, replace: '📈' },
    { regex: /ðŸ¤ /g, replace: '🤝' },
    { regex: /ðŸ‘¥/g, replace: '👥' },
    { regex: /ðŸŸ¢/g, replace: '🟢' },
    { regex: /ðŸŸ¡/g, replace: '🟡' }
];

let totalChanges = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    replacements.forEach(r => {
        content = content.replace(r.regex, r.replace);
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Cleaned ${file}`);
        totalChanges++;
    }
});

console.log(`\nFinished cleaning. Updated ${totalChanges} files.`);
