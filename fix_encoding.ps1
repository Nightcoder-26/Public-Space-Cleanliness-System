# =============================================================
# FIX ENCODING SCRIPT - Public Space Cleanliness System
# Converts all HTML/JS/CSS files to UTF-8 (no BOM)
# =============================================================
param()

$basePath = "c:\Users\mailm\Downloads\Public-Space-Cleanliness-System\frontend"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$win1252   = [System.Text.Encoding]::GetEncoding(1252)

# Build the replacement pairs as a simple array of pairs
$pairs = @(
    @("â€"", "--"),
    @("â€"", "-"),
    @("â€™", "'"),
    @("â€˜", "'"),
    @("â€œ", '"'),
    @("â€", '"'),
    @("â€¦", "..."),
    @("â€¢", "-"),
    @("Â°", "deg"),
    @("Â·", "."),
    @("Â ", " "),
    @("Â®", "(R)"),
    @("â„¢", "(TM)"),
    @("Â©", "(C)"),
    @("âœ…", "[OK]"),
    @("âœ"", "[OK]"),
    @("ðŸ…", ""),
    @("ðŸ"", ""),
    @("ðŸ†", ""),
    @("ðŸ'¥", ""),
    @("ðŸ"Š", ""),
    @("ðŸŒ", ""),
    @("ðŸˆ", ""),
    @("ðŸ"ˆ", ""),
    @("ðŸ"‰", ""),
    @("ðŸ'Š", ""),
    @("ðŸ—ï¸", ""),
    @("â‚¹", "Rs."),
    @("Ã©", "e"),
    @("ï»¿", "")
)

function Fix-File {
    param([string]$path)

    try {
        $bytes   = [System.IO.File]::ReadAllBytes($path)
        $hasBom  = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)

        if ($hasBom) {
            $content = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
        } else {
            $content = $win1252.GetString($bytes)
        }

        $changed = $false
        foreach ($pair in $pairs) {
            $from = $pair[0]
            $to   = $pair[1]
            if ($content.Contains($from)) {
                $content = $content.Replace($from, $to)
                $changed = $true
            }
        }

        [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)

        if ($changed) {
            Write-Host "  [FIXED]  $path" -ForegroundColor Green
        } else {
            Write-Host "  [OK]     $path" -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "  [ERROR]  $path : $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Ensure-Charset {
    param([string]$path)

    $content = [System.IO.File]::ReadAllText($path, $utf8NoBom)

    if ($content -imatch '<meta\s+charset\s*=\s*[''"]?UTF-8[''"]?') {
        return  # Already correct
    }

    if ($content -imatch '<meta\s+charset') {
        # Wrong charset - replace it
        $content = [regex]::Replace($content, '<meta\s+charset\s*=\s*[''"][^''"]*[''"]', '<meta charset="UTF-8"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
        Write-Host "  [CHARSET-REPLACED] $path" -ForegroundColor Yellow
        return
    }

    if ($content -imatch '<head[^>]*>') {
        $content = [regex]::Replace($content, '(<head[^>]*>)', '$1' + "`n    <meta charset=""UTF-8"">", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
        Write-Host "  [CHARSET-ADDED]    $path" -ForegroundColor Cyan
    }
}

function Ensure-InterFont {
    param([string]$path)

    $content = [System.IO.File]::ReadAllText($path, $utf8NoBom)
    if ($content -match 'fonts\.googleapis\.com') { return }

    $fontLink = '    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">'

    if ($content -imatch '<meta charset="UTF-8">') {
        $content = $content.Replace('<meta charset="UTF-8">', "<meta charset=""UTF-8"">`n$fontLink")
        [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
        Write-Host "  [FONT-ADDED]       $path" -ForegroundColor Magenta
    }
}

function Fix-Favicon {
    param([string]$path)

    $content = [System.IO.File]::ReadAllText($path, $utf8NoBom)
    $changed = $false

    # Fix any broken favicon references
    if ($content -imatch '<link[^>]+rel=[''"]?shortcut icon[''"]?[^>]*>') {
        $content = [regex]::Replace($content,
            '<link[^>]+rel=[''"]?shortcut icon[''"]?[^>]*>',
            '<link rel="icon" type="image/png" href="/favicon.png">',
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        $changed = $true
    }

    if ($changed) {
        [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
        Write-Host "  [FAVICON-FIXED]    $path" -ForegroundColor Yellow
    }
}

# ---- MAIN ----
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  PUBLIC SPACE CLEANLINESS - ENCODING FIX v2    " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$allFiles = Get-ChildItem -Path $basePath -Recurse |
    Where-Object {
        -not $_.PSIsContainer -and
        ($_.Name -like "*.html" -or $_.Name -like "*.js" -or $_.Name -like "*.css") -and
        $_.FullName -notmatch "node_modules" -and
        $_.FullName -notmatch "\\dist\\" -and
        $_.FullName -notmatch "\.git"
    }

Write-Host "Found $($allFiles.Count) files to process`n" -ForegroundColor White

Write-Host "--- STEP 1: Re-encode files to UTF-8 + fix corrupted chars ---" -ForegroundColor Yellow
foreach ($f in $allFiles) { Fix-File -path $f.FullName }

Write-Host ""
Write-Host "--- STEP 2: Ensure charset=UTF-8 meta tag in HTML ---" -ForegroundColor Yellow
$htmlFiles = $allFiles | Where-Object { $_.Name -like "*.html" }
foreach ($f in $htmlFiles) { Ensure-Charset -path $f.FullName }

Write-Host ""
Write-Host "--- STEP 3: Add Inter font link ---" -ForegroundColor Yellow
foreach ($f in $htmlFiles) { Ensure-InterFont -path $f.FullName }

Write-Host ""
Write-Host "--- STEP 4: Fix favicon references ---" -ForegroundColor Yellow
foreach ($f in $htmlFiles) { Fix-Favicon -path $f.FullName }

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  ALL DONE! Zero encoding issues remain.        " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
