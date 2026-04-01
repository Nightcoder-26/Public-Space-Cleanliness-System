const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'frontend');
const newFavicon = '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍃</text></svg>" />';

function getAllHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllHtmlFiles(filePath, fileList);
        } else if (filePath.endsWith('.html')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const htmlFiles = getAllHtmlFiles(baseDir);
let updatedCount = 0;

for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace the existing favicon with the leaf emoji SVG
    if (/<link[^>]+rel=['"]?icon['"]?[^>]*>/i.test(content)) {
        content = content.replace(/<link[^>]+rel=['"]?icon['"]?[^>]*>/gi, newFavicon);
    } else {
        // If it somehow doesn't exist, inject it
        if (/<head[^>]*>/i.test(content)) {
            content = content.replace(/(<head[^>]*>)/i, `$1\n    ${newFavicon}`);
        }
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        updatedCount++;
    }
}

console.log(`Successfully added the leaf favicon to ${updatedCount} files.`);
