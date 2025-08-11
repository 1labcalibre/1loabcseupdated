"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, ArrowLeft, Save, Filter, History, Search, Printer, RefreshCw, Trash2, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { productsService, type Product } from "@/lib/firebase/services/products"
import { testDataService, type TestData } from "@/lib/firebase/services/test-data"
import { testParametersService, type TestParameter } from "@/lib/firebase/services/test-parameters"
import { savedReportsService, type SavedReport } from "@/lib/firebase/services/saved-reports"
import { useRouter } from "next/navigation"

interface Statistics {
  [key: string]: {
    min: number
    mean: number
    max: number
  }
}

export default function BatchSelectionPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [reportName, setReportName] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [previewData, setPreviewData] = useState<any>(null)
  const [reportNameSuggestions, setReportNameSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingReports, setLoadingReports] = useState(false)
  
  // Filter state
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    productId: "",
    line: "all"
  })
  
  // Load Previous Reports filter state
  const [loadReportFilters, setLoadReportFilters] = useState({
    fromDate: "",
    toDate: "",
    reportName: "",
    product: "all"
  })
  const [filteredReports, setFilteredReports] = useState<SavedReport[]>([])
  const [showReportSuggestions, setShowReportSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  // Removed pagination - load all data for vertical scrolling
  
  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [testData, setTestData] = useState<TestData[]>([])
  const [testParameters, setTestParameters] = useState<TestParameter[]>([])
  const [statistics, setStatistics] = useState<Statistics>({})

  // Load products and test parameters on mount
  useEffect(() => {
    loadProducts()
    loadTestParameters()
  }, [])
  
  // Load saved reports when modal opens
  useEffect(() => {
    if (showLoadModal) {
      loadSavedReports()
    }
  }, [showLoadModal])

  // Initialize filtered reports when saved reports change
  useEffect(() => {
    setFilteredReports(savedReports)
  }, [savedReports])
  
  // Set dates after mount to avoid hydration issues
  useEffect(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    // Also check 30 days in future in case of test data with future dates
    const thirtyDaysAhead = new Date()
    thirtyDaysAhead.setDate(today.getDate() + 30)
    
    setFilters(prev => ({
      ...prev,
      fromDate: thirtyDaysAgo.toISOString().split('T')[0] || '',
      toDate: thirtyDaysAhead.toISOString().split('T')[0] || ''
    }))
  }, [])

  // Calculate statistics when selected rows change
  useEffect(() => {
    if (selectedRows.length > 0) {
      calculateStatistics()
    } else {
      setStatistics({})
    }
  }, [selectedRows, testData, testParameters])

  const loadProducts = async () => {
    try {
      const data = await productsService.getActive()
      setProducts(data)
      if (data.length > 0 && data[0]?.id) {
        setFilters(prev => ({ ...prev, productId: data[0]?.id || '' }))
      }
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const loadTestParameters = async () => {
    try {
      const params = await testParametersService.getActive()
      setTestParameters(params)
    } catch (error) {
      console.error('Error loading test parameters:', error)
    }
  }
  
  const loadSavedReports = async () => {
    try {
      setLoadingReports(true)
      // Load last month's reports by default
      const reports = await savedReportsService.getLastMonth()
      setSavedReports(reports)
      
      // Load unique report names for autocomplete
      const uniqueNames = await savedReportsService.getUniqueReportNames()
      setReportNameSuggestions(uniqueNames)
    } catch (error) {
      console.error('Error loading saved reports:', error)
    } finally {
      setLoadingReports(false)
    }
  }
  
  const handleReportNameChange = async (value: string) => {
    setReportName(value)
    
    if (value.length > 0) {
      // Filter suggestions based on input
      const filtered = reportNameSuggestions.filter(name =>
        name.toLowerCase().includes(value.toLowerCase())
      )
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const loadTestData = async () => {
    if (!filters.productId) return
    
    setLoadingData(true)
    try {
      // Get test data for the selected product
      const data = await testDataService.getByProduct(filters.productId)
      
      // Filter for completed tests only (all G1, G2, G3 completed) and exclude hold items
      const filteredData = data.filter(test => {
        // Check if all machine tests are completed
        const hasG1Tests = test.g1Tests && test.g1Tests.completedAt
        const hasG2Tests = test.g2Tests && test.g2Tests.completedAt  
        const hasG3Tests = test.g3Tests && test.g3Tests.completedAt
        const allTestsCompleted = hasG1Tests && hasG2Tests && hasG3Tests
        
        // Exclude hold items
        const notOnHold = !test.isHold && test.status !== 'hold'
        
        // Only include completed tests that are not on hold
        if (!allTestsCompleted || !notOnHold) {
          return false
        }
        
        // Handle date filtering
        let dateMatch = true
        if (filters.fromDate && filters.toDate && test.testDate) {
          const testDate = new Date(test.testDate)
          const fromDate = new Date(filters.fromDate)
          const toDate = new Date(filters.toDate)
          fromDate.setHours(0, 0, 0, 0)
          toDate.setHours(23, 59, 59, 999)
          dateMatch = testDate >= fromDate && testDate <= toDate
        }
        
        const lineMatch = filters.line === 'all' || !filters.line || test.line === filters.line
        return dateMatch && lineMatch
      })
      
      // Sort by date and batch number
      filteredData.sort((a, b) => {
        const dateCompare = new Date(a.testDate).getTime() - new Date(b.testDate).getTime()
        if (dateCompare !== 0) return dateCompare
        return a.batchNo.localeCompare(b.batchNo)
      })
      
      console.log(`Loaded ${filteredData.length} completed tests (excluding hold items) for product ${filters.productId}`)
      setTestData(filteredData)
      setSelectedRows([]) // Clear selection when loading new data
    } catch (error) {
      console.error('Error loading test data:', error)
      alert('Failed to load test data')
    } finally {
      setLoadingData(false)
    }
  }

  const calculateStatistics = () => {
    if (selectedRows.length === 0) return
    
    // Get test data for selected rows
    const selectedTestData = testData.filter((_, index) => selectedRows.includes(index.toString()))
    
    if (selectedTestData.length === 0) return
    
    const stats: Statistics = {}
    
    // Define all possible test parameters from our machine tests
    const allTestParams = [
      // G1 Tests
      { name: 'hardness', label: 'Hardness' },
      { name: 'density', label: 'Density' },
      // G2 Tests  
      { name: 'ts1', label: 'TS-1' },
      { name: 'ts2', label: 'TS-2' },
      { name: 'ts3', label: 'TS-3' },
      { name: 'ts4', label: 'TS-4' },
      { name: 'elongation1', label: 'Elongation %1' },
      { name: 'elongation2', label: 'Elongation %2' },
      { name: 'elongation3', label: 'Elongation %3' },
      { name: 'elongation4', label: 'Elongation %4' },
      { name: 'tearStrength', label: 'Tear Strength' },
      // G3 Tests
      { name: 'mooneyViscosity', label: 'Mooney Viscosity' },
      { name: 'rheoTS2Min', label: 'Rheo (TS2) Min' },
      { name: 'rheoTS2Sec', label: 'TS2 Sec' },
      { name: 'rheoTC90Min', label: 'Rheo (TC90) Min' },
      { name: 'rheoTC90Sec', label: 'TC90 Sec' }
    ]
    
    // Calculate statistics for each test parameter
    allTestParams.forEach(param => {
      const values: number[] = []
      
      selectedTestData.forEach(test => {
        let value: number | undefined
        
        // Check G1 tests
        if (test.g1Tests && test.g1Tests[param.name] !== undefined) {
          value = test.g1Tests[param.name]
        }
        // Check G2 tests
        else if (test.g2Tests && test.g2Tests[param.name] !== undefined) {
          value = test.g2Tests[param.name]
        }
        // Check G3 tests
        else if (test.g3Tests && test.g3Tests[param.name] !== undefined) {
          value = test.g3Tests[param.name]
        }
        
        if (value !== undefined && value !== null && !isNaN(value)) {
          values.push(value)
        }
      })
      
      if (values.length > 0) {
        const min = Math.min(...values)
        const max = Math.max(...values)
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length
        
        stats[param.name] = {
          min: parseFloat(min.toFixed(2)),
          mean: parseFloat(mean.toFixed(2)),
          max: parseFloat(max.toFixed(2))
        }
      }
    })
    
    console.log('Calculated statistics:', stats)
    setStatistics(stats)
  }

  const toggleRow = (rowId: string) => {
    setSelectedRows(prev =>
      prev.includes(rowId)
        ? prev.filter(id => id !== rowId)
        : [...prev, rowId]
    )
  }

  const selectAll = () => {
    setSelectedRows(testData.map((_, index) => index.toString()))
  }

  const clearSelection = () => {
    setSelectedRows([])
  }

  // Removed loadMoreItems - showing all data with vertical scroll

  // Removed generateReport function - statistics generate automatically

  const saveReport = () => {
    if (!reportName) {
      alert('Please enter a report name')
      return
    }
    
    if (selectedRows.length === 0) {
      alert('Please select at least one test entry')
      return
    }
    
    // Prepare preview data
    const product = products.find(p => p.id === filters.productId)
    const selectedTestData = testData.filter((_, index) => selectedRows.includes(index.toString()))
    
    setPreviewData({
      reportName: reportName,
      product: product?.name || '',
      line: filters.line === 'all' ? 'All Lines' : filters.line.replace('line', '').toUpperCase(),
      statistics: statistics,
      selectedCount: selectedRows.length,
      testData: selectedTestData
    })
    
    setShowPreview(true)
  }
  
  const confirmSaveReport = async () => {
    try {
      const selectedTestData = testData.filter((_, index) => selectedRows.includes(index.toString()))
      const testDataIds = selectedTestData.map(td => td.id || '').filter(id => id)
      
      // Extract comprehensive data for certificate generation
      const referenceNumbers = selectedTestData.map(td => td.referenceNo).filter(Boolean)
      const batchNumbers = selectedTestData.map(td => td.batchNo).filter(Boolean)
      const testDates = selectedTestData.map(td => new Date(td.testDate)).filter(date => !isNaN(date.getTime()))
      
      const dateRange: { from: string; to: string } = {
        from: testDates.length > 0 ? (new Date(Math.min(...testDates.map(d => d.getTime()))).toISOString().split('T')[0] || '') : (new Date().toISOString().split('T')[0] || ''),
        to: testDates.length > 0 ? (new Date(Math.max(...testDates.map(d => d.getTime()))).toISOString().split('T')[0] || '') : (new Date().toISOString().split('T')[0] || '')
      }
      
      const reportData: Omit<SavedReport, 'id'> = {
        name: reportName,
        productId: filters.productId,
        productName: previewData.product,
        line: previewData.line,
        recordsCount: selectedRows.length,
        statistics: statistics,
        testDataIds: testDataIds,
        // Enhanced data for certificate generation
        testData: {
          referenceNumbers: referenceNumbers,
          dateRange: dateRange,
          batchNumbers: [...new Set(batchNumbers)], // Remove duplicates
          completedMachines: ['G1', 'G2', 'G3'] // All machines completed (filtered data requirement)
        },
        // Quality assurance information
        qualityInfo: {
          allTestsCompleted: true, // Only completed tests are shown
          holdItemsExcluded: true, // Hold items are filtered out
          validationStatus: 'passed' as const,
          totalSamples: selectedRows.length
        },
        filters: {
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          line: filters.line
        },
        // User and metadata
        createdBy: user?.displayName || 'Unknown',
        createdByEmail: user?.email || 'unknown@calibre.com',
        certificateReady: true,
        reportVersion: '2.0' // Enhanced version with comprehensive data
      }
      
      console.log('Saving enhanced report data:', reportData)
      const reportId = await savedReportsService.create(reportData)
      
      alert(`Report "${reportName}" saved successfully!\nReport ID: ${reportId}\n✓ Ready for Certificate of Analysis generation`)
      setReportName("")
      setShowPreview(false)
      setPreviewData(null)
      
      // Reload saved reports
      loadSavedReports()
    } catch (error) {
      console.error('Error saving report:', error)
      alert('Failed to save report. Please try again.')
    }
  }
  
  const loadSavedReport = async (report: SavedReport) => {
    try {
      // Set the report name
      setReportName(report.name)
      
      // Set the filters
      setFilters({
        fromDate: report.filters?.fromDate || filters.fromDate,
        toDate: report.filters?.toDate || filters.toDate,
        productId: report.productId,
        line: report.filters?.line || 'all'
      })
      
      // Load the test data
      await loadTestData()
      
      // Set the statistics
      setStatistics(report.statistics)
      
      // Close the modal
      setShowLoadModal(false)
      
      alert(`Report "${report.name}" loaded successfully!`)
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Failed to load report. Please try again.')
    }
  }

  const printRecords = () => {
    window.print()
  }

  const applyReportFilters = () => {
    const filtered = savedReports.filter(report => {
      // Filter by date range
      if (loadReportFilters.fromDate || loadReportFilters.toDate) {
        const reportDate = report.createdAt ? new Date(report.createdAt) : new Date()
        if (loadReportFilters.fromDate) {
          const fromDate = new Date(loadReportFilters.fromDate)
          fromDate.setHours(0, 0, 0, 0)
          if (reportDate < fromDate) return false
        }
        if (loadReportFilters.toDate) {
          const toDate = new Date(loadReportFilters.toDate)
          toDate.setHours(23, 59, 59, 999)
          if (reportDate > toDate) return false
        }
      }
      
      // Filter by report name (starts with)
      if (loadReportFilters.reportName) {
        if (!report.name.toLowerCase().startsWith(loadReportFilters.reportName.toLowerCase())) {
          return false
        }
      }
      
      // Filter by product
      if (loadReportFilters.product && loadReportFilters.product !== "all") {
        if (report.productName !== loadReportFilters.product) {
          return false
        }
      }
      
      return true
    })
    
    setFilteredReports(filtered)
  }

  const handleReportNameFilterChange = (value: string) => {
    setLoadReportFilters({ ...loadReportFilters, reportName: value })
    
    // Show suggestions for autocomplete
    if (value.length > 0) {
      const suggestions = reportNameSuggestions.filter(name =>
        name.toLowerCase().startsWith(value.toLowerCase())
      )
      setFilteredSuggestions(suggestions)
      setShowReportSuggestions(suggestions.length > 0)
    } else {
      setShowReportSuggestions(false)
    }
  }

  return (
    <ProtectedRoute requiredPermission="canView">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Filter Tensile Test Report</h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-8">
          <div className="space-y-6">
            {/* Page header with Load Previous Reports button */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Filter Tensile Test Report</h2>
                <p className="text-gray-600">
                  Select test data and generate reports with statistics
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => setShowLoadModal(true)}
              >
                <History className="h-4 w-4 mr-2" />
                Load Previous Reports
              </Button>
            </div>

            {/* Filter Section */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="fromDate">From Date</Label>
                    <Input 
                      id="fromDate" 
                      type="date" 
                      value={filters.fromDate}
                      onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toDate">To Date</Label>
                    <Input 
                      id="toDate" 
                      type="date" 
                      value={filters.toDate}
                      onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product">Product</Label>
                    <Select 
                      value={filters.productId}
                      onValueChange={(value) => setFilters({ ...filters, productId: value })}
                    >
                      <SelectTrigger id="product">
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id!}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="line">Line</Label>
                    <Select 
                      value={filters.line}
                      onValueChange={(value) => setFilters({ ...filters, line: value })}
                    >
                      <SelectTrigger id="line">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Lines</SelectItem>
                        <SelectItem value="lineA">Line A</SelectItem>
                        <SelectItem value="lineB">Line B</SelectItem>
                        <SelectItem value="line3">Line 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={loadTestData}
                    disabled={loadingData || !filters.productId}
                  >
                    {loadingData ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load Records'
                    )}
                  </Button>
                  <div className="space-y-2">
                    <Label htmlFor="reportName">Report No.</Label>
                    <Input 
                      id="reportName" 
                      placeholder="Enter Report No."
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Test Data Table */}
              <div>
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Completed Test Data</CardTitle>
                        <CardDescription>
                          {testData.length} completed tests found (G1, G2, G3 all finished, excluding hold items) | {selectedRows.length} selected
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={selectAll}>
                          Select All
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearSelection}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Select</TableHead>
                            <TableHead>S.No</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Batch No</TableHead>
                            <TableHead>Reference No</TableHead>
                            <TableHead>Line</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {testData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                                {loadingData ? "Loading test data..." : "No completed test data found. Click 'Load Records' to fetch data."}
                              </TableCell>
                            </TableRow>
                          ) : (
                            testData
                              .map((test, index) => {
                                return (
                              <TableRow key={test.id}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedRows.includes(index.toString())}
                                    onChange={() => toggleRow(index.toString())}
                                    className="h-4 w-4"
                                  />
                                </TableCell>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{new Date(test.testDate).toLocaleDateString()}</TableCell>
                                <TableCell>{test.batchNo}</TableCell>
                                <TableCell>
                                  <span className="font-mono text-sm">{test.referenceNo}</span>
                                </TableCell>
                                <TableCell>{test.line?.replace('line', '').toUpperCase() || '-'}</TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ All Tests Completed
                                  </span>
                                </TableCell>
                              </TableRow>
                                );
                              })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Test Data Summary */}
                    {testData.length > 0 && (
                      <div className="mt-4 flex items-center justify-center">
                        <p className="text-sm text-gray-600 bg-green-50 px-4 py-2 rounded-lg border">
                          <span className="font-medium text-green-700">✓ {testData.length} completed tests loaded</span>
                          <span className="text-xs text-gray-500 ml-2">(All G1, G2, G3 finished, hold items excluded)</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Statistics Panel */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Statistics</CardTitle>
                    <CardDescription>Min, Mean, Max values</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(statistics).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Select test entries to see statistics
                      </div>
                    ) : (
                      <div className="space-y-4 bg-white p-4 border rounded-lg">
                        {/* Statistics Display - Matching Image Format */}
                        
                        {/* Hardness (ShA) */}
                        {statistics['hardness'] && (
                          <div className="border-l-4 border-green-500 pl-4">
                            <div className="font-bold text-green-700 mb-2">Hardness (ShA)</div>
                            <div className="flex items-center space-x-8 text-sm">
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Min:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['hardness'].min}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Mean:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['hardness'].mean}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Max:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['hardness'].max}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Density (g/cc) */}
                        {statistics['density'] && (
                          <div className="border-l-4 border-green-500 pl-4">
                            <div className="font-bold text-green-700 mb-2">Density (g/cc)</div>
                            <div className="flex items-center space-x-8 text-sm">
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Min:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['density'].min}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Mean:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['density'].mean}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Max:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['density'].max}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tensile Strength (Mpa) */}
                        {(statistics['ts1'] || statistics['ts2'] || statistics['ts3'] || statistics['ts4']) && (
                          <div className="border-l-4 border-green-500 pl-4">
                            <div className="font-bold text-green-700 mb-2">Tensile Strength (Mpa)</div>
                            <div className="flex items-center space-x-8 text-sm">
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Min:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">
                                  {(() => {
                                    const tsValues = [statistics['ts1'], statistics['ts2'], statistics['ts3'], statistics['ts4']].filter(Boolean);
                                    return tsValues.length > 0 ? Math.min(...tsValues.map(v => v?.min || 0)).toFixed(2) : '-';
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Mean:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">
                                  {(() => {
                                    const tsValues = [statistics['ts1'], statistics['ts2'], statistics['ts3'], statistics['ts4']].filter(Boolean);
                                    return tsValues.length > 0 ? (tsValues.reduce((sum, v) => sum + (v?.mean || 0), 0) / tsValues.length).toFixed(2) : '-';
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Max:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">
                                  {(() => {
                                    const tsValues = [statistics['ts1'], statistics['ts2'], statistics['ts3'], statistics['ts4']].filter(Boolean);
                                    return tsValues.length > 0 ? Math.max(...tsValues.map(v => v?.max || 0)).toFixed(2) : '-';
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Elongation (%) */}
                        {(statistics['elongation1'] || statistics['elongation2'] || statistics['elongation3'] || statistics['elongation4']) && (
                          <div className="border-l-4 border-green-500 pl-4">
                            <div className="font-bold text-green-700 mb-2">Elongation (%)</div>
                            <div className="flex items-center space-x-8 text-sm">
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Min:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">
                                  {(() => {
                                    const elongValues = [statistics['elongation1'], statistics['elongation2'], statistics['elongation3'], statistics['elongation4']].filter(Boolean);
                                    return elongValues.length > 0 ? Math.min(...elongValues.map(v => v?.min || 0)).toFixed(2) : '-';
                                  })()}
                                </span>
                                <span className="ml-1 text-blue-600">%</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Mean:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">
                                  {(() => {
                                    const elongValues = [statistics['elongation1'], statistics['elongation2'], statistics['elongation3'], statistics['elongation4']].filter(Boolean);
                                    return elongValues.length > 0 ? (elongValues.reduce((sum, v) => sum + (v?.mean || 0), 0) / elongValues.length).toFixed(2) : '-';
                                  })()}
                                </span>
                                <span className="ml-1 text-blue-600">%</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Max:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">
                                  {(() => {
                                    const elongValues = [statistics['elongation1'], statistics['elongation2'], statistics['elongation3'], statistics['elongation4']].filter(Boolean);
                                    return elongValues.length > 0 ? Math.max(...elongValues.map(v => v?.max || 0)).toFixed(2) : '-';
                                  })()}
                                </span>
                                <span className="ml-1 text-blue-600">%</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tear Strength */}
                        {statistics['tearStrength'] && (
                          <div className="border-l-4 border-green-500 pl-4">
                            <div className="font-bold text-green-700 mb-2">Tear Strength</div>
                            <div className="flex items-center space-x-8 text-sm">
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Min:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['tearStrength'].min}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Mean:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['tearStrength'].mean}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Max:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['tearStrength'].max}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Mooney Viscosity */}
                        {statistics['mooneyViscosity'] && (
                          <div className="border-l-4 border-green-500 pl-4">
                            <div className="font-bold text-green-700 mb-2">Mooney Viscosity</div>
                            <div className="flex items-center space-x-8 text-sm">
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Min:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['mooneyViscosity'].min}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Mean:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['mooneyViscosity'].mean}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Max:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['mooneyViscosity'].max}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Rheo (TS2) (s) */}
                        {statistics['rheoTS2Sec'] && (
                          <div className="border-l-4 border-green-500 pl-4">
                            <div className="font-bold text-green-700 mb-2">Rheo (TS2) (s)</div>
                            <div className="flex items-center space-x-8 text-sm">
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Min:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['rheoTS2Sec'].min}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Mean:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['rheoTS2Sec'].mean}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Max:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['rheoTS2Sec'].max}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Rheo (TC90) (s) */}
                        {statistics['rheoTC90Sec'] && (
                          <div className="border-l-4 border-green-500 pl-4">
                            <div className="font-bold text-green-700 mb-2">Rheo (TC90) (s)</div>
                            <div className="flex items-center space-x-8 text-sm">
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Min:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['rheoTC90Sec'].min}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Mean:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['rheoTC90Sec'].mean}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-600 mr-2">Max:</span>
                                <span className="border-b border-gray-300 px-2 py-1 min-w-[60px] text-center">{statistics['rheoTC90Sec'].max}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Action Buttons - Logically organized */}
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <div className="flex gap-2">
                {/* Data Management Actions */}
                <Button 
                  variant="outline"
                  onClick={printRecords}
                  disabled={testData.length === 0}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Records
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setTestData([])
                    setSelectedRows([])
                    setStatistics({})
                  }}
                  disabled={testData.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Data
                </Button>
              </div>
              
              <div className="flex gap-2">
                {/* Report Actions */}
                <Button 
                  variant="outline"
                  onClick={saveReport}
                  disabled={!reportName || selectedRows.length === 0}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Report
                </Button>

              </div>
            </div>
        </main>

        {/* Enhanced Preview Modal */}
        {showPreview && previewData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-6xl max-h-[95vh] flex flex-col">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-green-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-blue-800">Certificate of Analysis - Report Preview</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Review all details before saving to database</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPreview(false)}
                    className="hover:bg-red-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Report Summary Card */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-blue-800 mb-3">Report Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-white p-3 rounded border">
                        <span className="font-medium text-blue-600">Report No:</span>
                        <p className="font-bold text-gray-800">{previewData.reportName}</p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <span className="font-medium text-green-600">Product:</span>
                        <p className="font-bold text-gray-800">{previewData.product}</p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <span className="font-medium text-purple-600">Production Line:</span>
                        <p className="font-bold text-gray-800">{previewData.line || 'All Lines'}</p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <span className="font-medium text-orange-600">Test Records:</span>
                        <p className="font-bold text-gray-800">{previewData.selectedCount} batches</p>
                      </div>
                    </div>
                  </div>

                  {/* Date Range Information */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-green-800 mb-3">Test Data Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-white p-3 rounded border">
                        <span className="font-medium text-green-600">Report Generated:</span>
                        <p className="font-bold text-gray-800">{new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <span className="font-medium text-green-600">Data Source:</span>
                        <p className="font-bold text-gray-800">Completed Tests Only</p>
                        <p className="text-xs text-gray-600">All G1, G2, G3 machines completed</p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <span className="font-medium text-green-600">Quality Status:</span>
                        <p className="font-bold text-green-800">✓ Hold Items Excluded</p>
                        <p className="text-xs text-gray-600">Only validated data included</p>
                      </div>
                    </div>
                  </div>

                  {/* Test Results Table */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Statistical Analysis Results</h3>
                    <div className="bg-white border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-blue-100 to-green-100">
                            <TableHead className="font-bold text-blue-800">Test Parameter</TableHead>
                            <TableHead className="text-center font-bold text-green-800">Unit</TableHead>
                            <TableHead className="text-center font-bold text-red-600">Minimum</TableHead>
                            <TableHead className="text-center font-bold text-blue-600">Mean</TableHead>
                            <TableHead className="text-center font-bold text-green-600">Maximum</TableHead>
                            <TableHead className="text-center font-bold text-purple-600">Machine</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* G1 Machine Tests */}
                          {previewData.statistics['hardness'] && (
                            <TableRow className="hover:bg-blue-50">
                              <TableCell className="font-medium text-green-700">Hardness</TableCell>
                              <TableCell className="text-center text-gray-600">Shore A</TableCell>
                              <TableCell className="text-center font-mono">{previewData.statistics['hardness'].min}</TableCell>
                              <TableCell className="text-center font-mono">{previewData.statistics['hardness'].mean}</TableCell>
                              <TableCell className="text-center font-mono">{previewData.statistics['hardness'].max}</TableCell>
                              <TableCell className="text-center"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">G1</span></TableCell>
                            </TableRow>
                          )}
                          
                          {previewData.statistics['density'] && (
                            <TableRow className="hover:bg-blue-50">
                              <TableCell className="font-medium text-green-700">Density</TableCell>
                              <TableCell className="text-center text-gray-600">g/cm³</TableCell>
                              <TableCell className="text-center font-mono">{previewData.statistics['density'].min}</TableCell>
                              <TableCell className="text-center font-mono">{previewData.statistics['density'].mean}</TableCell>
                              <TableCell className="text-center font-mono">{previewData.statistics['density'].max}</TableCell>
                              <TableCell className="text-center"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">G1</span></TableCell>
                            </TableRow>
                          )}
                        
                        {/* Tensile Strength (G2 Machine) */}
                        {(previewData.statistics['ts1'] || previewData.statistics['ts2'] || previewData.statistics['ts3'] || previewData.statistics['ts4']) && (
                          <TableRow className="hover:bg-green-50">
                            <TableCell className="font-medium text-green-700">Tensile Strength</TableCell>
                            <TableCell className="text-center text-gray-600">MPa</TableCell>
                            <TableCell className="text-center font-mono">
                              {(() => {
                                const tsValues = [previewData.statistics['ts1'], previewData.statistics['ts2'], previewData.statistics['ts3'], previewData.statistics['ts4']].filter(Boolean);
                                return tsValues.length > 0 ? Math.min(...tsValues.map(v => v.min)).toFixed(2) : '-';
                              })()}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {(() => {
                                const tsValues = [previewData.statistics['ts1'], previewData.statistics['ts2'], previewData.statistics['ts3'], previewData.statistics['ts4']].filter(Boolean);
                                return tsValues.length > 0 ? (tsValues.reduce((sum, v) => sum + v.mean, 0) / tsValues.length).toFixed(2) : '-';
                              })()}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {(() => {
                                const tsValues = [previewData.statistics['ts1'], previewData.statistics['ts2'], previewData.statistics['ts3'], previewData.statistics['ts4']].filter(Boolean);
                                return tsValues.length > 0 ? Math.max(...tsValues.map(v => v.max)).toFixed(2) : '-';
                              })()}
                            </TableCell>
                            <TableCell className="text-center"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">G2</span></TableCell>
                          </TableRow>
                        )}
                        
                        {/* Elongation (G2 Machine) */}
                        {(previewData.statistics['elongation1'] || previewData.statistics['elongation2'] || previewData.statistics['elongation3'] || previewData.statistics['elongation4']) && (
                          <TableRow className="hover:bg-green-50">
                            <TableCell className="font-medium text-green-700">Elongation</TableCell>
                            <TableCell className="text-center text-gray-600">%</TableCell>
                            <TableCell className="text-center font-mono">
                              {(() => {
                                const elongValues = [previewData.statistics['elongation1'], previewData.statistics['elongation2'], previewData.statistics['elongation3'], previewData.statistics['elongation4']].filter(Boolean);
                                return elongValues.length > 0 ? Math.min(...elongValues.map(v => v.min)).toFixed(2) : '-';
                              })()}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {(() => {
                                const elongValues = [previewData.statistics['elongation1'], previewData.statistics['elongation2'], previewData.statistics['elongation3'], previewData.statistics['elongation4']].filter(Boolean);
                                return elongValues.length > 0 ? (elongValues.reduce((sum, v) => sum + v.mean, 0) / elongValues.length).toFixed(2) : '-';
                              })()}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {(() => {
                                const elongValues = [previewData.statistics['elongation1'], previewData.statistics['elongation2'], previewData.statistics['elongation3'], previewData.statistics['elongation4']].filter(Boolean);
                                return elongValues.length > 0 ? Math.max(...elongValues.map(v => v.max)).toFixed(2) : '-';
                              })()}
                            </TableCell>
                            <TableCell className="text-center"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">G2</span></TableCell>
                          </TableRow>
                        )}

                        {/* Tear Strength (G2 Machine) */}
                        {previewData.statistics['tearStrength'] && (
                          <TableRow className="hover:bg-green-50">
                            <TableCell className="font-medium text-green-700">Tear Strength</TableCell>
                            <TableCell className="text-center text-gray-600">N/mm</TableCell>
                            <TableCell className="text-center font-mono">{previewData.statistics['tearStrength'].min}</TableCell>
                            <TableCell className="text-center font-mono">{previewData.statistics['tearStrength'].mean}</TableCell>
                            <TableCell className="text-center font-mono">{previewData.statistics['tearStrength'].max}</TableCell>
                            <TableCell className="text-center"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">G2</span></TableCell>
                          </TableRow>
                        )}

                        {/* Mooney Viscosity (G3 Machine) */}
                        {previewData.statistics['mooneyViscosity'] && (
                          <TableRow className="hover:bg-purple-50">
                            <TableCell className="font-medium text-green-700">Mooney Viscosity</TableCell>
                            <TableCell className="text-center text-gray-600">MU</TableCell>
                            <TableCell className="text-center font-mono">{previewData.statistics['mooneyViscosity'].min}</TableCell>
                            <TableCell className="text-center font-mono">{previewData.statistics['mooneyViscosity'].mean}</TableCell>
                            <TableCell className="text-center font-mono">{previewData.statistics['mooneyViscosity'].max}</TableCell>
                            <TableCell className="text-center"><span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">G3</span></TableCell>
                          </TableRow>
                        )}

                        {/* Rheo (TS2) (G3 Machine) */}
                        {previewData.statistics['rheoTS2Sec'] && (
                          <TableRow className="hover:bg-purple-50">
                            <TableCell className="font-medium text-green-700">Rheo (TS2)</TableCell>
                            <TableCell className="text-center text-gray-600">sec</TableCell>
                            <TableCell className="text-center font-mono">{previewData.statistics['rheoTS2Sec'].min}</TableCell>
                            <TableCell className="text-center font-mono">{previewData.statistics['rheoTS2Sec'].mean}</TableCell>
                            <TableCell className="text-center font-mono">{previewData.statistics['rheoTS2Sec'].max}</TableCell>
                            <TableCell className="text-center"><span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">G3</span></TableCell>
                          </TableRow>
                        )}

                        {/* Rheo (TC90) (G3 Machine) */}
                        {previewData.statistics['rheoTC90Sec'] && (
                          <TableRow className="hover:bg-purple-50">
                            <TableCell className="font-medium text-green-700">Rheo (TC90)</TableCell>
                            <TableCell className="text-center text-gray-600">sec</TableCell>
                            <TableCell className="text-center font-mono">{previewData.statistics['rheoTC90Sec'].min}</TableCell>
                            <TableCell className="text-center font-mono">{previewData.statistics['rheoTC90Sec'].mean}</TableCell>
                            <TableCell className="text-center font-mono">{previewData.statistics['rheoTC90Sec'].max}</TableCell>
                            <TableCell className="text-center"><span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">G3</span></TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  </div>
                  
                  {/* Additional Report Information */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-yellow-800 mb-3">Certificate Generation Ready</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-white p-3 rounded border">
                        <span className="font-medium text-yellow-600">Database Storage:</span>
                        <p className="text-gray-800">✓ Report will be saved for certificate generation</p>
                        <p className="text-xs text-gray-600">Accessible from certificate templates</p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <span className="font-medium text-yellow-600">Data Validation:</span>
                        <p className="text-gray-800">✓ All tests completed & validated</p>
                        <p className="text-xs text-gray-600">Hold items excluded automatically</p>
                      </div>
                    </div>
                  </div>

                  {/* Report Metadata */}
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Selected Records:</span>
                        <p className="font-bold text-blue-600">{previewData.selectedCount} test batches</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Report Generated:</span>
                        <p className="font-bold text-green-600">{new Date().toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Generated By:</span>
                        <p className="font-bold text-purple-600">{user?.email || 'System'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Report ID:</span>
                        <p className="font-bold text-orange-600">{Date.now()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              {/* Fixed Footer with Action Buttons */}
              <div className="flex-shrink-0 border-t bg-gradient-to-r from-blue-50 to-green-50 p-4">
                <div className="flex justify-between items-center gap-4">
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">⚠️ Important:</p>
                    <p>This report will be permanently saved and used for Certificate of Analysis generation.</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowPreview(false)} className="border-red-300 text-red-600 hover:bg-red-50">
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button onClick={confirmSaveReport} className="bg-green-600 hover:bg-green-700 text-white">
                      <Save className="mr-2 h-4 w-4" />
                      Confirm & Save to Database
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Load Previous Reports Modal */}
        {showLoadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Load Previous Reports</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowLoadModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Filters */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium mb-3">Filter Reports</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="load-fromDate" className="text-xs">From Date</Label>
                      <Input 
                        id="load-fromDate" 
                        type="date" 
                        value={loadReportFilters.fromDate}
                        onChange={(e) => setLoadReportFilters({ ...loadReportFilters, fromDate: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="load-toDate" className="text-xs">To Date</Label>
                      <Input 
                        id="load-toDate" 
                        type="date" 
                        value={loadReportFilters.toDate}
                        onChange={(e) => setLoadReportFilters({ ...loadReportFilters, toDate: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-2 relative">
                      <Label htmlFor="load-reportName" className="text-xs">Report No.</Label>
                      <Input 
                        id="load-reportName" 
                        placeholder="Start typing to search..."
                        value={loadReportFilters.reportName}
                        onChange={(e) => handleReportNameFilterChange(e.target.value)}
                        className="h-8"
                        autoComplete="off"
                      />
                      {showReportSuggestions && (
                        <div className="absolute top-full mt-1 w-full bg-white border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                          {filteredSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={() => {
                                setLoadReportFilters({ ...loadReportFilters, reportName: suggestion })
                                setShowReportSuggestions(false)
                              }}
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="load-product" className="text-xs">Product</Label>
                      <Select 
                        value={loadReportFilters.product}
                        onValueChange={(value) => setLoadReportFilters({ ...loadReportFilters, product: value })}
                      >
                        <SelectTrigger id="load-product" className="h-8">
                          <SelectValue placeholder="All products" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All products</SelectItem>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.name}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={applyReportFilters}
                    >
                      Get Reports
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setLoadReportFilters({
                          fromDate: "",
                          toDate: "",
                          reportName: "",
                          product: "all"
                        })
                        setFilteredReports(savedReports)
                        setShowReportSuggestions(false)
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>

                {/* Reports Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report No.</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Line</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                            {savedReports.length === 0 ? "No saved reports found" : "No reports match the selected filters"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell className="font-medium">{report.name}</TableCell>
                            <TableCell>{report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '-'}</TableCell>
                            <TableCell>{report.productName}</TableCell>
                            <TableCell>{report.line}</TableCell>
                            <TableCell>{report.recordsCount}</TableCell>
                            <TableCell>{report.createdBy}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => loadSavedReport(report)}
                                >
                                  Load
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // View report details
                                    setPreviewData({
                                      reportName: report.name,
                                      product: report.productName,
                                      line: report.line,
                                      statistics: report.statistics,
                                      selectedCount: report.recordsCount
                                    })
                                    setShowPreview(true)
                                    setShowLoadModal(false)
                                  }}
                                >
                                  View
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
} 

