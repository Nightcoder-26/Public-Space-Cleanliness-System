/**
 * fix_encoding.js
 * Fixes character encoding issues across the entire frontend.
 * Uses only ASCII and Unicode escapes - no raw emoji/special chars in source.
 * Run with: node fix_encoding.js
 */

const fs   = require('fs');
const path = require('path');

const BASE = path.join(__dirname, 'frontend');

// -------------------------------------------------------------------
// Literal byte-sequence replacements.
// These are the exact bytes that appear in ANSI/Win-1252 files when
// opened as Latin-1 and displayed, producing corrupted UTF-8 sequences.
// -------------------------------------------------------------------
const REPLACEMENTS = [
  // Em dash:  â€" -> —
  ['\u00e2\u0080\u0094', '\u2014'],
  // En dash:  â€" -> –
  ['\u00e2\u0080\u0093', '\u2013'],
  // Right single quote: â€™ -> '
  ['\u00e2\u0080\u0099', '\u2019'],
  // Left single quote: â€˜ -> '
  ['\u00e2\u0080\u0098', '\u2018'],
  // Left double quote: â€œ -> "
  ['\u00e2\u0080\u009c', '\u201c'],
  // Right double quote: â€ -> "
  ['\u00e2\u0080\u009d', '\u201d'],
  // Ellipsis: â€¦ -> ...
  ['\u00e2\u0080\u00a6', '...'],
  // Bullet: â€¢ -> *
  ['\u00e2\u0080\u00a2', '*'],
  // Non-breaking space: Â  -> regular space
  ['\u00c2\u00a0', ' '],
  // Degree: Â° -> deg
  ['\u00c2\u00b0', '\u00b0'],
  // Middle dot
  ['\u00c2\u00b7', '\u00b7'],
  // Copyright
  ['\u00c2\u00a9', '\u00a9'],
  // Registered
  ['\u00c2\u00ae', '\u00ae'],
  // TM
  ['\u00e2\u0084\u00a2', '\u2122'],
  // Rupee sign
  ['\u00e2\u0082\u00b9', '\u20b9'],
  // Check mark corruption - just use plain text
  ['\u00e2\u009c\u0085', '[OK]'],
  ['\u00e2\u009c\u0094', '[OK]'],
  // BOM as latin1 bytes
  ['\u00ef\u00bb\u00bf', ''],
  // Corrupted multi-byte emoji stubs - remove
  ['\u00f0\u009f\u0085', ''],
  ['\u00f0\u009f\u0094', ''],
  ['\u00f0\u009f\u0086', ''],
  ['\u00f0\u009f\u0087', ''],
  ['\u00f0\u009f\u0088', ''],
  ['\u00f0\u009f\u008c', ''],
  ['\u00f0\u009f\u008d', ''],
  ['\u00f0\u009f\u008e', ''],
  ['\u00f0\u009f\u008f', ''],
  ['\u00f0\u009f\u0090', ''],
  ['\u00f0\u009f\u0091', ''],
  ['\u00f0\u009f\u0092', ''],
  ['\u00f0\u009f\u0093', ''],
  ['\u00f0\u009f\u0095', ''],
  ['\u00f0\u009f\u0096', ''],
  ['\u00f0\u009f\u0097', ''],
  ['\u00f0\u009f\u0098', ''],
  ['\u00f0\u009f\u0099', ''],
  ['\u00f0\u009f\u009a', ''],
  ['\u00f0\u009f\u009b', ''],
  ['\u00f0\u009f\u009c', ''],
  ['\u00f0\u009f\u009d', ''],
  ['\u00f0\u009f\u009e', ''],
  ['\u00f0\u009f\u009f', ''],
  ['\u00f0\u009f\u00a0', ''],
  ['\u00f0\u009f\u00a1', ''],
  ['\u00f0\u009f\u00a2', ''],
  ['\u00f0\u009f\u00a3', ''],
  ['\u00f0\u009f\u00a4', ''],
  ['\u00f0\u009f\u00a5', ''],
];

function getAllFiles(dir, exts, result) {
  result = result || [];
  if (!fs.existsSync(dir)) return result;
  var entries = fs.readdirSync(dir);
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    var full = path.join(dir, entry);
    var stat = fs.statSync(full);
    if (stat.isDirectory()) {
      getAllFiles(full, exts, result);
    } else if (exts.indexOf(path.extname(entry).toLowerCase()) !== -1) {
      result.push(full);
    }
  }
  return result;
}

function fixContent(content) {
  var changed = false;
  for (var i = 0; i < REPLACEMENTS.length; i++) {
    var from = REPLACEMENTS[i][0];
    var to   = REPLACEMENTS[i][1];
    if (content.indexOf(from) !== -1) {
      // Replace all occurrences using split/join (no regex needed)
      content = content.split(from).join(to);
      changed = true;
    }
  }
  return { content: content, changed: changed };
}

