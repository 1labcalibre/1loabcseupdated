"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'L1' | 'L2' | 'L3' | 'MachineUser' | 'ViewOnly'
  requiredPermission?: 'canApprove' | 'canEdit' | 'canView' | 'canDelete'
  allowedRoles?: ('L1' | 'L2' | 'L3' | 'MachineUser' | 'ViewOnly')[]
  page?: 'dashboard' | 'analytics' | 'testEntry' | 'batchSelection' | 'certificates' | 'pendingTests' | 'holdManagement' | 'products' | 'users' | 'settings'
  pagePermission?: 'canView' | 'canEdit' | 'canCreate' | 'canDelete' | 'canApprove'
}

export function ProtectedRoute({ 
  children, 
  requiredRole,
  requiredPermission,
  allowedRoles,
  page,
  pagePermission
}: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Check role-based access
  if (requiredRole && userData && userData.role !== requiredRole && userData.role !== 'L1') {
    return (
      <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  // Check allowed roles
  if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Your role doesn't have access to this page.</p>
        </div>
      </div>
    )
  }

  // Check page-specific permissions
  if (page && pagePermission && userData && userData.permissions) {
    const pagePerms = (userData.permissions as any)[page]
    if (pagePerms && typeof pagePerms === 'object' && 'canView' in pagePerms) {
      if (!(pagePerms as any)[pagePermission]) {
        return (
          <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have the required permission for this page.</p>
            </div>
          </div>
        )
      }
    }
  }

  // Check permission-based access (legacy)
  if (requiredPermission && userData && !userData.permissions[requiredPermission]) {
    return (
      <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have the required permission to access this page.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
} 

