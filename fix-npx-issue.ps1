# Fix npx path resolution issue for MCP servers
# Run this script as Administrator

Write-Host "Fixing npx path resolution issue..." -ForegroundColor Yellow

# Check if node_modules exists in home directory
$homeNodeModules = "$env:USERPROFILE\node_modules"
$npmBinPath = "$homeNodeModules\npm\bin"

if (-not (Test-Path $homeNodeModules)) {
    Write-Host "Creating node_modules directory..." -ForegroundColor Green
    New-Item -ItemType Directory -Path $homeNodeModules -Force | Out-Null
}

if (-not (Test-Path $npmBinPath)) {
    Write-Host "Creating npm\bin directory..." -ForegroundColor Green
    New-Item -ItemType Directory -Path $npmBinPath -Force | Out-Null
}

# Get npm installation path
$npmGlobalPath = npm root -g
$npmPath = Join-Path $npmGlobalPath "npm"

if (Test-Path $npmPath) {
    Write-Host "Found npm at: $npmPath" -ForegroundColor Green

    # Create symlink or copy npm to expected location
    $targetNpmPath = Join-Path $homeNodeModules "npm"

    if (-not (Test-Path $targetNpmPath)) {
        Write-Host "Creating symlink to npm..." -ForegroundColor Green
        # Try to create junction (works without admin on Windows)
        cmd /c mklink /J "$targetNpmPath" "$npmPath" 2>&1 | Out-Null

        if (-not (Test-Path $targetNpmPath)) {
            Write-Host "Symlink failed, trying copy..." -ForegroundColor Yellow
            Copy-Item -Path $npmPath -Destination $targetNpmPath -Recurse -Force
        }
    }

    Write-Host "Fix applied! Please restart Cursor." -ForegroundColor Green
} else {
    Write-Host "Could not find npm installation. Trying alternative fix..." -ForegroundColor Yellow

    # Alternative: Reinstall npm
    Write-Host "Reinstalling npm globally..." -ForegroundColor Yellow
    npm install -g npm@latest

    Write-Host "Please restart Cursor after this completes." -ForegroundColor Green
}

Write-Host "`nIf issues persist, try:" -ForegroundColor Cyan
Write-Host "1. Reinstall Node.js from nodejs.org" -ForegroundColor Cyan
Write-Host "2. Make sure 'Add to PATH' is checked during installation" -ForegroundColor Cyan
Write-Host "3. Restart your computer after installation" -ForegroundColor Cyan


