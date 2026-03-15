const fs = require('fs');
const path = require('path');

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    let entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        let srcPath = path.join(src, entry.name);
        let destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
                copyDir(srcPath, destPath);
            }
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Starting frontend static build...');
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
}

// Copy everything to dist
copyDir(__dirname, distPath);

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.html') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

// Replace process.env.NEXT_PUBLIC_API_URL dynamically
const files = walk(distPath);
files.forEach(f => {
    let c = fs.readFileSync(f, 'utf8');
    if (c.includes('process.env.NEXT_PUBLIC_API_URL')) {
        c = c.replace(/process\.env\.NEXT_PUBLIC_API_URL/g, `"${API_URL}"`);
        fs.writeFileSync(f, c);
        console.log(`Injected environment variables into: ${path.basename(f)}`);
    }
});

console.log(`Build complete. Output written to /dist`);
