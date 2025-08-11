# Firebase Setup Instructions

## Prerequisites
- Node.js installed
- Firebase project created (which you've already done ✅)
- Firebase configuration values from your project

## Step 1: Install Dependencies

Since PowerShell execution is restricted, you can use Command Prompt (cmd) instead:

1. Open Command Prompt as Administrator
2. Navigate to your project:
   ```cmd
   cd C:\Users\smile\OneDrive\Desktop\Calibre Project\calibreproject\apps\web
   ```
3. Install Firebase:
   ```cmd
   npm install firebase
   ```

## Step 2: Configure Environment Variables

1. In the `calibreproject/apps/web` directory, create a file named `.env.local`
2. Add your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

## Step 3: Run the Application

1. In Command Prompt, run:
   ```cmd
   npm run dev
   ```
2. Open your browser and go to `http://localhost:3000`

## Step 4: Initial Setup

1. Navigate to `http://localhost:3000/setup`
2. Create your admin account:
   - Enter your name
   - Enter your email
   - Create a strong password (minimum 8 characters)
   - Confirm your password
3. Click "Complete Setup"

This will:
- Create your admin user account
- Initialize the database with default products
- Set up certificate templates
- Configure system settings

## Step 5: Start Using the Application

After setup, you'll be redirected to the dashboard. You can now:
- Add test data
- Create certificates
- Manage products
- Add users with different permission levels

## Firebase Security Rules

Add these rules in your Firebase Console under Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'L1');
    }
    
    // Products - read for all authenticated, write for L1 only
    match /products/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'L1';
    }
    
    // Test data - read for all authenticated, write for L1 and L2
    match /testData/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['L1', 'L2'];
    }
    
    // Certificates - read for all authenticated, create for L1 and L2
    match /certificates/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['L1', 'L2'];
      allow update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'L1';
    }
    
    // Settings - read for all authenticated, write for L1 only
    match /settings/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'L1';
    }
    
    // Audit trail - read only, writes handled by Cloud Functions
    match /auditTrail/{document=**} {
      allow read: if request.auth != null;
      allow write: if false; // Only server-side writes
    }
  }
}
```

## Troubleshooting

### PowerShell Execution Policy Error
If you get PowerShell errors, use Command Prompt (cmd) instead of PowerShell.

### Firebase Connection Error
- Check that your `.env.local` file has the correct values
- Ensure your Firebase project is active
- Check your internet connection

### Authentication Error
- Make sure Email/Password authentication is enabled in Firebase Console
- Check that your email format is correct
- Ensure password meets minimum requirements

## Next Steps

1. **Add More Users**: Go to Users page to add team members with different roles
2. **Configure Products**: Add your 25 products in the Products page
3. **Design Certificates**: Use the Certificate Designer in Settings
4. **Start Testing**: Begin entering test data and generating certificates

## Support

For any issues:
1. Check the browser console for errors (F12)
2. Verify Firebase configuration in `.env.local`
3. Ensure all dependencies are installed
4. Check Firebase Console for any service issues 