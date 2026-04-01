/**
 * verify_encoding.js - Verification report for encoding fix
 */
const fs   = require('fs');
const path = require('path');
const BASE = path.join(__dirname, 'frontend');

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

var files   = getAllFiles(BASE, ['.html', '.js', '.css']);
var html    = files.filter(function(f){ return f.endsWith('.html'); });

var ok = 0, warn = 0, fail = 0;

console.log('\n=======================================================');
console.log('  ENCODING VERIFICATION REPORT');
console.log('=======================================================\n');

// Check 1: All files readable as valid UTF-8
console.log('--- CHECK 1: UTF-8 readability ---');
files.forEach(function(f) {
  try {
    var c = fs.readFileSync(f, 'utf8');
    // Quick scan for common corruption byte sequences (as actual unicode chars now)
    var bad = (c.match(/\u00e2\u0080|\u00c2\u00a0|\u00f0\u009f\u0085/g) || []).length;
    if (bad > 0) {
      console.log('  [WARN]  ' + path.relative(BASE,f) + ' - ' + bad + ' suspicious sequences remain');
      warn++;
    }
  } catch(e) {
    console.log('  [FAIL]  ' + path.relative(BASE,f) + ' - not valid UTF-8: ' + e.message);
    fail++;
  }
});

// Check 2: Every HTML has charset=UTF-8
console.log('\n--- CHECK 2: Meta charset=UTF-8 in every HTML ---');
html.forEach(function(f) {
  var c = fs.readFileSync(f, 'utf8');
  if (/charset\s*=\s*["']?UTF-8["']?/i.test(c)) {
    console.log('  [PASS]  ' + path.relative(BASE,f));
    ok++;
  } else {
    console.log('  [FAIL]  ' + path.relative(BASE,f) + ' - MISSING charset meta!');
    fail++;
  }
});

// Check 3: Inter font link
console.log('\n--- CHECK 3: Inter Google Font link ---');
html.forEach(function(f) {
  var c = fs.readFileSync(f, 'utf8');
  if (/fonts\.googleapis\.com/i.test(c)) {
    console.log('  [PASS]  ' + path.relative(BASE,f));
    ok++;
  } else {
    console.log('  [MISS]  ' + path.relative(BASE,f) + ' - no Google Font link');
    warn++;
  }
});

// Check 4: Scan for known corrupted literal patterns in raw bytes
console.log('\n--- CHECK 4: Scan for remaining corrupted text literals ---');
var corruptPatterns = [
  { label: 'a-circumflex sequences', re: /â€|â‚|âœ|ðŸ|Â°|Â |Â©|Â®/ }
];
var anyCorrupt = false;
files.forEach(function(f) {
  var c = fs.readFileSync(f, 'utf8');
  corruptPatterns.forEach(function(p) {
    if (p.re.test(c)) {
      console.log('  [CORRUPT] ' + path.relative(BASE,f) + ' - ' + p.label);
      anyCorrupt = true;
      fail++;
    }
  });
});
if (!anyCorrupt) console.log('  [PASS]  No corrupted patterns found in any file.');

// Summary
console.log('\n=======================================================');
console.log('  SUMMARY: PASS=' + ok + '  WARN=' + warn + '  FAIL=' + fail);
if (fail === 0) {
  console.log('  STATUS:  ALL CLEAR - Production ready!');
} else {
  console.log('  STATUS:  ' + fail + ' issues need attention (see above)');
}
console.log('=======================================================\n');