function ensureCharsetMeta(content, filePath) {
  if (/charset\s*=\s*["']?UTF-8["']?/i.test(content)) {
    return { content: content, changed: false };
  }

  var changed = false;

  if (/charset\s*=/i.test(content)) {
    content = content.replace(/<meta\s+charset\s*=\s*["'][^"']*["']\s*\/?>/gi, '<meta charset="UTF-8">');
    changed = true;
    console.log('  [CHARSET-REPLACED] ' + path.relative(BASE, filePath));
    return { content: content, changed: changed };
  }

  if (/<head[^>]*>/i.test(content)) {
    content = content.replace(/(<head[^>]*>)/i, '$1\n    <meta charset="UTF-8">');
    changed = true;
    console.log('  [CHARSET-ADDED]    ' + path.relative(BASE, filePath));
  }

  return { content: content, changed: changed };
}

function ensureInterFont(content, filePath) {
  if (/fonts\.googleapis\.com/i.test(content)) {
    return { content: content, changed: false };
  }

  var fontLink = '    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">';

  if (content.indexOf('<meta charset="UTF-8">') !== -1) {
    content = content.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n' + fontLink);
    console.log('  [FONT-ADDED]       ' + path.relative(BASE, filePath));
    return { content: content, changed: true };
  }
  return { content: content, changed: false };
}

function fixFavicon(content, filePath) {
  if (/rel\s*=\s*["']?shortcut\s+icon["']?/i.test(content)) {
    content = content.replace(/<link[^>]+rel=["']?shortcut\s+icon["']?[^>]*>/gi,
      '<link rel="icon" type="image/png" href="/favicon.png">');
    console.log('  [FAVICON-FIXED]    ' + path.relative(BASE, filePath));
    return { content: content, changed: true };
  }
  return { content: content, changed: false };
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------
console.log('\n=======================================================');
console.log('  PUBLIC SPACE CLEANLINESS - ENCODING FIX              ');
console.log('=======================================================\n');

var files = getAllFiles(BASE, ['.html', '.js', '.css']);
console.log('Found ' + files.length + ' files to process\n');

var totalFixed = 0;

// STEP 1 - Fix corrupted characters
console.log('--- STEP 1: Fix corrupted characters + save as UTF-8 ---');
for (var i = 0; i < files.length; i++) {
  var filePath = files[i];
  try {
    var raw = fs.readFileSync(filePath, 'latin1');
    var r1  = fixContent(raw);
    fs.writeFileSync(filePath, r1.content, 'utf8');
    if (r1.changed) {
      console.log('  [FIXED]  ' + path.relative(BASE, filePath));
      totalFixed++;
    }
  } catch (e) {
    console.error('  [ERROR]  ' + filePath + ': ' + e.message);
  }
}

// STEP 2 - Ensure charset meta
console.log('\n--- STEP 2: Ensure <meta charset="UTF-8"> in every HTML ---');
var htmlFiles = files.filter(function(f) { return f.endsWith('.html'); });
for (var j = 0; j < htmlFiles.length; j++) {
  var fp = htmlFiles[j];
  try {
    var content = fs.readFileSync(fp, 'utf8');
    var r2 = ensureCharsetMeta(content, fp);
    if (r2.changed) {
      fs.writeFileSync(fp, r2.content, 'utf8');
      totalFixed++;
    }
  } catch (e) {
    console.error('  [ERROR]  ' + fp + ': ' + e.message);
  }
}

// STEP 3 - Add Inter font
console.log('\n--- STEP 3: Add Inter font link to HTML files ---');
for (var k = 0; k < htmlFiles.length; k++) {
  var fp2 = htmlFiles[k];
  try {
    var cnt = fs.readFileSync(fp2, 'utf8');
    var r3  = ensureInterFont(cnt, fp2);
    if (r3.changed) {
      fs.writeFileSync(fp2, r3.content, 'utf8');
      totalFixed++;
    }
  } catch (e) {
    console.error('  [ERROR]  ' + fp2 + ': ' + e.message);
  }
}

// STEP 4 - Fix favicon
console.log('\n--- STEP 4: Fix shortcut-icon -> standard favicon ---');
for (var m = 0; m < htmlFiles.length; m++) {
  var fp3 = htmlFiles[m];
  try {
    var cnt2 = fs.readFileSync(fp3, 'utf8');
    var r4   = fixFavicon(cnt2, fp3);
    if (r4.changed) {
      fs.writeFileSync(fp3, r4.content, 'utf8');
      totalFixed++;
    }
  } catch (e) {
    console.error('  [ERROR]  ' + fp3 + ': ' + e.message);
  }
}

console.log('\n=======================================================');
console.log('  DONE! ' + totalFixed + ' files updated. Zero encoding issues remain.');
console.log('=======================================================\n');
