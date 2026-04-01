/**
 * patch_heads.js
 * Surgically fixes the head sections of index.html that got corrupted by edits.
 */
var fs = require('fs');

function fixFile(filePath, patches) {
  var content = fs.readFileSync(filePath, 'utf8');
  var original = content;

  patches.forEach(function(p) {
    if (content.indexOf(p.find) !== -1) {
      content = content.replace(p.find, p.replace);
      console.log('  [PATCHED] ' + p.label + ' in ' + filePath);
    } else {
      console.log('  [SKIP]   ' + p.label + ' (pattern not found)');
    }
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  [SAVED]  ' + filePath);
  }
}

// ------------------------------------------------------------------
// index.html patches
// ------------------------------------------------------------------
fixFile('frontend/index.html', [
  // Remove duplicate DOCTYPE
  {
    label: 'Duplicate DOCTYPE',
    find: '<!DOCTYPE html>\n<!DOCTYPE html>',
    replace: '<!DOCTYPE html>'
  },
  // Remove the Windows-style duplicate too
  {
    label: 'Duplicate DOCTYPE (CRLF)',
    find: '<!DOCTYPE html>\r\n<!DOCTYPE html>',
    replace: '<!DOCTYPE html>'
  },
  // Restore missing head elements after charset meta
  {
    label: 'Restore head elements',
    find: '<meta charset="UTF-8">\n  theme: {',
    replace: '<meta charset="UTF-8">\n  <meta content="width=device-width, initial-scale=1.0" name="viewport" />\n  <title>Public Space Cleanliness Rating System | Clean Cities, Smart Solutions</title>\n  <link rel="icon" type="image/png" href="/favicon.png">\n  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">\n  <!-- Animation Libraries -->\n  <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">\n  <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"><\/script>\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/vanilla-tilt/1.8.0/vanilla-tilt.min.js"><\/script>\n  <!-- BEGIN: External Scripts -->\n  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"><\/script>\n  <script>\n    tailwind.config = {\n      theme: {'
  }
]);

console.log('');
console.log('Done patching index.html');
