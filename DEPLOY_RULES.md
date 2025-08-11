# Deploy Firebase Security Rules

To fix the "Missing or insufficient permissions" error, you need to deploy the security rules to Firebase.

## Option 1: Using the provided script (Windows)
1. Double-click `deploy-rules.bat`
2. Wait for the deployment to complete

## Option 2: Manual deployment
1. Open a terminal in the `calibreproject` directory
2. Run: `firebase deploy --only firestore:rules`

## Option 3: Using Firebase Console
1. Go to https://console.firebase.google.com
2. Select your project
3. Go to Firestore Database → Rules
4. Copy the contents of `firestore.rules` file
5. Paste into the rules editor
6. Click "Publish"

After deploying the rules, the permission errors should be resolved.