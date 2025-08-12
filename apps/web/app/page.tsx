"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { FileText, FlaskConical, Package, CheckCircle, Settings, Users, BarChart3, ArrowRight, Clock, AlertCircle, Shield, GitBranch, Activity, Database, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { productsService } from "@/lib/firebase/services/products"
import { testDataService } from "@/lib/firebase/services/test-data"
import { certificatesService } from "@/lib/firebase/services/certificates"
import { onSnapshot, collection, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { seedDatabase } from "@/lib/firebase/seed-database"
import { MachineOperatorDashboard } from "@/components/dashboard/machine-operator-dashboard"

export default function DashboardPage() {
  const { userData } = useAuth()
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [stats, setStats] = useState({
    products: 0,
    testsToday: 0,
    certificatesThisMonth: 0,
    pendingApprovals: 0,
    pendingCertificateApprovals: 0
  })
  const [recentTests, setRecentTests] = useState<any[]>([])
  const [recentCertificates, setRecentCertificates] = useState<any[]>([])

  useEffect(() => {
    // Only load full dashboard data for users with broader permissions
    if (userData && (userData.role === 'L1' || userData.role === 'L2' || userData.role === 'ViewOnly')) {
      loadDashboardData()
      
      // Set up real-time listener for certificates
      const certificatesQuery = collection(db, 'certificates')
      const unsubscribeCertificates = onSnapshot(certificatesQuery, (snapshot) => {
        console.log('Real-time update: Certificates changed')
        loadDashboardData()
      }, (error) => {
        console.error('Error in certificates listener:', error)
        // If permission denied, user might be logging out
        if (error.code === 'permission-denied') {
          console.warn('Permission denied in dashboard certificates listener - user may be logging out')
          return
        }
      })
      
      return () => {
        unsubscribeCertificates()
      }
    } else {
      setLoading(false)
    }
  }, [userData])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Check if user is still authenticated before making Firestore calls
      if (!userData) {
        console.warn('User not authenticated, skipping dashboard data load')
        setLoading(false)
        return
      }
      
      // Load products count
      const products = await productsService.getActive()
      
      // Load test data
      const allTests = await testDataService.getAll()
      const today = new Date().toISOString().split('T')[0]
      const testsToday = allTests.filter(test => test.testDate === today)
      const pendingTests = allTests.filter(test => test.status && ['pending_g1', 'pending_g2', 'pending_g3'].includes(test.status))
      
      // Load certificates
      const certificates = await certificatesService.getAll()
      const thisMonth = new Date().getMonth()
      const certificatesThisMonth = certificates.filter(cert => {
        const certDate = new Date(cert.issueDate)
        return certDate.getMonth() === thisMonth
      })
      
      // Count certificates awaiting approval
      const pendingCertificateApprovals = certificates.filter(cert => 
        cert.status === 'awaiting_authentication' || cert.status === 'draft'
      )

      setStats({
        products: products.length,
        testsToday: testsToday.length,
        certificatesThisMonth: certificatesThisMonth.length,
        pendingApprovals: pendingTests.length,
        pendingCertificateApprovals: pendingCertificateApprovals.length
      })
      
      setRecentTests(allTests.slice(0, 3))
      setRecentCertificates(certificates.slice(0, 2))
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // If permission denied, user might be logging out
      if ((error as any).code === 'permission-denied') {
        console.warn('Permission denied loading dashboard data - user may be logging out')
        return
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSeedDatabase = async () => {
    if (!confirm('This will add sample data to your database. Continue?')) return
    
    setSeeding(true)
    try {
      const result = await seedDatabase()
      alert(`Database seeded successfully!
        - ${result.products} products
        - ${result.testData} test data entries
        - ${result.certificates} certificates`)
      
      // Reload dashboard data
      await loadDashboardData()
    } catch (error) {
      console.error('Error seeding database:', error)
      alert('Failed to seed database')
    } finally {
      setSeeding(false)
    }
  }

  // Show machine operator dashboard for L3 users with machine access
  if (userData && userData.role === 'L3' && userData.machineAccess && userData.machineAccess.length > 0) {
    return (
      <ProtectedRoute>
        <MachineOperatorDashboard />
      </ProtectedRoute>
    )
  }

  // Show regular dashboard for other users
  return (
    <ProtectedRoute>
      <div className="p-3 sm:p-6">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Certificate of Analysis Management System</p>
            </div>
            {userData?.role === 'L1' && stats.products === 0 && (
              <Button 
                onClick={handleSeedDatabase} 
                disabled={seeding}
                variant="outline"
                className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
                size="sm"
              >
                {seeding ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Seed Sample Data</span>
                    <span className="sm:hidden">Seed Data</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Products</CardTitle>
              <Package className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold">{loading ? '-' : stats.products}</div>
            <p className="text-xs text-gray-500 mt-1">Active products</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">Tests Today</CardTitle>
              <FlaskConical className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold">{loading ? '-' : stats.testsToday}</div>
            <p className="text-xs text-gray-500 mt-1">{stats.pendingApprovals} pending</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">Certificates Issued</CardTitle>
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold">{loading ? '-' : stats.certificatesThisMonth}</div>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">Pending Test Approvals</CardTitle>
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold">{loading ? '-' : stats.pendingApprovals}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Link href="/certificate-approvals" className="block relative">
          <Button className="w-full h-auto flex-col py-3 sm:py-4 hover:scale-105 transition-transform bg-orange-500 hover:bg-orange-600">
            <AlertCircle className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
            <span className="text-xs sm:text-sm text-center leading-tight">Pending Approvals</span>
          </Button>
          {stats.pendingCertificateApprovals > 0 && (
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded-full min-w-[60px] sm:min-w-[80px] text-center shadow-lg animate-pulse">
              <span className="hidden sm:inline">Need {stats.pendingCertificateApprovals} Approval{stats.pendingCertificateApprovals > 1 ? 's' : ''}</span>
              <span className="sm:hidden">{stats.pendingCertificateApprovals} New</span>
            </div>
          )}
        </Link>
        <Link href="/test-entry" className="block">
          <Button variant="outline" className="w-full h-auto flex-col py-3 sm:py-4 hover:scale-105 transition-transform">
            <FlaskConical className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
            <span className="text-xs sm:text-sm text-center leading-tight">New Test Entry</span>
          </Button>
        </Link>
        <Link href="/batch-selection" className="block">
          <Button variant="outline" className="w-full h-auto flex-col py-3 sm:py-4 hover:scale-105 transition-transform">
            <Package className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
            <span className="text-xs sm:text-sm text-center leading-tight">Batch Selection</span>
          </Button>
        </Link>
        <Link href="/certificates" className="block">
          <Button variant="outline" className="w-full h-auto flex-col py-3 sm:py-4 hover:scale-105 transition-transform">
            <FileText className="h-4 w-4 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
            <span className="text-xs sm:text-sm text-center leading-tight">Generate CoA</span>
          </Button>
        </Link>
      </div>

      {/* Recent Activity Grid - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Tests */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Recent Tests</CardTitle>
              <Link href="/test-entry">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">View All</span>
                  <span className="sm:hidden">All</span>
                  <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {loading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : recentTests.length === 0 ? (
                <p className="text-xs sm:text-sm text-gray-500 text-center py-4">No test data yet</p>
              ) : (
                recentTests.map((test) => (
                  <Link key={test.id} href={`/test-entry?id=${test.id}`} className="block">
                    <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm truncate">{test.batchNo}</p>
                        <p className="text-xs text-gray-500 truncate">{test.productName}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-xs text-gray-500">{test.testDate}</p>
                        <span className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                          test.status === "approved" 
                            ? "bg-green-100 text-green-700" 
                            : test.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {test.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Certificates */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Recent Certificates</CardTitle>
              <Link href="/certificates">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">View All</span>
                  <span className="sm:hidden">All</span>
                  <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {loading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : recentCertificates.length === 0 ? (
                <p className="text-xs sm:text-sm text-gray-500 text-center py-4">No certificates issued yet</p>
              ) : (
                recentCertificates.map((cert) => (
                  <Link key={cert.id} href={`/certificates/view/${cert.id}`} className="block">
                    <div className="p-2 sm:p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{cert.certificateNo}</p>
                          <p className="text-xs text-gray-600 truncate">{cert.customerName}</p>
                          <p className="text-xs text-gray-500 mt-1 truncate">Product: {cert.productName}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-xs text-gray-500">{cert.issueDate}</p>
                          <span className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-green-100 text-green-700">
                            {cert.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </ProtectedRoute>
  )
}
