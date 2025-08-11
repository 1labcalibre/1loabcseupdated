"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  ChevronLeft, 
  ChevronRight,
  LayoutDashboard,
  FlaskConical,
  Package,
  FileText,
  Shield,
  BarChart3,
  GitBranch,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  User,
  AlertCircle
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { user, userData, logout } = useAuth()

  const allMenuItems = [
    { 
      icon: LayoutDashboard, 
      label: "Dashboard", 
      href: "/",
      active: pathname === "/",
      page: 'dashboard' as const
    },
    { 
      icon: BarChart3, 
      label: "Analytics", 
      href: "/analytics",
      active: pathname === "/analytics",
      page: 'analytics' as const
    },
    { 
      icon: FlaskConical, 
      label: "Test Entry", 
      href: "/test-entry",
      active: pathname === "/test-entry",
      page: 'testEntry' as const
    },
    { 
      icon: Package, 
      label: "Batch Selection", 
      href: "/batch-selection",
      active: pathname === "/batch-selection",
      page: 'batchSelection' as const
    },
    { 
      icon: FileText, 
      label: "Certificates", 
      href: "/certificates",
      active: pathname === "/certificates",
      page: 'certificates' as const
    },
    { 
      icon: FileText, 
      label: "Pending Tests", 
      href: "/pending-tests",
      active: pathname === "/pending-tests",
      page: 'pendingTests' as const
    },
    { 
      icon: AlertCircle, 
      label: "Hold Management", 
      href: "/hold-management",
      active: pathname === "/hold-management",
      page: 'holdManagement' as const
    },
    { 
      icon: Package, 
      label: "Products", 
      href: "/products",
      active: pathname === "/products",
      page: 'products' as const
    },
    { 
      icon: Users, 
      label: "Users", 
      href: "/users",
      active: pathname === "/users",
      page: 'users' as const
    },
    { 
      icon: Settings, 
      label: "Settings", 
      href: "/settings",
      active: pathname === "/settings",
      page: 'settings' as const
    },
  ]

  // Filter menu items based on granular permissions
  const menuItems = allMenuItems.filter(item => {
    if (!userData) {
      console.log('No userData available');
      return false;
    }

    // console.log('Filtering item:', item.label, 'for user:', userData.displayName, 'role:', userData.role);
    // console.log('User permissions:', userData.permissions);

    // If user doesn't have permissions at all, fall back to role-based access
    if (!userData.permissions) {
      console.warn('User permissions not found, falling back to role-based access:', userData.role);
      // For L1 users, show all menu items
      if (userData.role === 'L1') {
        console.log('L1 user - showing all items');
        return true;
      }
      console.log('Non-L1 user without permissions - hiding item');
      return false;
    }

    // Check if this is the new granular permission structure
    const hasGranularPermissions = userData.permissions && typeof userData.permissions === 'object' && 'dashboard' in userData.permissions;
    
    if (!hasGranularPermissions) {
      console.warn('User has legacy permissions structure, falling back to role-based access:', userData.role);
      // For L1 users, show all menu items
      if (userData.role === 'L1') {
        console.log('L1 user with legacy permissions - showing all items');
        return true;
      }
      // For MachineUser, show only dashboard and test entry
      if (userData.role === 'MachineUser') {
        const allowedPages = ['dashboard', 'testEntry'];
        const isAllowed = allowedPages.includes(item.page);
        console.log(`MachineUser - ${item.page} allowed: ${isAllowed}`);
        return isAllowed;
      }
      console.log('Non-L1/MachineUser user with legacy permissions - hiding item');
      return false;
    }

    const pagePermissions = (userData.permissions as any)[item.page];
    
    // Check if user has view permission for this page
    if (pagePermissions && typeof pagePermissions === 'object' && 'canView' in pagePermissions) {
      const canView = pagePermissions.canView;
      // console.log(`Page ${item.page}: canView = ${canView}`);
      return canView;
    }
    
    // console.log(`No specific permissions found for page ${item.page}`);
    return false;
  });

  // console.log('Final filtered menu items:', menuItems.length, menuItems.map(item => item.label));

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40
          ${isCollapsed ? "w-16" : "w-64"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className={`h-16 border-b border-gray-200 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-4'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                O
              </div>
              <span className="font-semibold text-gray-900">One Lab</span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              O
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={onToggle}
              className="hidden lg:block p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={`space-y-1 ${isCollapsed ? 'p-2' : 'p-4'}`}>
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center rounded-lg transition-all
                  ${item.active 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }
                  ${isCollapsed ? "justify-center p-3 mx-1" : "gap-3 px-3 py-2"}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200">
          {/* User Info */}
          {user && (
            <div className={`${isCollapsed ? "p-2" : "p-4"}`}>
              <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userData?.displayName || user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {userData?.role || 'User'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Logout Button */}
          <div className={`${isCollapsed ? "p-2" : "p-4"} pt-0`}>
            <button
              onClick={async () => {
                await logout()
                router.push('/login')
                setIsMobileOpen(false)
              }}
              className={`
                w-full flex items-center rounded-lg transition-all
                text-gray-700 hover:bg-gray-50 hover:text-gray-900
                ${isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2"}
              `}
              title={isCollapsed ? "Logout" : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm font-medium">Logout</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Expand Button for Collapsed Sidebar */}
      {isCollapsed && (
        <button
          onClick={onToggle}
          className="hidden lg:block fixed left-4 top-20 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title="Expand Sidebar"
        >
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
      )}
    </>
  )
} 

