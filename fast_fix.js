const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'frontend');

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

const fontLink = '    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />\n';

let updatedCount = 0;

for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. Ensure charset=utf-8
    if (!/<meta\s+charset\s*=\s*['"]?UTF-8['"]?/i.test(content) && !/<meta\s+charset\s*=\s*['"]?utf-8['"]?/i.test(content)) {
        if (/<meta\s+charset/i.test(content)) {
            content = content.replace(/<meta\s+charset[^>]+>/i, '<meta charset="UTF-8" />');
        } else if (/<head[^>]*>/i.test(content)) {
            content = content.replace(/(<head[^>]*>)/i, '$1\n    <meta charset="UTF-8" />');
        }
    }

    // 2. Ensure Inter font
    if (!/fonts\.googleapis\.com\/css2\?family=Inter/i.test(content)) {
        if (/<meta charset="UTF-8"/i.test(content)) {
            content = content.replace(/(<meta charset="UTF-8"[^>]*>)/i, `$1\n${fontLink}`);
        } else if (/<head[^>]*>/i.test(content)) {
            content = content.replace(/(<head[^>]*>)/i, `$1\n${fontLink}`);
        }
    }

    // 3. Fix favicon
    if (/<link[^>]+rel=['"]?shortcut icon['"]?[^>]*>/i.test(content)) {
        content = content.replace(/<link[^>]+rel=['"]?shortcut icon['"]?[^>]*>/i, '<link rel="icon" type="image/png" href="/favicon.png" />');
    } else if (!/<link[^>]+rel=['"]?icon['"]?[^>]*>/i.test(content)) {
        if (/<head[^>]*>/i.test(content)) {
            content = content.replace(/(<head[^>]*>)/i, '$1\n    <link rel="icon" type="image/png" href="/favicon.png" />');
        }
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated head tags in: ${file}`);
        updatedCount++;
    }
}

console.log(`Successfully completed. Modifed ${updatedCount} files.`);
