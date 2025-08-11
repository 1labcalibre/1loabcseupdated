# Granular Permissions System Implementation

## Overview
This document describes the comprehensive granular permissions system implemented for the One Lab application, allowing admins to assign specific permissions to different user roles for each page and functionality.

## Permission Structure

### UserPermissions Interface
```typescript
interface PagePermissions {
  canView: boolean
  canEdit: boolean
  canCreate: boolean
  canDelete: boolean
  canApprove?: boolean
}

interface UserPermissions {
  // Global permissions
  canApprove: boolean
  canEdit: boolean
  canView: boolean
  canDelete: boolean
  canModifyReferenceNo?: boolean // Only for L1 users
  
  // Page-specific permissions
  dashboard: PagePermissions
  analytics: PagePermissions
  testEntry: PagePermissions
  batchSelection: PagePermissions
  certificates: PagePermissions
  pendingTests: PagePermissions
  holdManagement: PagePermissions
  products: PagePermissions
  users: PagePermissions
  settings: PagePermissions
}
```

## Role-Based Default Permissions

### L1 (Admin) - Full Access
- **All Permissions**: Complete access to all pages and functions
- **Global Permissions**: Can approve, edit, view, delete, modify reference numbers
- **Page Access**: All pages with all permissions (view, edit, create, delete, approve)

### L2 (Lab In-charge) - Batch Selection, Hold Management, Pending Tests
- **Specific Access**: Can view, edit, save, and make changes in:
  - Batch Selection
  - Hold Management  
  - Pending Tests
- **View Only**: Dashboard, Analytics, Test Entry, Products
- **No Access**: Users, Settings, Certificate approval

### L3 (Certificate) - Certificate Management 
- **Full Access**: Certificates (view, edit, save, create changes)
- **View Only**: Dashboard, Analytics, Test Entry, Batch Selection, Hold Management, Pending Tests, Products
- **No Access**: Users, Settings

### Machine User - Test Entry & Data Input
- **Primary Access**: Test Entry (view, edit, create) - main function for machine operators
- **Limited Access**: Dashboard (view only)
- **No Access**: All other pages (Analytics, Batch Selection, Certificates, etc.)

### View Only - Certificates Only
- **Limited Access**: Can only view certificates page
- **No Access**: All other pages and functions

## Implementation Details

### 1. User Service Updates
- **generateRolePermissions()**: Function to create default permissions based on role
- **Enhanced User Interface**: Added granular permissions structure
- **Automatic Permission Assignment**: Permissions automatically set when role changes

### 2. Admin Permission Management UI
- **Page Permissions Modal**: Comprehensive grid showing all page permissions
- **Role-Based Defaults**: One-click reset to role defaults
- **Granular Control**: Individual checkboxes for each permission type
- **Visual Feedback**: Clear indication of current permissions

### 3. Enhanced ProtectedRoute Component
```typescript
<ProtectedRoute 
  page="certificates" 
  pagePermission="canView"
>
  {/* Protected content */}
</ProtectedRoute>
```

**New Features:**
- `page`: Specify which page permissions to check
- `pagePermission`: Specific permission required (canView, canEdit, etc.)
- `allowedRoles`: Alternative role-based protection
- Backward compatible with existing `requiredPermission`

### 4. Sidebar Integration
- **Dynamic Menu**: Menu items show/hide based on view permissions
- **Real-time Updates**: Immediately reflects permission changes
- **Clean UI**: Users only see pages they can access

## Usage Examples

### Adding New Protected Page
```typescript
// In your page component
return (
  <ProtectedRoute page="yourPage" pagePermission="canView">
    <YourPageContent />
  </ProtectedRoute>
)
```

### Checking Permissions in Components
```typescript
// Access user permissions
const { userData } = useAuth()
const canEdit = userData?.permissions?.yourPage?.canEdit

// Conditional rendering
{canEdit && (
  <Button onClick={handleEdit}>Edit</Button>
)}
```

### Admin Permission Management
1. Navigate to Users page
2. Click purple Settings icon next to user
3. View/modify permissions in table format
4. Use "Reset to Role Defaults" if needed
5. Save changes

## Permission Management Workflow

### For Admins:
1. **View Current Permissions**: Click Settings icon next to user
2. **Modify Permissions**: Use checkbox grid to adjust specific permissions
3. **Role Defaults**: Click "Reset to Role Defaults" for standard permissions
4. **Save Changes**: Apply new permissions immediately

### For Users:
- **Automatic Application**: Permissions apply immediately upon login
- **Dynamic Sidebar**: Only shows accessible pages
- **Access Control**: Attempts to access restricted pages show "Access Denied"
- **Real-time Updates**: Permission changes take effect without re-login

## Security Features

### 1. Server-Side Validation
- Firestore rules respect permission structure
- Backend validation for all operations
- Role-based access control at database level

### 2. Client-Side Protection
- Route protection at page level
- Component-level permission checks
- Dynamic UI based on permissions

### 3. Audit Trail
- Permission changes logged
- Admin actions tracked
- User access attempts recorded

## Migration Guide

### Existing Users
- Automatically migrated to new permission structure
- Permissions assigned based on current role
- No data loss or access interruption

### Updating Existing Pages
```typescript
// Old way
<ProtectedRoute requiredPermission="canEdit">

// New way  
<ProtectedRoute page="yourPage" pagePermission="canEdit">
```

## Benefits

### 1. Granular Control
- Page-level permission management
- Function-specific access control
- Role-independent customization

### 2. Enhanced Security
- Least privilege principle
- Comprehensive access control
- Audit-ready permission tracking

### 3. Better User Experience
- Clean, relevant interfaces
- No confusing inaccessible features
- Clear access feedback

### 4. Administrative Efficiency
- Easy permission management
- Visual permission overview
- Quick role-based defaults

## File Structure

### Core Files Modified:
- `lib/firebase/services/users.ts` - Permission interfaces and defaults
- `app/users/page.tsx` - Admin permission management UI
- `components/auth/protected-route.tsx` - Enhanced route protection
- `components/layout/sidebar.tsx` - Permission-based menu filtering

### Pages Updated:
- `app/certificates/page.tsx`
- `app/analytics/page.tsx` 
- `app/certificate-approvals/page.tsx`
- All other protected pages

## Testing Recommendations

### 1. Role Testing
- Test each role with their default permissions
- Verify access restrictions work correctly
- Confirm sidebar shows appropriate items

### 2. Permission Customization
- Test custom permission assignments
- Verify real-time permission updates
- Test edge cases and boundary conditions

### 3. Security Testing
- Attempt to access restricted pages
- Verify route protection works
- Test with different user roles

## Future Enhancements

### Potential Additions:
1. **Time-based Permissions**: Temporary access grants
2. **IP-based Restrictions**: Location-based access control
3. **Advanced Workflows**: Multi-step approval processes
4. **Bulk Permission Management**: Group permission updates
5. **Permission Templates**: Predefined permission sets

## Support and Troubleshooting

### Common Issues:
1. **User sees "Access Denied"**: Check page permissions for their role
2. **Menu items missing**: Verify view permissions are granted
3. **Permissions not updating**: Clear browser cache and re-login
4. **Admin can't edit permissions**: Ensure admin has users page access

### Debug Steps:
1. Check user's current permissions in database
2. Verify role assignment is correct
3. Confirm page permissions are properly set
4. Test with role defaults reset
