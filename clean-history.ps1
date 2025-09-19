# PowerShell script to remove secrets from git history using BFG Repo-Cleaner
$ErrorActionPreference = "Stop"

# Install BFG if not available
if (-not (Get-Command bfg -ErrorAction SilentlyContinue)) {
    Write-Host "Installing BFG Repo-Cleaner..."
    winget install BFG-Repo-Cleaner
}

# Create replacement file
@"
DATABASE_URL=***
"@ | Out-File replacements.txt -Encoding utf8

# Run BFG
bfg --replace-text replacements.txt --no-blob-protection

# Clean up
Remove-Item replacements.txt -Force
Write-Host "Run 'git reflog expire --expire=now --all && git gc --prune=now --aggressive' to complete cleanup"