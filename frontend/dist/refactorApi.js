const fs = require('fs');
const path = require('path');

const dirs = ['pages', 'auth', 'components', 'js'];

function refactorFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;

    const relPath = path.relative(path.dirname(filepath), path.join(__dirname, 'js/apiConfig.js')).replace(/\\/g, '/');
    let importStmt = `import { API_BASE } from '${relPath}';\n`;

    if (filepath.endsWith('.html')) {
        let scriptRegex = /<script>([\s\S]*?)<\/script>/g;
        content = content.replace(scriptRegex, (match, scriptBody) => {
            if (scriptBody.includes('http://localhost:5000') || scriptBody.includes('https://mock-production-api.com')) {
                let newBody = `\n${importStmt}` + scriptBody;

                // Replace exact matches
                newBody = newBody.replace(/`https?:\/\/(?:localhost:5000|mock-production-api\.com)\/api`/g, '`${API_BASE}/api`');
                newBody = newBody.replace(/['"]https?:\/\/(?:localhost:5000|mock-production-api\.com)\/api['"]/g, '`${API_BASE}/api`');
                
                newBody = newBody.replace(/`https?:\/\/(?:localhost:5000|mock-production-api\.com)`/g, 'API_BASE');
                newBody = newBody.replace(/['"]https?:\/\/(?:localhost:5000|mock-production-api\.com)['"]/g, 'API_BASE');

                // Expose inline functions
                let funcs = [...newBody.matchAll(/function\s+([a-zA-Z0-9_]+)\s*\(/g)];
                let windowExports = "";
                for (let f of funcs) {
                    if (f[1] !== 'init' && f[1] !== 'handleCredentialResponse') { 
                        windowExports += `\nwindow.${f[1]} = ${f[1]};`;
                    }
                }
                if (newBody.includes('handleCredentialResponse')) {
                     windowExports += `\nwindow.handleCredentialResponse = handleCredentialResponse;`;
                }
                
                return `<script type="module">${newBody}${windowExports}\n</script>`;
            }
            return match;
        });
        
    } else if (filepath.endsWith('.js') && !filepath.includes('apiConfig')) {
        if (content.includes('http://localhost:5000') || content.includes('https://mock-production-api.com')) {
            // Only add import if not already added
            if (!content.includes('import { API_BASE }')) {
                content = importStmt + content;
            }

            content = content.replace(/`https?:\/\/(?:localhost:5000|mock-production-api\.com)\/api`/g, '`${API_BASE}/api`');
            content = content.replace(/['"]https?:\/\/(?:localhost:5000|mock-production-api\.com)\/api['"]/g, '`${API_BASE}/api`');
            
            content = content.replace(/`https?:\/\/(?:localhost:5000|mock-production-api\.com)`/g, 'API_BASE');
            content = content.replace(/['"]https?:\/\/(?:localhost:5000|mock-production-api\.com)['"]/g, 'API_BASE');
        }
    }

    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf8');
        console.log("Refactored exact matches in " + filepath);
    }
}

function walk(dir) {
    if(!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            if (!full.includes('dist')) walk(full); // Skip dist
        }
        else if (f.endsWith('.html') || (f.endsWith('.js') && !f.includes('apiConfig'))) refactorFile(full);
    }
}

dirs.forEach(d => walk(path.join(__dirname, d)));
