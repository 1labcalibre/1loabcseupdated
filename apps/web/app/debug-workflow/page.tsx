"use client"

import { useState, useEffect } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { testDataService, type TestData } from "@/lib/firebase/services/test-data"
import { notificationsService, type Notification } from "@/lib/firebase/services/notifications"
import { usersService, type User } from "@/lib/firebase/services/users"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, RefreshCw } from "lucide-react"

export default function DebugWorkflowPage() {
  const { userData } = useAuth()
  const [allTests, setAllTests] = useState<TestData[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [allNotifications, setAllNotifications] = useState<Record<string, Notification[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    
    // Subscribe to test data changes
    const unsubscribeTests = testDataService.subscribe(setAllTests)
    
    // Subscribe to users
    const unsubscribeUsers = usersService.subscribe(setAllUsers)
    
    return () => {
      unsubscribeTests()
      unsubscribeUsers()
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load all test data
      const tests = await testDataService.getAll()
      setAllTests(tests)
      
      // Load all users
      const users = await usersService.getAll()
      setAllUsers(users)
      
      // Load notifications for each user
      const notifs: Record<string, Notification[]> = {}
      for (const user of users) {
        if (user.id) {
          const userNotifs = await notificationsService.getByUser(user.id)
          notifs[user.id] = userNotifs
        }
      }
      setAllNotifications(notifs)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMachineOperators = (machine: string) => {
    return allUsers.filter(user => 
      user.active && user.machineAccess?.includes(machine as any)
    )
  }

  const getUserNotifications = (userId: string) => {
    return allNotifications[userId] || []
  }

  if (userData?.role !== 'L1') {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This page is only accessible to L1 users for debugging purposes.</p>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Workflow Debug</h1>
            <Button onClick={loadData} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Test Data Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>All Test Data</CardTitle>
                  <CardDescription>Total: {allTests.length} tests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Reference No</th>
                          <th className="text-left p-2">Product</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Current Stage</th>
                          <th className="text-left p-2">G1 Tests</th>
                          <th className="text-left p-2">G2 Tests</th>
                          <th className="text-left p-2">G3 Tests</th>
                          <th className="text-left p-2">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allTests.map((test) => (
                          <tr key={test.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-mono text-xs">{test.referenceNo}</td>
                            <td className="p-2">{test.productName}</td>
                            <td className="p-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                test.status === 'completed' 
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {test.status}
                              </span>
                            </td>
                            <td className="p-2">{test.currentStage}</td>
                            <td className="p-2">{test.g1Tests ? '✓' : '-'}</td>
                            <td className="p-2">{test.g2Tests ? '✓' : '-'}</td>
                            <td className="p-2">{test.g3Tests ? '✓' : '-'}</td>
                            <td className="p-2 text-xs">
                              {test.createdAt?.toDate?.()?.toLocaleString() || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Machine Operators */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['G1', 'G2', 'G3'].map(machine => {
                  const operators = getMachineOperators(machine)
                  const pendingTests = allTests.filter(t => 
                    t.status === `pending_${machine.toLowerCase()}`
                  )
                  
                  return (
                    <Card key={machine}>
                      <CardHeader>
                        <CardTitle>{machine} Machine</CardTitle>
                        <CardDescription>
                          {operators.length} operators, {pendingTests.length} pending tests
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm mb-2">Operators:</h4>
                          {operators.map(user => (
                            <div key={user.id} className="text-sm">
                              {user.displayName} ({user.email})
                            </div>
                          ))}
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-2">Pending Tests:</h4>
                          {pendingTests.map(test => (
                            <div key={test.id} className="text-sm font-mono">
                              {test.referenceNo}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* User Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle>User Notifications</CardTitle>
                  <CardDescription>Recent notifications for each user</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allUsers
                      .filter(user => user.machineAccess && user.machineAccess.length > 0)
                      .map(user => {
                        const notifications = getUserNotifications(user.id!)
                        return (
                          <div key={user.id} className="border rounded-lg p-3">
                            <h4 className="font-medium mb-2">
                              {user.displayName} ({user.machineAccess?.join(', ')})
                            </h4>
                            {notifications.length === 0 ? (
                              <p className="text-sm text-gray-500">No notifications</p>
                            ) : (
                              <div className="space-y-1">
                                {notifications.slice(0, 3).map(notif => (
                                  <div key={notif.id} className="text-sm">
                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                      notif.read ? 'bg-gray-300' : 'bg-blue-500'
                                    }`} />
                                    {notif.title} - {notif.referenceNo}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
} 