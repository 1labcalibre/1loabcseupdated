@echo off
echo Deploying Firebase security rules...
cd /d "%~dp0"
firebase deploy --only firestore:rules
pause