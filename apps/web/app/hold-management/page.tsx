"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import { AlertCircle, CheckCircle, Eye, RotateCcw, Calendar, User, Factory, Edit, Save } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { testDataService, type TestData } from "@/lib/firebase/services/test-data"
import { productsService } from "@/lib/firebase/services/products"
import { usersService } from "@/lib/firebase/services/users"
import { validateTestValue } from "@/lib/firebase/utils/range-validation"
import { format } from "date-fns"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

export default function HoldManagementPage() {
  const { userData } = useAuth()
  
  // Check user permissions for Hold Management
  // Check if user has new granular permissions
  const hasNewPermissions = userData?.permissions && 
    typeof userData.permissions === 'object' && 
    'holdManagement' in userData.permissions
    
  const canEdit = hasNewPermissions 
    ? userData.permissions.holdManagement?.canEdit === true
    : userData?.role && ['L1', 'L2'].includes(userData.role) // Fallback for legacy system
    
  console.log('Hold Management permissions check:', {
    hasNewPermissions,
    role: userData?.role,
    canEdit,
    holdManagementPerms: userData?.permissions?.holdManagement
  })
  const [holdTests, setHoldTests] = useState<TestData[]>([])
  const [historyTests, setHistoryTests] = useState<TestData[]>([])
  const [activeView, setActiveView] = useState<'hold' | 'history'>('hold')
  const [loading, setLoading] = useState(true)
  const [selectedTest, setSelectedTest] = useState<TestData | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTest, setEditingTest] = useState<TestData | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [releasing, setReleasing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const unsubscribeRefs = useRef<(() => void)[]>([])

  // Filter states
  const [filters, setFilters] = useState({
    action: 'all', // 'all', 'released', 'edited', 'hold'
    product: 'all', // Product filter
    line: 'all' // Line filter
  })
  const [filteredHistoryTests, setFilteredHistoryTests] = useState<TestData[]>([])
  const [uniqueProducts, setUniqueProducts] = useState<string[]>([])
  const [uniqueLines, setUniqueLines] = useState<string[]>([])

  // Set up real-time listeners for hold tests and history
  useEffect(() => {
    console.log('Setting up real-time listeners for hold management...')
    
    // Clean up previous listeners
    unsubscribeRefs.current.forEach(unsubscribe => unsubscribe())
    unsubscribeRefs.current = []

    // Real-time listener for hold tests
    const holdTestsQuery = query(
      collection(db, 'testData'),
      where('isHold', '==', true)
    )
    
    const unsubscribeHoldTests = onSnapshot(holdTestsQuery, (snapshot) => {
      const holdTestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestData[]

      // Sort manually by holdAt (most recent first)
      holdTestsData.sort((a, b) => {
        if (!a.holdAt && !b.holdAt) return 0
        if (!a.holdAt) return 1
        if (!b.holdAt) return -1

        const aTime = a.holdAt.toDate ? a.holdAt.toDate().getTime() : new Date(a.holdAt).getTime()
        const bTime = b.holdAt.toDate ? b.holdAt.toDate().getTime() : new Date(b.holdAt).getTime()
        return bTime - aTime
      })

      console.log('Real-time hold tests update:', holdTestsData.length, holdTestsData)
      setHoldTests(holdTestsData)
      loadUserNames(holdTestsData)
    }, (error) => {
      console.error('Error in hold tests listener:', error)
      if (error.code === 'permission-denied') {
        console.warn('Permission denied in hold tests listener - user may be logging out')
        return
      }
    })

    // Real-time listener for history tests (tests that were once on hold)
    const historyTestsQuery = query(
      collection(db, 'testData'),
      where('holdAt', '!=', null)
    )
    
    const unsubscribeHistoryTests = onSnapshot(historyTestsQuery, (snapshot) => {
      const historyTestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestData[]

      // Filter to only include tests that have been acted upon (released or edited)
      const actionedTests = historyTestsData.filter(test => {
        const hasBeenEdited = test.editedBy && test.editedAt
        const hasBeenReleased = test.releasedBy && test.releasedAt
        const wasOnHoldButNotAnymore = !test.isHold && test.holdAt
        
        return hasBeenEdited || hasBeenReleased || wasOnHoldButNotAnymore
      })

      // Sort by most recent action
      actionedTests.sort((a, b) => {
        const getLatestTime = (test: TestData) => {
          const times = []
          if (test.editedAt) {
            times.push(test.editedAt.toDate ? test.editedAt.toDate().getTime() : new Date(test.editedAt).getTime())
          }
          if (test.releasedAt) {
            times.push(test.releasedAt.toDate ? test.releasedAt.toDate().getTime() : new Date(test.releasedAt).getTime())
          }
          if (test.holdAt) {
            times.push(test.holdAt.toDate ? test.holdAt.toDate().getTime() : new Date(test.holdAt).getTime())
          }
          return times.length > 0 ? Math.max(...times) : 0
        }
        
        return getLatestTime(b) - getLatestTime(a)
      })

      console.log('Real-time history tests update:', actionedTests.length, actionedTests)
      
      // Debug the holdBy values in history tests
      actionedTests.forEach(test => {
        console.log(`History test ${test.referenceNo}: holdBy = ${test.holdBy}, releasedBy = ${test.releasedBy}, editedBy = ${test.editedBy}`)
      })
      
      setHistoryTests(actionedTests)
      loadUserNames(actionedTests)
    }, (error) => {
      console.error('Error in history tests listener:', error)
      if (error.code === 'permission-denied') {
        console.warn('Permission denied in history tests listener - user may be logging out')
        return
      }
    })

    // Store unsubscribe functions
    unsubscribeRefs.current = [unsubscribeHoldTests, unsubscribeHistoryTests]

    // Initial loading state
    setLoading(true)

    // Cleanup function
    return () => {
      console.log('Cleaning up real-time listeners...')
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe())
    }
  }, []) // Empty dependency array - only run once

  // Set loading to false when we have received initial data (even if empty)
  useEffect(() => {
    // Use a timeout to ensure we've received the initial snapshot
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000) // Wait 1 second for initial data load

    return () => clearTimeout(timer)
  }, [])

  // Also set loading to false immediately if we get data
  useEffect(() => {
    if (holdTests.length > 0 || historyTests.length > 0) {
      setLoading(false)
    }
  }, [holdTests, historyTests])

  // Extract unique products and lines for filter dropdowns
  useEffect(() => {
    const products = new Set<string>()
    const lines = new Set<string>()
    
    historyTests.forEach(test => {
      if (test.productName) products.add(test.productName)
      if (test.line) lines.add(test.line)
    })
    
    setUniqueProducts(Array.from(products).sort())
    setUniqueLines(Array.from(lines).sort())
  }, [historyTests])

  // Apply filters to history tests
  useEffect(() => {
    let filtered = historyTests

    // Action type filter
    if (filters.action && filters.action !== 'all') {
      filtered = filtered.filter(test => {
        switch (filters.action) {
          case 'released':
            return test.releasedBy && test.releasedAt
          case 'edited':
            return test.editedBy && test.editedAt
          case 'hold':
            return test.isHold
          default:
            return true
        }
      })
    }

    // Product filter
    if (filters.product && filters.product !== 'all') {
      filtered = filtered.filter(test => test.productName === filters.product)
    }

    // Line filter
    if (filters.line && filters.line !== 'all') {
      filtered = filtered.filter(test => test.line === filters.line)
    }

    setFilteredHistoryTests(filtered)
  }, [historyTests, filters, userNames])

  const loadHoldTests = async () => {
    try {
      setLoading(true)
      console.log('Loading hold tests...')
      const tests = await testDataService.getHoldTests()
      console.log('Hold tests loaded:', tests.length, tests)
      setHoldTests(tests)
      
      // Load user names for hold tests
      await loadUserNames(tests)
    } catch (error) {
      console.error('Error loading hold tests:', error)
      alert('Error loading hold tests: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  const loadHistoryTests = async () => {
    try {
      console.log('Loading history tests...')
      const tests = await testDataService.getHoldHistory()
      console.log('History tests loaded:', tests.length, tests)
      setHistoryTests(tests)
      
      // Load user names for history tests
      await loadUserNames(tests)
    } catch (error) {
      console.error('Error loading history tests:', error)
    }
  }

  const loadUserNames = async (tests: TestData[]) => {
    const userIds = new Set<string>()
    
    // Collect all unique user IDs
    tests.forEach(test => {
      if (test.holdBy) userIds.add(test.holdBy)
      if (test.editedBy) userIds.add(test.editedBy)
      if (test.releasedBy) userIds.add(test.releasedBy)
    })
    
    if (userIds.size === 0) return
    
    // Fetch user names efficiently
    const names: Record<string, string> = {}
    
    // Get all users once for efficiency
    try {
      const allUsers = await usersService.getAll()
      
      for (const uid of userIds) {
        // Find user by UID or email
        const user = allUsers.find(u => u.uid === uid || u.email === uid)
        
        if (user) {
          names[uid] = user.displayName || user.email || uid
        } else {
          // Smart fallback based on UID pattern
          if (uid.includes('@')) {
            names[uid] = uid.split('@')[0] || uid
          } else if (uid.toLowerCase().includes('g1')) {
            names[uid] = 'G1 User'
          } else if (uid.toLowerCase().includes('g2')) {
            names[uid] = 'G2 User'
          } else if (uid.toLowerCase().includes('g3')) {
            names[uid] = 'G3 User'
          } else if (uid.toLowerCase().includes('admin')) {
            names[uid] = 'Admin User'
          } else {
            names[uid] = uid
          }
        }
      }
    } catch (error) {
      console.error('Error loading user names:', error)
      // Fallback: use UIDs as display names
      userIds.forEach(uid => {
        names[uid] = uid
      })
    }
    
    setUserNames(prev => ({ ...prev, ...names }))
  }

  const handleViewDetails = (test: TestData) => {
    setSelectedTest(test)
    setShowDetailsModal(true)
  }

  const handleEditTest = (test: TestData) => {
    setEditingTest(test)
    
    // Initialize edit values with current test values
    const currentValues: Record<string, string> = {}
    
    // Extract values from all machine tests
    if (test.g1Tests) {
      Object.entries(test.g1Tests).forEach(([key, value]) => {
        if (key !== 'completedBy' && key !== 'completedById' && key !== 'completedAt') {
          currentValues[key] = String(value)
        }
      })
    }
    if (test.g2Tests) {
      Object.entries(test.g2Tests).forEach(([key, value]) => {
        if (key !== 'completedBy' && key !== 'completedById' && key !== 'completedAt') {
          currentValues[key] = String(value)
        }
      })
    }
    if (test.g3Tests) {
      Object.entries(test.g3Tests).forEach(([key, value]) => {
        if (key !== 'completedBy' && key !== 'completedById' && key !== 'completedAt') {
          currentValues[key] = String(value)
        }
      })
    }
    
    setEditValues(currentValues)
    setShowEditModal(true)
  }

  const handleSaveEditedTest = async () => {
    if (!editingTest || !userData?.uid) return
    
    try {
      setSaving(true)
      
      // Get product specifications for validation
      const product = await productsService.getById(editingTest.productId)
      if (!product?.specifications) {
        alert('Product specifications not found')
        return
      }
      
      // Validate all edited values
      let hasInvalidValues = false
      const outOfRangeValues: Record<string, { value: number, expected: string, actual: string }> = {}
      
      Object.entries(editValues).forEach(([key, value]) => {
        if (value) {
          const numValue = parseFloat(value)
          if (!isNaN(numValue)) {
            let validationKey = key
            let validationValue = numValue
            
            // Handle Rheo conversions
            if (key === 'rheoTS2Min') {
              validationKey = 'rheoTS2Sec'
              validationValue = numValue * 60
            } else if (key === 'rheoTC90Min') {
              validationKey = 'rheoTC90Sec'
              validationValue = numValue * 60
            }
            
            const validation = validateTestValue(validationKey, validationValue, product.specifications)
            if (!validation.isValid) {
              hasInvalidValues = true
              outOfRangeValues[key] = {
                value: validationValue,
                expected: validation.range || 'Unknown range',
                actual: `${validationValue}`
              }
            }
          }
        }
      })
      
      // Update test data with edited values
      await testDataService.updateEditedTestValues(editingTest.id!, editValues, userData.uid)
      
      if (hasInvalidValues) {
        // Still has invalid values, update hold info
        await testDataService.markAsHold(
          editingTest.id!,
          'Edited values still out of specification range',
          userData.uid,
          outOfRangeValues
        )
        alert('Test saved but still marked as HOLD due to remaining out-of-range values.')
      } else {
        // All values are now valid, release from hold
        await testDataService.releaseFromHold(editingTest.id!, userData.uid)
        alert('Test values corrected and released from hold successfully!')
      }
      
      setShowEditModal(false)
      setEditingTest(null)
      setEditValues({})
      // Real-time listeners will automatically update the data
      
    } catch (error) {
      console.error('Error saving edited test:', error)
      alert('Failed to save edited test')
    } finally {
      setSaving(false)
    }
  }

  const handleReleaseFromHold = async (testId: string) => {
    if (!userData?.uid) return
    
    try {
      setReleasing(testId)
      await testDataService.releaseFromHold(testId, userData.uid)
      // Real-time listeners will automatically update the data
      alert('Test released from hold successfully!')
    } catch (error) {
      console.error('Error releasing from hold:', error)
      alert('Failed to release test from hold')
    } finally {
      setReleasing(null)
    }
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return format(date, 'dd/MM/yyyy HH:mm')
    } catch {
      return 'N/A'
    }
  }

  return (
    <ProtectedRoute page="holdManagement" pagePermission="canView">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Hold Management</h1>
          <p className="text-gray-600 mt-2">
            Manage test batches that are on hold due to out-of-range values
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {activeView === 'hold' ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      Tests on Hold ({holdTests.length})
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Hold History ({historyTests.length})
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {activeView === 'hold' 
                    ? 'Review and manage test batches that exceeded specification ranges'
                    : 'View history of tests that were previously on hold'
                  }
                </CardDescription>
              </div>
              
              {/* Toggle Buttons */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={activeView === 'hold' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('hold')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeView === 'hold' 
                      ? 'bg-white shadow-sm text-red-600' 
                      : 'text-gray-600 hover:text-red-600'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Tests on Hold
                </Button>
                <Button
                  variant={activeView === 'history' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('history')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeView === 'history' 
                      ? 'bg-white shadow-sm text-green-600' 
                      : 'text-gray-600 hover:text-green-600'
                  }`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  History
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {/* Filter Section - Show only for History view */}
          {activeView === 'history' && (
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="product-filter" className="text-sm font-medium text-gray-700">Product</Label>
                  <Select
                    value={filters.product}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, product: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      {uniqueProducts.map(product => (
                        <SelectItem key={product} value={product}>
                          {product}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="line-filter" className="text-sm font-medium text-gray-700">Line</Label>
                  <Select
                    value={filters.line}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, line: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All lines" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Lines</SelectItem>
                      {uniqueLines.map(line => (
                        <SelectItem key={line} value={line}>
                          {line?.replace('line', 'Line ') || line}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="action-type" className="text-sm font-medium text-gray-700">Action Type</Label>
                  <Select
                    value={filters.action}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="released">Released</SelectItem>
                      <SelectItem value="edited">Edited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({
                      action: 'all',
                      product: 'all',
                      line: 'all'
                    })}
                  >
                    Clear Filters
                  </Button>
                  <Badge variant="secondary" className="px-3 py-2">
                    {filteredHistoryTests.length} of {historyTests.length} items
                  </Badge>
                </div>
              </div>
            </div>
          )}
          
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading {activeView === 'hold' ? 'hold tests' : 'history'}...</div>
              </div>
            ) : (activeView === 'hold' ? holdTests : filteredHistoryTests).length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeView === 'hold' ? 'No Tests on Hold' : 'No History Available'}
                </h3>
                <p className="text-gray-500">
                  {activeView === 'hold' 
                    ? 'All tests are within specification ranges.' 
                    : 'No tests have been acted upon yet.'
                  }
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference No</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Line</TableHead>
                    <TableHead>Batch No</TableHead>
                    <TableHead>{activeView === 'hold' ? 'Hold Date' : 'Action Date'}</TableHead>
                    <TableHead>{activeView === 'hold' ? 'Hold By' : 'Action By'}</TableHead>
                    <TableHead>{activeView === 'hold' ? 'Out of Range' : 'Status'}</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(activeView === 'hold' ? holdTests : filteredHistoryTests).map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">
                        {test.referenceNo}
                      </TableCell>
                      <TableCell>{test.productName}</TableCell>
                      <TableCell>
                        <span className="capitalize">
                          {test.line?.replace('line', 'Line ') || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>{test.batchNo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {activeView === 'hold' ? (
                            formatTimestamp(test.holdAt)
                          ) : (
                            // For history, show the most recent action date
                            (() => {
                              const dates = []
                              if (test.editedAt) dates.push(test.editedAt)
                              if (test.releasedAt) dates.push(test.releasedAt)
                              if (test.holdAt) dates.push(test.holdAt)
                              
                              if (dates.length === 0) return 'N/A'
                              
                              const latestDate = dates.reduce((latest, current) => {
                                const currentTime = current.toDate ? current.toDate().getTime() : new Date(current).getTime()
                                const latestTime = latest.toDate ? latest.toDate().getTime() : new Date(latest).getTime()
                                return currentTime > latestTime ? current : latest
                              })
                              
                              return formatTimestamp(latestDate)
                            })()
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {activeView === 'hold' ? (
                            userNames[test.holdBy || ''] || test.holdBy || 'Unknown'
                          ) : (
                            // For history, show who took the most recent action
                            (() => {
                              if (test.releasedBy && test.releasedAt) {
                                return userNames[test.releasedBy] || test.releasedBy || 'Unknown'
                              }
                              if (test.editedBy && test.editedAt) {
                                return userNames[test.editedBy] || test.editedBy || 'Unknown'
                              }
                              return userNames[test.holdBy || ''] || test.holdBy || 'Unknown'
                            })()
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {activeView === 'hold' ? (
                          <Badge 
                            variant="destructive" 
                            className="bg-red-100 text-red-800 border-red-200 font-medium"
                          >
                            {test.outOfRangeValues ? Object.keys(test.outOfRangeValues).length : 0} values
                          </Badge>
                        ) : (
                          // For history, show the current status
                          <Badge 
                            variant={test.isHold ? "destructive" : (test.releasedBy ? "default" : "secondary")} 
                            className={`text-xs font-medium ${
                              test.isHold 
                                ? 'bg-red-100 text-red-800 border-red-200' 
                                : test.releasedBy 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}
                          >
                            {test.isHold ? 'Still on Hold' : (test.releasedBy ? 'Released' : 'Edited')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(test)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {activeView === 'hold' && canEdit && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleEditTest(test)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleReleaseFromHold(test.id!)}
                                disabled={releasing === test.id}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                {releasing === test.id ? 'Releasing...' : 'Release'}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Details Modal */}
        {showDetailsModal && selectedTest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Hold Details - {selectedTest.referenceNo}
                </CardTitle>
                <CardDescription>
                  Detailed view of out-of-range values and test information
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-y-auto flex-1 space-y-6">
                {/* Test Information */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Product</label>
                    <p className="font-medium">{selectedTest.productName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Line</label>
                    <p className="font-medium capitalize">{selectedTest.line?.replace('line', 'Line ') || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Shift</label>
                    <p className="font-medium">{selectedTest.shift}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Batch No</label>
                    <p className="font-medium">{selectedTest.batchNo}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Test Date</label>
                    <p className="font-medium">{selectedTest.testDate}</p>
                  </div>
                </div>

                {/* Hold Information */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-medium text-red-900 mb-2">Hold Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <label className="text-red-700 font-medium">Hold Date:</label>
                      <p className="text-red-800">{formatTimestamp(selectedTest.holdAt)}</p>
                    </div>
                    <div>
                      <label className="text-red-700 font-medium">Hold By:</label>
                      <p className="text-red-800">
                        {(() => {
                          const holdByUid = selectedTest.holdBy
                          if (!holdByUid) return 'System'
                          
                          const mappedName = userNames[holdByUid]
                          if (mappedName) return mappedName
                          
                          // If no mapped name, try to extract meaningful info from UID
                          if (holdByUid.includes('@')) {
                            return holdByUid.split('@')[0] // Extract username from email
                          }
                          
                          // Check if UID contains user type info
                          if (holdByUid.toLowerCase().includes('g1')) return 'G1 User'
                          if (holdByUid.toLowerCase().includes('g2')) return 'G2 User'  
                          if (holdByUid.toLowerCase().includes('g3')) return 'G3 User'
                          if (holdByUid.toLowerCase().includes('admin')) return 'Admin User'
                          
                          // Last resort: show the UID itself (better than 'System')
                          return holdByUid
                        })()}
                      </p>
                    </div>
                    <div>
                      <label className="text-red-700 font-medium">Hold Reason:</label>
                      <p className="text-red-800">{selectedTest.holdReason || 'Out of specification range values detected'}</p>
                    </div>
                  </div>

                  {/* Action History - Show only for history items */}
                  {activeView === 'history' && (
                    <div className="border-t border-red-300 pt-4">
                      <h4 className="font-medium text-red-900 mb-3">Action History</h4>
                      <div className="space-y-3">
                        
                        {/* Original Hold Action */}
                        <div className="flex items-start gap-3 p-3 bg-red-100 rounded-lg">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <span className="font-medium text-red-800">Test Put on Hold</span>
                              <Badge variant="destructive" className="text-xs">Initial</Badge>
                            </div>
                            <p className="text-sm text-red-700">
                              By: <span className="font-medium">
                                {(() => {
                                  const holdByUid = selectedTest.holdBy
                                  if (!holdByUid) return 'System'
                                  
                                  const mappedName = userNames[holdByUid]
                                  if (mappedName) return mappedName
                                  
                                  // If no mapped name, try to extract meaningful info from UID
                                  if (holdByUid.includes('@')) {
                                    return holdByUid.split('@')[0] // Extract username from email
                                  }
                                  
                                  // Check if UID contains user type info
                                  if (holdByUid.toLowerCase().includes('g1')) return 'G1 User'
                                  if (holdByUid.toLowerCase().includes('g2')) return 'G2 User'  
                                  if (holdByUid.toLowerCase().includes('g3')) return 'G3 User'
                                  if (holdByUid.toLowerCase().includes('admin')) return 'Admin User'
                                  
                                  // Last resort: show the UID itself (better than 'System')
                                  return holdByUid
                                })()}
                              </span>
                            </p>
                            <p className="text-sm text-red-600">
                              Date: {formatTimestamp(selectedTest.holdAt)}
                            </p>
                            <p className="text-sm text-red-600">
                              Reason: {selectedTest.holdReason || 'Out of specification range values detected'}
                            </p>
                          </div>
                        </div>

                        {/* Edit Actions */}
                        {selectedTest.editedBy && selectedTest.editedAt && (
                          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Edit className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-blue-800">Test Values Edited</span>
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">Admin Action</Badge>
                              </div>
                              <p className="text-sm text-blue-700">
                                By: <span className="font-medium">{userNames[selectedTest.editedBy] || selectedTest.editedBy || 'Unknown Admin'}</span>
                              </p>
                              <p className="text-sm text-blue-600">
                                Date: {formatTimestamp(selectedTest.editedAt)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Release Actions */}
                        {selectedTest.releasedBy && selectedTest.releasedAt && (
                          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-green-800">Test Released from Hold</span>
                                <Badge variant="default" className="text-xs bg-green-100 text-green-800">Final Action</Badge>
                              </div>
                              <p className="text-sm text-green-700">
                                By: <span className="font-medium">{userNames[selectedTest.releasedBy] || selectedTest.releasedBy || 'Unknown Admin'}</span>
                              </p>
                              <p className="text-sm text-green-600">
                                Date: {formatTimestamp(selectedTest.releasedAt)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Current Status */}
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 bg-gray-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Factory className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-gray-800">Current Status</span>
                              <Badge 
                                variant={selectedTest.isHold ? "destructive" : "default"} 
                                className="text-xs"
                              >
                                {selectedTest.isHold ? 'Still on Hold' : 'Released'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {selectedTest.isHold 
                                ? 'This test is still on hold and requires admin attention.' 
                                : 'This test has been released and is back in the normal workflow.'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Out of Range Values */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Out of Range Values</h3>
                  {selectedTest.outOfRangeValues && Object.keys(selectedTest.outOfRangeValues).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(selectedTest.outOfRangeValues).map(([key, data]) => (
                        <div key={key} className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div>
                            <span className="font-medium text-red-900">{key}</span>
                            <p className="text-sm text-red-700">Expected: {data.expected}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-red-600">{data.actual}</span>
                            <p className="text-sm text-red-500">Actual Value</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No out-of-range values recorded</p>
                  )}
                </div>

                {/* Test Data */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Test Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* G1 Tests */}
                    {selectedTest.g1Tests && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Factory className="h-4 w-4" />
                          G1 Machine Tests
                        </h4>
                        <div className="space-y-1 text-sm">
                          {Object.entries(selectedTest.g1Tests)
                            .filter(([key]) => !['completedBy', 'completedById', 'completedAt'].includes(key))
                            .map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-600">{key}:</span>
                                <span className="font-medium">{value}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* G2 Tests */}
                    {selectedTest.g2Tests && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Factory className="h-4 w-4" />
                          G2 Machine Tests
                        </h4>
                        <div className="space-y-1 text-sm">
                          {Object.entries(selectedTest.g2Tests)
                            .filter(([key]) => !['completedBy', 'completedById', 'completedAt'].includes(key))
                            .map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-600">{key}:</span>
                                <span className="font-medium">{value}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* G3 Tests */}
                    {selectedTest.g3Tests && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Factory className="h-4 w-4" />
                          G3 Machine Tests
                        </h4>
                        <div className="space-y-1 text-sm">
                          {Object.entries(selectedTest.g3Tests)
                            .filter(([key]) => !['completedBy', 'completedById', 'completedAt'].includes(key))
                            .map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-600">{key}:</span>
                                <span className="font-medium">{value}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              
              {/* Modal Footer */}
              <div className="flex-shrink-0 border-t bg-white p-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedTest(null)
                  }}
                >
                  Close
                </Button>
                {/* Only show Release button for hold view, not history view */}
                {activeView === 'hold' && canEdit && (
                  <Button
                    variant="default"
                    onClick={() => {
                      handleReleaseFromHold(selectedTest.id!)
                      setShowDetailsModal(false)
                      setSelectedTest(null)
                    }}
                    disabled={releasing === selectedTest.id}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {releasing === selectedTest.id ? 'Releasing...' : 'Release from Hold'}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingTest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-blue-500" />
                  Edit Hold Test - {editingTest.referenceNo}
                </CardTitle>
                <CardDescription>
                  Edit the test values to correct out-of-range measurements
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-y-auto flex-1 space-y-6">
                {/* Test Information */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Product</label>
                    <p className="font-medium">{editingTest.productName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Batch No</label>
                    <p className="font-medium">{editingTest.batchNo}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Shift</label>
                    <p className="font-medium">{editingTest.shift}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Test Date</label>
                    <p className="font-medium">{editingTest.testDate}</p>
                  </div>
                </div>

                {/* Editable Test Values */}
                <div className="space-y-6">
                  <h3 className="font-medium text-gray-900">Edit Test Values</h3>
                  
                  {/* G1 Tests */}
                  {editingTest.g1Tests && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
                        <Factory className="h-4 w-4" />
                        G1 Machine Tests
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(editingTest.g1Tests)
                          .filter(([key]) => !['completedBy', 'completedById', 'completedAt'].includes(key))
                          .map(([key, value]) => (
                            <div key={key} className="space-y-2">
                              <label className="text-sm font-medium text-gray-600 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={editValues[key] || ''}
                                onChange={(e) => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* G2 Tests */}
                  {editingTest.g2Tests && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
                        <Factory className="h-4 w-4" />
                        G2 Machine Tests
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(editingTest.g2Tests)
                          .filter(([key]) => !['completedBy', 'completedById', 'completedAt'].includes(key))
                          .map(([key, value]) => (
                            <div key={key} className="space-y-2">
                              <label className="text-sm font-medium text-gray-600 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={editValues[key] || ''}
                                onChange={(e) => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* G3 Tests */}
                  {editingTest.g3Tests && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
                        <Factory className="h-4 w-4" />
                        G3 Machine Tests
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(editingTest.g3Tests)
                          .filter(([key]) => !['completedBy', 'completedById', 'completedAt'].includes(key))
                          .map(([key, value]) => (
                            <div key={key} className="space-y-2">
                              <label className="text-sm font-medium text-gray-600 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={editValues[key] || ''}
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  setEditValues(prev => {
                                    const updated = { ...prev, [key]: newValue };
                                    
                                    // Handle G3 auto-calculations
                                    if (key === 'rheoTS2Min' && newValue) {
                                      updated['rheoTS2Sec'] = (parseFloat(newValue) * 60).toString();
                                    } else if (key === 'rheoTC90Min' && newValue) {
                                      updated['rheoTC90Sec'] = (parseFloat(newValue) * 60).toString();
                                    }
                                    
                                    return updated;
                                  });
                                }}
                                disabled={key === 'rheoTS2Sec' || key === 'rheoTC90Sec'}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  key === 'rheoTS2Sec' || key === 'rheoTC90Sec' ? 'bg-gray-100' : ''
                                }`}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              
              {/* Modal Footer */}
              <div className="flex-shrink-0 border-t bg-white p-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingTest(null)
                    setEditValues({})
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleSaveEditedTest}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save & Validate'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}