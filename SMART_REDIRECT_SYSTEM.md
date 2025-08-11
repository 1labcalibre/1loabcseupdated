# Smart Role-Based Redirect System

## Overview
The smart redirect system automatically routes users to their appropriate landing page based on their role and permissions, instead of always directing them to the main dashboard.

## User Landing Pages by Role

### 🔒 L1 (Admin) - Full Access
**Landing Page:** Dashboard (`/`)
- **Reason:** Admins need overview of entire system
- **Full Access:** All pages and functions available

### 📊 L2 (Lab In-charge) - Batch & Hold Management  
**Landing Page:** Batch Selection (`/batch-selection`)
- **Reason:** Primary work area for L2 users
- **Fallback Order:**
  1. `/batch-selection` (preferred)
  2. `/hold-management` 
  3. `/pending-tests`
  4. Dashboard if others unavailable

### 📋 L3 (Certificate) - Certificate Management
**Landing Page:** Certificates (`/certificates`)
- **Reason:** Primary work area for L3 users
- **Fallback:** Dashboard if certificates unavailable

### 🔧 Machine User - Test Entry & Data Input
**Landing Page:** Test Entry (`/test-entry`)
- **Reason:** Primary function for machine operators
- **Fallback:** Dashboard if test entry unavailable

### 👀 View Only - Limited Access
**Landing Page:** Certificates (`/certificates`)
- **Reason:** Only accessible page for view-only users

## Implementation Details

### Core Function: `getRoleBasedRedirect()`
```typescript
export function getRoleBasedRedirect(role: UserRole, permissions?: UserPermissions): string {
  // Checks user's permissions and role to determine best landing page
  // Falls back to role-based defaults if granular permissions unavailable
}
```

### Integration Points

#### 1. Login Page (`/app/login/page.tsx`)
```typescript
useEffect(() => {
  if (user && userData) {
    const redirectPath = getRedirectPath()
    router.push(redirectPath)
  }
}, [user, userData, router, getRedirectPath])
```

#### 2. Auth Context (`/contexts/auth-context.tsx`)
```typescript
const getRedirectPath = () => {
  if (!userData) return '/'
  return getRoleBasedRedirect(userData.role, userData.permissions)
}
```

#### 3. Test Entry Completion (`/app/test-entry/page.tsx`)
```typescript
// After saving test data
router.push(getRedirectPath()) // Instead of hardcoded '/'
```

### Permission-Based Logic

#### With Granular Permissions:
```typescript
if (permissions && 'dashboard' in permissions) {
  // Use specific page permissions to determine access
  if (typedPermissions.batchSelection?.canView) return '/batch-selection'
}
```

#### Without Granular Permissions (Fallback):
```typescript
switch (role) {
  case 'L2': return '/batch-selection'
  case 'L3': return '/certificates'
  case 'MachineUser': return '/test-entry'
  // ...
}
```

## User Experience Benefits

### 1. Role-Appropriate Landing
- **Machine Users:** Immediately see test entry form
- **L2 Users:** Go straight to batch management
- **L3 Users:** Land on certificate management
- **Admins:** See full dashboard overview

### 2. Improved Efficiency
- **No Navigation Required:** Users land where they need to work
- **Reduced Clicks:** Direct access to primary functions
- **Context Awareness:** System understands user's job role

### 3. Better Security
- **Principle of Least Exposure:** Users only see what they need
- **Permission Respect:** Landing page respects access controls
- **Consistent Experience:** Same behavior across login/redirects

## Technical Features

### 1. Intelligent Fallbacks
```typescript
// L2 user example - tries multiple options
if (typedPermissions.batchSelection?.canView) return '/batch-selection'
if (typedPermissions.holdManagement?.canView) return '/hold-management' 
if (typedPermissions.pendingTests?.canView) return '/pending-tests'
// Falls back to dashboard if none available
```

### 2. Permission Integration
- **Granular Permissions:** Uses new permission system when available
- **Legacy Support:** Falls back to role-based for older users
- **Dynamic Updates:** Respects permission changes immediately

### 3. Consistent Behavior
- **Login Redirect:** After successful authentication
- **Task Completion:** After saving data/completing workflows
- **Session Restoration:** When returning to application

## Configuration

### Adding New Roles
```typescript
case 'NewRole':
  if (typedPermissions.primaryPage?.canView) return '/primary-page'
  return '/fallback-page'
```

### Changing Landing Pages
Update the `getRoleBasedRedirect()` function in `/lib/utils/role-redirect.ts`:

```typescript
case 'L2':
  // Change primary landing page
  if (typedPermissions.newPrimaryPage?.canView) return '/new-primary-page'
  // Keep existing fallbacks
```

### Custom Redirect Logic
```typescript
export function getFirstAccessiblePage(permissions: UserPermissions): string {
  // Custom logic to find first accessible page
  // Useful for complex permission scenarios
}
```

## Usage Examples

### For Development
```typescript
import { getRoleBasedRedirect } from '@/lib/utils/role-redirect'

// Get redirect path for user
const redirectPath = getRoleBasedRedirect(user.role, user.permissions)
router.push(redirectPath)
```

### In Components
```typescript
const { getRedirectPath } = useAuth()

const handleTaskCompletion = () => {
  // After completing a task, send user to their main work area
  router.push(getRedirectPath())
}
```

## Testing Scenarios

### 1. New User Login
- **L1 User:** Should land on Dashboard
- **L2 User:** Should land on Batch Selection
- **L3 User:** Should land on Certificates
- **Machine User:** Should land on Test Entry
- **View Only:** Should land on Certificates

### 2. Permission Changes
- **Admin Changes L2 to L3:** Next login should go to Certificates
- **Custom Permissions:** Should respect individual permission overrides
- **Permission Removal:** Should fall back to accessible pages

### 3. Edge Cases
- **No Permissions:** Should fall back to role defaults
- **All Permissions Removed:** Should go to login (shouldn't happen)
- **Invalid Role:** Should default to Dashboard

## Security Considerations

### 1. Access Validation
- **Page Protection:** Landing pages still protected by ProtectedRoute
- **Permission Checks:** Redirect doesn't bypass access controls
- **Role Verification:** System validates role before redirect

### 2. Fallback Safety
- **Always Accessible:** Dashboard always available as final fallback
- **Permission Aware:** Won't redirect to inaccessible pages
- **Error Handling:** Graceful degradation if permissions malformed

## Maintenance

### Regular Updates
- **Review Landing Pages:** Ensure they match user workflows
- **Test Role Changes:** Verify redirects after permission updates
- **Monitor User Feedback:** Adjust based on user experience

### Performance
- **Cached Permissions:** Auth context caches user data
- **Single Calculation:** Redirect calculated once per session change
- **Minimal Overhead:** Fast execution for immediate redirects

## Future Enhancements

### Potential Additions
- **User Preferences:** Allow users to set preferred landing page
- **Workflow Context:** Remember where user was working
- **Time-Based Routing:** Different pages for different times/shifts
- **Project-Based Landing:** Route to specific projects/batches
