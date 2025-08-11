# Fix workspace imports for Netlify deployment
Write-Host "Fixing workspace imports..."

# Get all TypeScript and TSX files in the web app
$files = Get-ChildItem -Path "apps\web" -Include "*.ts", "*.tsx" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace workspace imports with local imports
    $content = $content -replace '@workspace/ui/components/', '@/components/ui/'
    $content = $content -replace '@workspace/ui/styles/', '@/styles/'
    
    Set-Content -Path $file.FullName -Value $content
}

Write-Host "Fixed imports in $($files.Count) files"
