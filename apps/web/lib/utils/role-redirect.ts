import { UserPermissions } from '../firebase/services/users'

type UserRole = 'L1' | 'L2' | 'L3' | 'MachineUser' | 'ViewOnly'

interface PagePermissions {
  canView: boolean
  canEdit: boolean
  canCreate: boolean
  canDelete: boolean
  canApprove?: boolean
}

/**
 * Determines the best landing page for a user based on their role and permissions
 */
export function getRoleBasedRedirect(role: UserRole, permissions?: UserPermissions | any): string {
  // If user has granular permissions, use them
  if (permissions && typeof permissions === 'object' && 'dashboard' in permissions) {
    const typedPermissions = permissions as UserPermissions
    
    switch (role) {
      case 'L1':
        // L1 users go to dashboard (full admin access)
        return '/'
        
      case 'L2':
        // L2 users go to batch selection (their primary work area)
        if (typedPermissions.batchSelection?.canView) return '/batch-selection'
        if (typedPermissions.holdManagement?.canView) return '/hold-management'
        if (typedPermissions.pendingTests?.canView) return '/pending-tests'
        break
        
      case 'L3':
        // L3 users go to certificates (their primary work area)
        if (typedPermissions.certificates?.canView) return '/certificates'
        if (typedPermissions.dashboard?.canView) return '/'
        break
        
      case 'MachineUser':
        // Machine users go to test entry (their primary work area)
        if (typedPermissions.testEntry?.canView) return '/test-entry'
        if (typedPermissions.dashboard?.canView) return '/'
        break
        
      case 'ViewOnly':
        // View only users go to certificates (only thing they can see)
        if (typedPermissions.certificates?.canView) return '/certificates'
        break
    }
  }
  
  // Fallback based on role (for users without granular permissions)
  switch (role) {
    case 'L1':
      return '/' // Dashboard
      
    case 'L2':
      return '/batch-selection' // Primary L2 work area
      
    case 'L3':
      return '/certificates' // Primary L3 work area
      
    case 'MachineUser':
      return '/test-entry' // Primary machine operator work area
      
    case 'ViewOnly':
      return '/certificates' // Only accessible area
      
    default:
      return '/' // Default to dashboard
  }
}

/**
 * Gets the first accessible page for a user based on their permissions
 */
export function getFirstAccessiblePage(permissions: UserPermissions): string {
  const pages = [
    { path: '/', permission: permissions.dashboard },
    { path: '/analytics', permission: permissions.analytics },
    { path: '/test-entry', permission: permissions.testEntry },
    { path: '/batch-selection', permission: permissions.batchSelection },
    { path: '/certificates', permission: permissions.certificates },
    { path: '/pending-tests', permission: permissions.pendingTests },
    { path: '/hold-management', permission: permissions.holdManagement },
    { path: '/products', permission: permissions.products },
    { path: '/users', permission: permissions.users },
    { path: '/settings', permission: permissions.settings }
  ]
  
  // Find first page user can view
  for (const page of pages) {
    if (page.permission && typeof page.permission === 'object' && page.permission.canView) {
      return page.path
    }
  }
  
  // If no pages accessible, return login (this shouldn't happen)
  return '/login'
}


