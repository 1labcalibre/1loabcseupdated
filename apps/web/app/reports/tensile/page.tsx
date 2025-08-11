"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { ArrowLeft, Download, Printer } from "lucide-react"
import { productsService, type Product } from "@/lib/firebase/services/products"

function TensileReportPageContent() {
  const router = useRouter()
  const [reportData, setReportData] = useState<any>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get data from sessionStorage
    const data = sessionStorage.getItem('tensileReportData')
    if (!data) {
      router.push('/batch-selection')
      return
    }
    
    const parsedData = JSON.parse(data)
    setReportData(parsedData)
    
    // Load product details
    loadProduct(parsedData.productId)
  }, [])

  const loadProduct = async (productId: string) => {
    try {
      const productData = await productsService.getById(productId)
      setProduct(productData)
    } catch (error) {
      console.error('Error loading product:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Loading report...</p>
        </div>
      </div>
    )
  }

  if (!reportData || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>No report data found</p>
          <Link href="/batch-selection">
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Batch Selection
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/batch-selection">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Tensile Test Report</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Report Header */}
          <Card>
            <CardHeader>
              <CardTitle>Tensile Test Report</CardTitle>
              <CardDescription>
                Product: {product.name} | Date: {new Date().toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Batches</p>
                  <p className="text-lg font-semibold">{reportData.batches.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Test Data</p>
                  <p className="text-lg font-semibold">{reportData.testData.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Report Generated</p>
                  <p className="text-lg font-semibold">{new Date().toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Statistical Summary</CardTitle>
              <CardDescription>Min, Mean, and Max values for all test parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Min</TableHead>
                    <TableHead>Mean</TableHead>
                    <TableHead>Max</TableHead>
                    <TableHead>Acceptable Range</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.specifications.map((spec) => {
                    const stats = reportData.statistics[spec.property]
                    return (
                      <TableRow key={spec.property}>
                        <TableCell className="font-medium">{spec.property}</TableCell>
                        <TableCell>{spec.unit}</TableCell>
                        <TableCell>{stats?.min || '-'}</TableCell>
                        <TableCell>{stats?.mean || '-'}</TableCell>
                        <TableCell>{stats?.max || '-'}</TableCell>
                        <TableCell>{spec.specification}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Selected Batches */}
          <Card>
            <CardHeader>
              <CardTitle>Selected Batches</CardTitle>
              <CardDescription>Batches included in this report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {reportData.batches.map((batch: string) => (
                  <span 
                    key={batch}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {batch}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function TensileReportPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TensileReportPageContent />
    </Suspense>
  )
} 