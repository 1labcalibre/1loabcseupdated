"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { ArrowLeft, TrendingUp, TrendingDown, Download, Calendar, BarChart3, PieChart, Activity, Loader2, AlertTriangle, CheckCircle, Clock, Users, FileText, TestTube, ShieldCheck } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/contexts/auth-context"
import { certificatesService, type Certificate } from "@/lib/firebase/services/certificates"
import { testDataService, type TestData } from "@/lib/firebase/services/test-data"
import { productsService, type Product } from "@/lib/firebase/services/products"
import { savedReportsService, type SavedReport } from "@/lib/firebase/services/saved-reports"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

interface AnalyticsData {
  totalTests: number
  completedTests: number
  pendingTests: number
  holdTests: number
  certificates: {
    total: number
    approved: number
    pending: number
    rejected: number
    draft: number
  }
  productPerformance: Array<{
    productId: string
    productName: string
    totalTests: number
    completedTests: number
    pendingTests: number
    holdTests: number
    yield: number
    avgCompletionTime: number
  }>
  monthlyTrends: Array<{
    month: string
    tests: number
    certificates: number
    completedTests: number
  }>
  defectAnalysis: Array<{
    type: string
    count: number
    percentage: number
  }>
}

export default function AnalyticsPage() {
  const { userData } = useAuth()
  const [timeRange, setTimeRange] = useState("30days")
  const [selectedProduct, setSelectedProduct] = useState("all")
  const [customDateRange, setCustomDateRange] = useState({
    from: "",
    to: ""
  })
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalTests: 0,
    completedTests: 0,
    pendingTests: 0,
    holdTests: 0,
    certificates: {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      draft: 0
    },
    productPerformance: [],
    monthlyTrends: [],
    defectAnalysis: []
  })
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [testData, setTestData] = useState<TestData[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])

  // Load data on component mount
  useEffect(() => {
    loadAllData()
    setupRealtimeListeners()
  }, [])

  // Recalculate analytics when data or filters change
  useEffect(() => {
    if (certificates.length > 0 || testData.length > 0) {
      calculateAnalytics()
    }
  }, [certificates, testData, products, savedReports, timeRange, selectedProduct, customDateRange])

  const loadAllData = async () => {
    setLoading(true)
    try {
      // Check if user is still authenticated before making Firestore calls
      if (!userData) {
        console.warn('User not authenticated, skipping analytics data load')
        setLoading(false)
        return
      }
      
      const [certificatesData, testDataResults, productsData, reportsData] = await Promise.all([
        certificatesService.getAll(),
        testDataService.getAll(),
        productsService.getAll(),
        savedReportsService.getAll()
      ])
      
      setCertificates(certificatesData)
      setTestData(testDataResults)
      setProducts(productsData)
      setSavedReports(reportsData)
    } catch (error) {
      console.error('Error loading analytics data:', error)
      // If permission denied, user might be logging out
      if ((error as any).code === 'permission-denied') {
        console.warn('Permission denied loading analytics data - user may be logging out')
        return
      }
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeListeners = () => {
    // Real-time listener for certificates
    const unsubscribeCertificates = onSnapshot(collection(db, 'certificates'), (snapshot) => {
      const certificatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Certificate[]
      setCertificates(certificatesData)
    }, (error) => {
      console.error('Error in certificates listener (analytics):', error)
      if ((error as any).code === 'permission-denied') {
        console.warn('Permission denied in analytics certificates listener - user may be logging out')
        return
      }
    })

    // Real-time listener for test data
    const unsubscribeTestData = onSnapshot(collection(db, 'testData'), (snapshot) => {
      const testDataResults = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestData[]
      setTestData(testDataResults)
    }, (error) => {
      console.error('Error in test data listener (analytics):', error)
      if ((error as any).code === 'permission-denied') {
        console.warn('Permission denied in analytics test data listener - user may be logging out')
        return
      }
    })

    return () => {
      unsubscribeCertificates()
      unsubscribeTestData()
    }
  }

  const getDateRange = () => {
    const now = new Date()
    let fromDate = new Date()
    
    if (showCustomRange && customDateRange.from && customDateRange.to) {
      return {
        from: new Date(customDateRange.from),
        to: new Date(customDateRange.to)
      }
    }

    switch (timeRange) {
      case "7days":
        fromDate.setDate(now.getDate() - 7)
        break
      case "30days":
        fromDate.setDate(now.getDate() - 30)
        break
      case "90days":
        fromDate.setDate(now.getDate() - 90)
        break
      case "1year":
        fromDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        fromDate.setDate(now.getDate() - 30)
    }

    return { from: fromDate, to: now }
  }

  const calculateAnalytics = () => {
    const { from, to } = getDateRange()
    
    // Filter data by date range and product
    const filteredCertificates = certificates.filter(cert => {
      const certDate = new Date(cert.issueDate || cert.createdAt)
      const inDateRange = certDate >= from && certDate <= to
      const matchesProduct = selectedProduct === "all" || cert.productId === selectedProduct
      return inDateRange && matchesProduct
    })

    const filteredTestData = testData.filter(test => {
      const testDate = new Date(test.testDate || test.createdAt)
      const inDateRange = testDate >= from && testDate <= to
      const matchesProduct = selectedProduct === "all" || test.productId === selectedProduct
      return inDateRange && matchesProduct
    })

    // Calculate certificate metrics
    const certificateMetrics = {
      total: filteredCertificates.length,
      approved: filteredCertificates.filter(c => c.status === 'approved').length,
      pending: filteredCertificates.filter(c => c.status === 'awaiting_authentication').length,
      rejected: filteredCertificates.filter(c => c.status === 'rejected').length,
      draft: filteredCertificates.filter(c => c.status === 'draft').length
    }

    // Calculate test metrics
    const totalTests = filteredTestData.length
    const completedTests = filteredTestData.filter(t => t.status === 'completed').length
    const pendingTests = filteredTestData.filter(t => t.status !== 'completed' && !t.isHold).length
    const holdTests = filteredTestData.filter(t => t.isHold).length

    // Calculate product performance
    const productPerformance = products.map(product => {
      const productTests = filteredTestData.filter(t => t.productId === product.id)
      const productCompleted = productTests.filter(t => t.status === 'completed')
      const productPending = productTests.filter(t => t.status !== 'completed' && !t.isHold)
      const productHold = productTests.filter(t => t.isHold)
      
      return {
        productId: product.id!,
        productName: product.name,
        totalTests: productTests.length,
        completedTests: productCompleted.length,
        pendingTests: productPending.length,
        holdTests: productHold.length,
        yield: productTests.length > 0 ? (productCompleted.length / productTests.length) * 100 : 0,
        avgCompletionTime: 0 // Could calculate based on timestamps
      }
    }).filter(p => p.totalTests > 0)

    // Calculate monthly trends (last 6 months)
    const monthlyTrends = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date()
      monthDate.setMonth(monthDate.getMonth() - i)
      monthDate.setDate(1)
      
      const nextMonth = new Date(monthDate)
      nextMonth.setMonth(monthDate.getMonth() + 1)
      
      const monthTests = testData.filter(t => {
        const testDate = new Date(t.testDate || t.createdAt)
        return testDate >= monthDate && testDate < nextMonth
      })
      
      const monthCertificates = certificates.filter(c => {
        const certDate = new Date(c.issueDate || c.createdAt)
        return certDate >= monthDate && certDate < nextMonth
      })
      
      monthlyTrends.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        tests: monthTests.length,
        certificates: monthCertificates.length,
        completedTests: monthTests.filter(t => t.status === 'completed').length
      })
    }

    // Calculate defect analysis based on hold reasons
    const holdReasons: Record<string, number> = {}
    filteredTestData.filter(t => t.isHold).forEach(test => {
      const reason = test.holdReason || 'Unknown'
      holdReasons[reason] = (holdReasons[reason] || 0) + 1
    })

    const totalHolds = Object.values(holdReasons).reduce((sum, count) => sum + count, 0)
    const defectAnalysis = Object.entries(holdReasons).map(([type, count]) => ({
      type,
      count,
      percentage: totalHolds > 0 ? Math.round((count / totalHolds) * 100) : 0
    })).sort((a, b) => b.count - a.count)

    setAnalyticsData({
      totalTests,
      completedTests,
      pendingTests,
      holdTests,
      certificates: certificateMetrics,
      productPerformance,
      monthlyTrends,
      defectAnalysis
    })
  }

  const exportAnalytics = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      dateRange: getDateRange(),
      selectedProduct,
      analytics: analyticsData
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading analytics data...</span>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute page="analytics" pagePermission="canView">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Analytics & Reporting</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Comprehensive quality control analytics</p>
              </div>
            </div>
            <Button onClick={exportAnalytics} className="w-full sm:w-auto text-xs sm:text-sm" size="sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-3 sm:px-6 py-4 sm:py-6">
          {/* Filters */}
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id!}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                className="w-full sm:w-auto text-sm"
                onClick={() => setShowCustomRange(!showCustomRange)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Custom Range
              </Button>
            </div>

            {/* Custom Date Range */}
            {showCustomRange && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="fromDate" className="text-xs sm:text-sm">From Date</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={customDateRange.from}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDate" className="text-xs sm:text-sm">To Date</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={customDateRange.to}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Overview KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Total Tests */}
            <Card className="p-4 sm:p-6">
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Tests</CardTitle>
                  <TestTube className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold">{analyticsData.totalTests}</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">
                  {analyticsData.completedTests} completed
                </div>
              </CardContent>
            </Card>

            {/* Completion Rate */}
            <Card className="p-4 sm:p-6">
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-medium truncate">Completion Rate</CardTitle>
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold">
                  {analyticsData.totalTests > 0 
                    ? Math.round((analyticsData.completedTests / analyticsData.totalTests) * 100)
                    : 0}%
                </div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">
                  Pass rate
                </div>
              </CardContent>
            </Card>

            {/* Certificates Issued */}
            <Card className="p-4 sm:p-6">
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-medium truncate">Certificates</CardTitle>
                  <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600 flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold">{analyticsData.certificates.total}</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">
                  {analyticsData.certificates.approved} approved
                </div>
              </CardContent>
            </Card>

            {/* Quality Issues */}
            <Card className="p-4 sm:p-6">
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-medium truncate">Quality Issues</CardTitle>
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold">{analyticsData.holdTests}</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">
                  On hold
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Certificate Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Certificate Status Overview</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Current certificate pipeline status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Approved</span>
                    </div>
                    <span className="font-medium">{analyticsData.certificates.approved}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Pending</span>
                    </div>
                    <span className="font-medium">{analyticsData.certificates.pending}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span className="text-sm">Draft</span>
                    </div>
                    <span className="font-medium">{analyticsData.certificates.draft}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Rejected</span>
                    </div>
                    <span className="font-medium">{analyticsData.certificates.rejected}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Status Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Test Status Overview</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Current testing pipeline status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Completed</span>
                    </div>
                    <span className="font-medium">{analyticsData.completedTests}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">In Progress</span>
                    </div>
                    <span className="font-medium">{analyticsData.pendingTests}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Hold</span>
                    </div>
                    <span className="font-medium">{analyticsData.holdTests}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-sm">Total Tests</span>
                      <span>{analyticsData.totalTests}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trends and Quality Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Monthly Trend Chart */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Monthly Performance Trends</CardTitle>
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <CardDescription className="text-xs sm:text-sm">Last 6 months overview</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.monthlyTrends.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {analyticsData.monthlyTrends.map((month) => (
                      <div key={month.month} className="space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="font-medium">{month.month}</span>
                          <span className="text-gray-600">{month.tests} tests</span>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 h-4 sm:h-6 bg-blue-100 rounded relative overflow-hidden">
                            <div 
                              className="absolute left-0 top-0 h-full bg-blue-500"
                              style={{ 
                                width: month.tests > 0 
                                  ? `${(month.completedTests / month.tests) * 100}%` 
                                  : '0%' 
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-8 sm:w-12">
                            {month.tests > 0 
                              ? `${Math.round((month.completedTests / month.tests) * 100)}%`
                              : '0%'
                            }
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No trend data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quality Issues Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Quality Issues Analysis</CardTitle>
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <CardDescription className="text-xs sm:text-sm">Hold reasons breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.defectAnalysis.length > 0 ? (
                  <div className="space-y-3">
                    {analyticsData.defectAnalysis.slice(0, 5).map((defect, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            index === 0 ? 'bg-red-500' :
                            index === 1 ? 'bg-orange-500' :
                            index === 2 ? 'bg-yellow-500' :
                            index === 3 ? 'bg-blue-500' :
                            'bg-gray-500'
                          }`} />
                          <span className="text-xs sm:text-sm truncate">{defect.type}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs sm:text-sm font-medium">{defect.count}</span>
                          <span className="text-xs text-gray-500">({defect.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 mt-3 border-t">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="font-medium">Total Issues</span>
                        <span className="font-bold">{analyticsData.holdTests}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No quality issues found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Product Performance Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Product Performance Analysis</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Detailed metrics by product line</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.productPerformance.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Product</TableHead>
                        <TableHead className="text-center text-xs sm:text-sm hidden sm:table-cell">Total Tests</TableHead>
                        <TableHead className="text-center text-xs sm:text-sm">Completed</TableHead>
                        <TableHead className="text-center text-xs sm:text-sm hidden md:table-cell">Pending</TableHead>
                        <TableHead className="text-center text-xs sm:text-sm">Hold</TableHead>
                        <TableHead className="text-center text-xs sm:text-sm">Yield %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsData.productPerformance.map((product) => (
                        <TableRow key={product.productId}>
                          <TableCell className="font-medium text-xs sm:text-sm max-w-[120px] truncate">
                            {product.productName}
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm hidden sm:table-cell">
                            {product.totalTests}
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm">
                            {product.completedTests}
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm hidden md:table-cell">
                            {product.pendingTests}
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm">
                            <span className={`${product.holdTests > 0 ? 'text-red-600 font-medium' : ''}`}>
                              {product.holdTests}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm">
                            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs ${
                              product.yield >= 95 ? 'bg-green-100 text-green-700' :
                              product.yield >= 90 ? 'bg-yellow-100 text-yellow-700' :
                              product.yield >= 80 ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {product.yield.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No product performance data available
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
} 