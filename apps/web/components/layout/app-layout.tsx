"use client"

import { useState, useEffect, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Sidebar } from "./sidebar"

interface AppLayoutProps {
  children: React.ReactNode
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Pages that should not show the sidebar
  const noSidebarPages = ['/login', '/register', '/forgot-password', '/reset-password']
  
  // Check if this is an email preview (certificate-view with preview=true)
  const isEmailPreview = pathname === '/certificate-view' && searchParams.get('preview') === 'true'
  
  const shouldHideSidebar = noSidebarPages.includes(pathname) || isEmailPreview

  // Load collapsed state from localStorage
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }
  }, [])

  const handleToggle = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState))
  }

  // If we should hide sidebar, render children directly
  if (shouldHideSidebar) {
    return (
      <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
        {children}
      </div>
    )
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
        <div className="lg:ml-64" suppressHydrationWarning>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
      <Sidebar isCollapsed={isCollapsed} onToggle={handleToggle} />
      
      {/* Main Content */}
      <div
        className={`
          transition-all duration-300
          pt-16 lg:pt-0
          ${isCollapsed ? "lg:ml-16" : "lg:ml-64"}
        `}
        suppressHydrationWarning
      >
        {children}
      </div>
    </div>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AppLayoutContent>{children}</AppLayoutContent>
    </Suspense>
  )
} 