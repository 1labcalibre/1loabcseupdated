"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Bell, FlaskConical, Clock, CheckCircle, AlertCircle, ArrowRight, Loader2, Factory } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { testDataService, type TestData } from "@/lib/firebase/services/test-data"
import { notificationsService, type Notification } from "@/lib/firebase/services/notifications"
import { MACHINE_TESTS, getMachineName, getStatusDisplay } from "@/lib/firebase/utils/test-helpers"
import { usersService } from "@/lib/firebase/services/users"

interface MachineOperatorDashboardProps {
  machine?: 'G1' | 'G2' | 'G3'
}

export function MachineOperatorDashboard({ machine }: MachineOperatorDashboardProps) {
  const { user, userData } = useAuth()
  const [loading, setLoading] = useState(true)
  const [pendingTests, setPendingTests] = useState<TestData[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [userMachines, setUserMachines] = useState<string[]>([])
  const [showAllTests, setShowAllTests] = useState(false)

  // Helper function to check if a timestamp exists (handles Firestore Timestamp objects)
  const hasTimestamp = (timestamp: any): boolean => {
    if (!timestamp) return false;
    // Check if it's a Firestore Timestamp object
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      return true;
    }
    // Check if it's a Date object
    if (timestamp instanceof Date) {
      return true;
    }
    // Check if it's a valid date string or number
    if (timestamp && (typeof timestamp === 'string' || typeof timestamp === 'number')) {
      const date = new Date(timestamp);
      return !isNaN(date.getTime());
    }
    return false;
  };

  useEffect(() => {
    if (userData?.uid) {
      loadData()
      
      // Subscribe to all test data changes
      const machines = userData.machineAccess || []
      setUserMachines(machines)
      
      // Subscribe to all tests and filter client-side
      const unsubscribeTests = testDataService.subscribe((allTests) => {
        // Filter tests that need any of the user's machines and haven't been completed by this user
        const pendingForUser = allTests.filter(test => {
          // Check if test needs any of the user's machines
          for (const machine of machines) {
            if (machine === 'G1' && (!test.g1Tests || test.g1Tests.completedById !== userData.uid)) return true
            if (machine === 'G2' && (!test.g2Tests || test.g2Tests.completedById !== userData.uid)) return true
            if (machine === 'G3' && (!test.g3Tests || test.g3Tests.completedById !== userData.uid)) return true
          }
          return false
        })
        
        setPendingTests(pendingForUser)
      })
      
      // Subscribe to notifications
      const notifUnsubscribe = notificationsService.subscribe(userData.uid, (notifs) => {
        setNotifications(notifs.slice(0, 5)) // Show only latest 5
      })
      
      // Subscribe to unread count
      const unreadUnsubscribe = notificationsService.subscribeToUnreadCount(userData.uid, setUnreadCount)
      
      return () => {
        unsubscribeTests()
        notifUnsubscribe()
        unreadUnsubscribe()
      }
    }
  }, [userData])

  const loadData = async () => {
    if (!userData?.uid) return
    
    try {
      setLoading(true)
      
      // Load all tests that need this user's machine tests
      const machines = userData.machineAccess || []
      const allTests = await testDataService.getAll()
      
      // Filter tests that need any of the user's machines AND haven't been completed by this user
      const pendingForUser = allTests.filter(test => {
        // Check if test needs any of the user's machines that this user hasn't completed
        for (const machine of machines) {
          if (machine === 'G1') {
            // Either no G1 tests exist, or this user hasn't completed them
            if (!test.g1Tests?.completedAt || test.g1Tests?.completedById !== userData.uid) {
              return true
            }
          }
          if (machine === 'G2') {
            // Either no G2 tests exist, or this user hasn't completed them
            if (!test.g2Tests?.completedAt || test.g2Tests?.completedById !== userData.uid) {
              return true
            }
          }
          if (machine === 'G3') {
            // Either no G3 tests exist, or this user hasn't completed them
            if (!test.g3Tests?.completedAt || test.g3Tests?.completedById !== userData.uid) {
              return true
            }
          }
        }
        return false
      })
      
      setPendingTests(pendingForUser)
      
      // Load notifications
      const notifs = await notificationsService.getByUser(userData.uid)
      setNotifications(notifs.slice(0, 5))
      
      // Load unread count
      const count = await notificationsService.getUnreadCount(userData.uid)
      setUnreadCount(count)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    if (!notificationId) return
    await notificationsService.markAsRead(notificationId)
  }

  const getMachineTestInfo = () => {
    if (!userData?.machineAccess || userData.machineAccess.length === 0) {
      return { machines: [], testCount: 0 }
    }
    
    let totalTests = 0
    userData.machineAccess.forEach(m => {
      const machineKey = `${m.toLowerCase()}Tests` as keyof typeof userData.testPermissions
      totalTests += userData.testPermissions?.[machineKey]?.length || 0
    })
    
    return {
      machines: userData.machineAccess,
      testCount: totalTests
    }
  }

  const { machines, testCount } = getMachineTestInfo()

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {machines.length === 1 ? `${getMachineName(machines[0] as any)} Operator Dashboard` : 'Operator Dashboard'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {machines.length > 0 
                ? `Access to: ${machines.map(m => getMachineName(m as any)).join(', ')}`
                : 'No machine access assigned'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button variant="outline" size="icon">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Machine Access</CardTitle>
              <Factory className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{machines.length}</div>
            <p className="text-xs text-gray-500 mt-1">{testCount} tests available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Tests</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : pendingTests.length}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Notifications</CardTitle>
              <Bell className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
            <p className="text-xs text-gray-500 mt-1">Unread messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {machines.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Link href="/test-entry" className="block">
            <Button className="w-full h-auto flex-col py-4 hover:scale-105 transition-transform">
              <FlaskConical className="h-6 w-6 mb-2" />
              <span className="text-xs sm:text-sm">New Test Entry</span>
            </Button>
          </Link>
          {pendingTests.length > 0 && (
            <Link href={`/test-entry?referenceNo=${pendingTests[0]?.referenceNo || ''}`} className="block">
              <Button variant="outline" className="w-full h-auto flex-col py-4 hover:scale-105 transition-transform bg-orange-50 border-orange-200 hover:bg-orange-100">
                <AlertCircle className="h-6 w-6 mb-2 text-orange-600" />
                <span className="text-xs sm:text-sm">Continue Test</span>
              </Button>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Tests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pending Tests</CardTitle>
              <Link href="/pending-tests">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : pendingTests.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No pending tests</p>
                </div>
              ) : (
                pendingTests.slice(0, 5).map((test) => {
                  // Determine which tests this user needs to complete
                  const needsG1 = userMachines.includes('G1') && !test.g1Tests?.completedAt
                  const needsG2 = userMachines.includes('G2') && !test.g2Tests?.completedAt
                  const needsG3 = userMachines.includes('G3') && !test.g3Tests?.completedAt
                  
                  const neededTests = []
                  if (needsG1) neededTests.push('G1')
                  if (needsG2) neededTests.push('G2')
                  if (needsG3) neededTests.push('G3')
                  
                  return (
                    <Link 
                      key={test.id} 
                      href={`/test-entry?referenceNo=${test.referenceNo}`}
                      className="block"
                    >
                      <div className="p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{test.referenceNo}</p>
                            <p className="text-xs text-gray-600">{test.productName}</p>
                            <p className="text-xs text-gray-500 mt-1">Batch: {test.batchNo}</p>
                            <p className="text-xs text-blue-600 mt-1">
                              Your tests needed: {neededTests.join(', ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">
                              {test.g1Tests ? '✓ G1' : '○ G1'} | 
                              {test.g2Tests ? '✓ G2' : '○ G2'} | 
                              {test.g3Tests ? '✓ G3' : '○ G3'}
                            </div>
                            <p className="text-xs text-gray-500">{test.testDate}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => notificationsService.markAllAsRead(userData?.uid || '')}
              >
                Mark all read
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No notifications</p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border ${
                      notification.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                        {notification.referenceNo && (
                          <Link 
                            href={`/test-entry?referenceNo=${notification.referenceNo}`}
                            onClick={() => markNotificationAsRead(notification.id!)}
                          >
                            <Button variant="link" size="sm" className="p-0 h-auto mt-2">
                              Go to test →
                            </Button>
                          </Link>
                        )}
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 