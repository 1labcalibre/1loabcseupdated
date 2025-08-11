# Firestore Rules Fix for Permission Denied Error

## Issue Description
The error `FirebaseError: [code=permission-denied]: Missing or insufficient permissions` was occurring because of Firestore security rules that were causing circular dependencies when admin users tried to access the users collection with real-time listeners.

## Root Cause
The original `isAdmin()` function was trying to access the user's own document to check their role, which created permission conflicts when using `onSnapshot` listeners on the users collection.

## Changes Made

### 1. Enhanced Security Rules
Updated `calibreproject/firestore.rules` with the following improvements:

#### Before:
```javascript
function isAdmin() {
  return isAuthenticated() && 
    (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'L1' ||
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'L2');
}

match /users/{userId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin() || request.auth.uid == userId;
}
```

#### After:
```javascript
function isAdmin() {
  return isAuthenticated() && 
    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
    (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'L1' ||
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'L2');
}

match /users/{userId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update: if isAuthenticated() && 
    (request.auth.uid == userId || 
     exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'L1');
  allow delete: if isAuthenticated() && 
    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'L1' &&
    request.auth.uid != userId; // Cannot delete own account
}
```

### 2. Enhanced Error Handling
Updated the users service and component to handle permission errors gracefully:

#### Users Service (`calibreproject/apps/web/lib/firebase/services/users.ts`):
- Added error callback to `onSnapshot`
- Fallback to single fetch if subscription fails
- Better error logging

#### Users Page Component (`calibreproject/apps/web/app/users/page.tsx`):
- Added try-catch around subscription setup
- Graceful fallback if real-time updates fail
- Improved error handling for unsubscribe

## Key Improvements

### 1. Added `exists()` Checks
```javascript
exists(/databases/$(database)/documents/users/$(request.auth.uid))
```
This prevents errors when trying to access user documents that might not exist.

### 2. Granular Permissions
- **Read**: All authenticated users can read user profiles
- **Create**: All authenticated users can create user profiles
- **Update**: Users can update their own profile, L1 admins can update any profile
- **Delete**: Only L1 admins can delete users, but not their own account

### 3. Self-Protection
```javascript
request.auth.uid != userId // Cannot delete own account
```
Prevents admins from accidentally deleting their own accounts.

### 4. Fallback Mechanisms
- Real-time subscription with error handling
- Fallback to single fetch if subscription fails
- Graceful degradation of functionality

## How to Deploy

### 1. Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Deploy Firestore Rules
```bash
cd calibreproject
firebase deploy --only firestore:rules
```

### 4. Verify Deployment
- Go to Firebase Console
- Navigate to Firestore Database
- Click on "Rules" tab
- Verify the rules are updated

## Testing the Fix

### 1. Clear Browser Cache
- Clear browser cache and localStorage
- Refresh the application

### 2. Test User Management
- Navigate to Users page
- Verify users list loads without errors
- Test real-time updates (add/edit/delete users)
- Check browser console for any remaining errors

### 3. Test Different User Roles
- Test with L1 admin account
- Test with L2 user account
- Test with L3 user account
- Verify appropriate permissions for each role

## Expected Results

After deploying these changes:

1. ✅ **No more permission denied errors** in browser console
2. ✅ **Real-time user list updates** work correctly
3. ✅ **Admin user management** functions properly
4. ✅ **Secure user deletion** with proper restrictions
5. ✅ **Graceful error handling** if permissions fail

## Additional Security Features

### 1. Role-Based Access Control
- L1 admins can manage all users
- Users can only edit their own profiles
- Proper permission validation

### 2. Audit Trail Ready
- Rules support audit trail creation
- Proper logging of user actions

### 3. Machine Access Control
- Support for machine-specific permissions
- Granular test permissions

## Troubleshooting

If permission errors persist:

1. **Check Firebase Console**: Verify rules are deployed
2. **Clear Cache**: Clear browser cache and localStorage
3. **Check User Role**: Ensure current user has proper role in Firestore
4. **Verify Auth**: Ensure user is properly authenticated
5. **Check Logs**: Look for specific error messages in browser console

## Migration Notes

These changes are backward compatible and don't require any database migrations. Existing user data will continue to work with the new rules.
