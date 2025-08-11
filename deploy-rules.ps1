# PowerShell script to deploy Firebase rules
Write-Host "Deploying Firebase security rules..." -ForegroundColor Green

try {
    # Deploy Firestore rules
    firebase deploy --only firestore:rules
    Write-Host "Firebase rules deployed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error deploying Firebase rules: $_" -ForegroundColor Red
    Write-Host "Make sure you have Firebase CLI installed and are logged in" -ForegroundColor Yellow
    Write-Host "Run: npm install -g firebase-tools" -ForegroundColor Yellow
    Write-Host "Then: firebase login" -ForegroundColor Yellow
}

Read-Host "Press Enter to continue"