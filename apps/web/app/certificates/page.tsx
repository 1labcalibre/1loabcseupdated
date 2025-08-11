"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Eye, Plus, X, FileEdit, Layout, Loader2, Building2 } from "lucide-react"
// Dynamic import for jsPDF to handle SSR issues
// import jsPDF from 'jspdf'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/contexts/auth-context"
import { certificatesService, type Certificate } from "@/lib/firebase/services/certificates"
import { productsService, type Product } from "@/lib/firebase/services/products"
import { savedReportsService, type SavedReport } from "@/lib/firebase/services/saved-reports"
import { testDataService } from "@/lib/firebase/services/test-data"
import { certificateTemplatesService, type CertificateTemplate } from "@/lib/firebase/services/certificate-templates"
import { settingsService } from "@/lib/firebase/services/settings"
import { onSnapshot, collection } from "firebase/firestore"
import { db } from "@/lib/firebase/config"


export default function CertificatesPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [showGenerateModal, setShowGenerateModal] = useState(false)

  const [showFilterSection, setShowFilterSection] = useState(false)
  
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingCertificates, setLoadingCertificates] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [manualTestValues, setManualTestValues] = useState<Record<string, string>>({})
  const [calculatingWeight, setCalculatingWeight] = useState(false)

  const [formData, setFormData] = useState(() => ({
    customerName: "",
    customerAddress: "",
    productId: "",
    invoiceNo: "",
    supplyQuantity: "",
    lotNo: "",
    testReportId: "",
    netWeight: "",
    shelfLife: "12 Months",
    reportDate: new Date().toISOString().split('T')[0] // Default to today's date
  }))

  // Filter state
  const [filters, setFilters] = useState(() => {
    // Set default date range (last month to today)
    const today = new Date()
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    return {
      fromDate: lastMonth.toISOString().split('T')[0],
      toDate: today.toISOString().split('T')[0],
      customerName: "",
      productId: "",
      certificateNo: "",
      status: "all"
    }
  })
  const [filteredCertificates, setFilteredCertificates] = useState<Certificate[]>([])
  
  // Autocomplete suggestions
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([])
  const [certificateNoSuggestions, setCertificateNoSuggestions] = useState<string[]>([])
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [showCertNoSuggestions, setShowCertNoSuggestions] = useState(false)

  // Load certificates and products
  useEffect(() => {
    loadCertificates()
    loadProducts()
    
    // Set up real-time listener for certificates
    const certificatesQuery = collection(db, 'certificates')
    const unsubscribeCertificates = onSnapshot(certificatesQuery, (snapshot) => {
      console.log('Real-time update: Certificates changed in certificates page - documents changed:', snapshot.docChanges().length)
      // Log what changed
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          console.log('Certificate modified:', change.doc.id, 'status:', change.doc.data().status)
        }
      })
      loadCertificatesWithoutSync()
    }, (error) => {
      console.error('Error in certificates listener (certificates page):', error)
      if (error.code === 'permission-denied') {
        console.warn('Permission denied in certificates page listener - user may be logging out')
        return
      }
    })
    
    // Set up periodic sync for email approvals (every 30 seconds)
    const syncInterval = setInterval(async () => {
      try {
        await syncPendingEmailApprovals()
      } catch (error) {
        console.warn('Periodic sync failed:', error)
      }
    }, 30000) // 30 seconds
    
    // Sync when window comes back into focus
    const handleFocus = async () => {
      try {
        await syncPendingEmailApprovals()
      } catch (error) {
        console.warn('Focus sync failed:', error)
      }
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      unsubscribeCertificates()
      clearInterval(syncInterval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Function to sync pending email approvals with Firebase
  const syncPendingEmailApprovals = async () => {
    try {
      // Get pending approvals from the server
      const response = await fetch('/api/sync-email-approvals', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add credentials to avoid Chrome extension interference
        credentials: 'same-origin'
      })
      if (response.ok) {
        const data = await response.json()
        if (data.pendingApprovals && data.pendingApprovals.length > 0) {
          console.log(`Found ${data.pendingApprovals.length} pending email approval(s) on certificates page`)
          
          let syncedCount = 0
          
          // Process each pending approval
          for (const approval of data.pendingApprovals) {
            try {
              // Update the certificate in Firebase using the client-side service
              await certificatesService.update(approval.certificateId, approval.updates)
              
              // Mark as synced on the server
              await fetch('/api/sync-email-approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  certificateId: approval.certificateId,
                  token: approval.token
                })
              })
              
              syncedCount++
              console.log(`Synced certificate ${approval.certificateId} status: ${approval.updates.status} on certificates page`)
            } catch (error) {
              console.error(`Failed to sync certificate ${approval.certificateId}:`, error)
            }
          }
          
          if (syncedCount > 0) {
            console.log(`Successfully synced ${syncedCount} email approval(s) on certificates page`)
            // Reload certificates to show updated status
            await loadCertificatesWithoutSync()
          }
        }
      }
    } catch (error) {
      // Silently handle sync errors to avoid interfering with other functionality
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('chrome-extension')) {
        console.warn('Sync skipped due to browser extension interference:', errorMessage)
      } else {
        console.error('Error syncing pending email approvals on certificates page:', error)
      }
    }
  }

  // Load products and saved reports when modal opens
  useEffect(() => {
    if (showGenerateModal) {
      loadProducts()
      loadSavedReports()
    }
  }, [showGenerateModal])

  // Initialize filtered certificates and suggestions
  useEffect(() => {
    // Apply default date filter when certificates are loaded
    if (certificates.length > 0 && filters.fromDate && filters.toDate) {
      applyFilters()
    } else {
      setFilteredCertificates(certificates)
    }
    
    // Generate unique customer names and certificate numbers for autocomplete
    const uniqueCustomers = [...new Set(certificates.map(cert => cert.customerName))].sort()
    const uniqueCertNos = [...new Set(certificates.map(cert => cert.certificateNo))].sort()
    
    setCustomerSuggestions(uniqueCustomers)
    setCertificateNoSuggestions(uniqueCertNos)
  }, [certificates])

  // Handle click outside to close autocomplete dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('#filter-customer') && !target.closest('.customer-suggestions')) {
        setShowCustomerSuggestions(false)
      }
      if (!target.closest('#filter-certificateNo') && !target.closest('.cert-suggestions')) {
        setShowCertNoSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Load certificates without sync (to avoid infinite loops)
  const loadCertificatesWithoutSync = async () => {
    try {
      setLoadingCertificates(true)
      const certs = await certificatesService.getAll()
      setCertificates(certs)
    } catch (error) {
      console.error('Error loading certificates:', error)
    } finally {
      setLoadingCertificates(false)
    }
  }

  const loadCertificates = async () => {
    try {
      setLoadingCertificates(true)
      
      // First, sync any pending email approvals
      try {
        await syncPendingEmailApprovals()
      } catch (syncError) {
        console.warn('Failed to sync email approvals on certificates page:', syncError)
      }
      
      const certs = await certificatesService.getAll()
      setCertificates(certs)
    } catch (error) {
      console.error('Error loading certificates:', error)
    } finally {
      setLoadingCertificates(false)
    }
  }

  const loadProducts = async () => {
    try {
      const prods = await productsService.getAll()
      setProducts(prods.filter(p => p.active))
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const loadSavedReports = async () => {
    try {
      const reports = await savedReportsService.getAll()
      setSavedReports(reports)
    } catch (error) {
      console.error('Error loading saved reports:', error)
    }
  }

  const calculateNetWeightFromReport = async (reportId: string) => {
    try {
      const selectedReport = savedReports.find(report => report.id === reportId)
      if (!selectedReport || !selectedReport.testDataIds.length) {
        console.warn('No test data found for report:', reportId)
        return ''
      }

      // Get all test data for this report
      const testDataPromises = selectedReport.testDataIds.map(async (testId) => {
        try {
          const testData = await testDataService.getById(testId)
          return testData
        } catch (error) {
          console.warn('Failed to fetch test data:', testId, error)
          return null
        }
      })

      const testDataResults = await Promise.all(testDataPromises)
      const validTestData = testDataResults.filter(data => data !== null)

      if (validTestData.length === 0) {
        console.warn('No valid test data found for report:', reportId)
        return ''
      }

      // Calculate total net weight from all test records
      let totalWeight = 0
      let weightCount = 0

      validTestData.forEach(testData => {
        if (testData.weight && !isNaN(parseFloat(testData.weight))) {
          totalWeight += parseFloat(testData.weight)
          weightCount++
        }
      })

      if (weightCount === 0) {
        console.warn('No weight data found in test records for report:', reportId)
        return ''
      }

      // Return the total weight or average weight based on your business logic
      // For now, I'll return the total weight
      return totalWeight.toString() + ' KGS'

    } catch (error) {
      console.error('Error calculating net weight from report:', error)
      return ''
    }
  }





  const applyFilters = () => {
    let filtered = [...certificates]

    // Filter by date range
    if (filters.fromDate || filters.toDate) {
      filtered = filtered.filter(cert => {
        const certDate = new Date(cert.issueDate)
        if (filters.fromDate) {
          const fromDate = new Date(filters.fromDate)
          if (certDate < fromDate) return false
        }
        if (filters.toDate) {
          const toDate = new Date(filters.toDate)
          if (certDate > toDate) return false
        }
        return true
      })
    }

    // Filter by customer name
    if (filters.customerName) {
      filtered = filtered.filter(cert => 
        cert.customerName.toLowerCase().includes(filters.customerName.toLowerCase())
      )
    }

    // Filter by product
    if (filters.productId && filters.productId !== "all") {
      filtered = filtered.filter(cert => cert.productId === filters.productId)
    }

    // Filter by certificate number
    if (filters.certificateNo) {
      filtered = filtered.filter(cert => 
        cert.certificateNo.toLowerCase().includes(filters.certificateNo.toLowerCase())
      )
    }

    // Filter by status
    if (filters.status !== "all") {
      filtered = filtered.filter(cert => cert.status === filters.status)
    }

    setFilteredCertificates(filtered)
  }

  const clearFilters = () => {
    const today = new Date()
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    setFilters({
      fromDate: lastMonth.toISOString().split('T')[0],
      toDate: today.toISOString().split('T')[0],
      customerName: "",
      productId: "",
      certificateNo: "",
      status: "all"
    })
    setFilteredCertificates(certificates)
    setShowCustomerSuggestions(false)
    setShowCertNoSuggestions(false)
  }

  const handleCustomerNameChange = (value: string) => {
    setFilters({ ...filters, customerName: value })
    
    if (value.length > 0) {
      const filtered = customerSuggestions.filter(name =>
        name.toLowerCase().includes(value.toLowerCase())
      )
      setShowCustomerSuggestions(filtered.length > 0)
    } else {
      setShowCustomerSuggestions(false)
    }
  }

  const handleCertificateNoChange = (value: string) => {
    setFilters({ ...filters, certificateNo: value })
    
    if (value.length > 0) {
      const filtered = certificateNoSuggestions.filter(no =>
        no.toLowerCase().includes(value.toLowerCase())
      )
      setShowCertNoSuggestions(filtered.length > 0)
    } else {
      setShowCertNoSuggestions(false)
    }
  }

  const renderCertificateContent = (cert: Certificate & { template?: CertificateTemplate }) => {
    // Add safety check for cert data
    if (!cert) {
      return <div className="text-center text-red-500">Certificate data is missing</div>
    }

    if (!cert.template) {
      // Default rendering if no template
      return (
        <>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Calibre Specialty Elastomers India Pvt. Ltd.</h2>
            <p className="text-gray-600">Certificate of Analysis</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p><strong>Customer:</strong> {cert.customerName}</p>
              {cert.customerAddress && (
                <p><strong>Address:</strong> {cert.customerAddress}</p>
              )}
              <p><strong>Invoice No:</strong> {cert.invoiceNo}</p>
              <p><strong>Gross Quantity/Weight:</strong> {cert.supplyQuantity}</p>
            </div>
            <div className="text-right">
              <p><strong>Date of Issue:</strong> {cert.issueDate}</p>
              <p><strong>Report No:</strong> {cert.certificateNo}</p>
              <p><strong>LOT No:</strong> {cert.lotNo}</p>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-4 text-center">{cert.productName}</h3>
            <div className="flex justify-between text-sm mb-4">
              <span>Net Weight: {cert.supplyQuantity}</span>
              <span>Shelf Life: 12 Months</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attributes</TableHead>
                  <TableHead>Test Method References</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Obtained Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(cert.testData?.attributes || []).map((attr, index) => (
                  <TableRow key={index}>
                    <TableCell>{attr.name}</TableCell>
                    <TableCell>{attr.method}</TableCell>
                    <TableCell>{attr.unit}</TableCell>
                    <TableCell>{attr.range}</TableCell>
                    <TableCell className="font-bold">{attr.obtainedValue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-gray-600 mt-4">
            <p>Test specimens are cured at (2mm) 165°C for 15 mins and (6mm) 165°C for 20 mins in compression molding.</p>
            <p>This item is Regularly Tested by our Quality Team and meets all the requirements defined by the appropriate current specifications and standards.</p>
            <p>This material is manufactured, Packed, stored and shipped in accordance with good manufacturing practices and standard.</p>
          </div>
        </>
      )
    }

    // Check if template has the new sections structure
    if (!cert.template.sections && cert.template.elements) {
      // Handle old template structure (fallback)
      return (
        <div>
          {cert.template.elements.map((element, index) => {
            const style = element.style as React.CSSProperties

            switch (element.type) {
              case 'text':
              case 'header':
              case 'footer':
                return (
                  <div key={index} style={style}>
                    {element.content
                      .replace('{{customerName}}', cert.customerName)
                      .replace('{{customerAddress}}', cert.customerAddress || '')
                      .replace('{{productName}}', cert.productName)
                      .replace('{{invoiceNo}}', cert.invoiceNo)
                      .replace('{{supplyQuantity}}', cert.supplyQuantity)
                      .replace('{{lotNo}}', cert.lotNo)
                      .replace('{{certificateNo}}', cert.certificateNo)
                      .replace('{{issueDate}}', cert.issueDate)
                      .replace('{{reportNo}}', cert.certificateNo)
                      .replace('{{date}}', cert.issueDate)}
                  </div>
                )
              
              case 'field':
                return (
                  <span key={index} style={style}>
                    {element.content
                      .replace('{{customerName}}', cert.customerName)
                      .replace('{{customerAddress}}', cert.customerAddress || '')
                      .replace('{{productName}}', cert.productName)
                      .replace('{{invoiceNo}}', cert.invoiceNo)
                      .replace('{{supplyQuantity}}', cert.supplyQuantity)
                      .replace('{{lotNo}}', cert.lotNo)
                      .replace('{{certificateNo}}', cert.certificateNo)
                      .replace('{{issueDate}}', cert.issueDate)
                      .replace('{{reportNo}}', cert.certificateNo)
                      .replace('{{date}}', cert.issueDate)}
                  </span>
                )
              
              default:
                return null
            }
          })}
        </div>
      )
    }

    // Render based on new template structure
    const replaceFields = (content: string) => {
      return content
        .replace('{{customerName}}', cert.customerName)
        .replace('{{customerAddress}}', cert.customerAddress || '')
        .replace('{{productName}}', cert.productName)
        .replace('{{invoiceNo}}', cert.invoiceNo)
        .replace('{{supplyQuantity}}', cert.supplyQuantity)
        .replace('{{lotNo}}', cert.lotNo)
        .replace('{{certificateNo}}', cert.certificateNo)
        .replace('{{issueDate}}', cert.issueDate)
        .replace('{{reportNo}}', cert.certificateNo)
        .replace('{{date}}', cert.issueDate)
    }

    // Final fallback if sections is empty or undefined
    if (!cert.template.sections || cert.template.sections.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          <p>This certificate uses a template format that is not supported for viewing.</p>
          <p className="text-sm mt-2">Template ID: {cert.templateId}</p>
        </div>
      )
    }

    return (
      <div>
        {cert.template.sections.map((section, sectionIndex) => (
          <div key={sectionIndex} style={section.layout ? {
            padding: section.layout.padding,
            backgroundColor: section.layout.backgroundColor
          } : {}}>
            {section.elements?.map((element, elementIndex) => {
              const style = element.style as React.CSSProperties

              switch (element.type) {
                case 'text':
                case 'header':
                case 'footer':
                  return (
                    <div key={elementIndex} style={style}>
                      {replaceFields(element.content)}
                    </div>
                  )
                
                case 'field':
                  return (
                    <span key={elementIndex} style={style}>
                      {replaceFields(element.content)}
                    </span>
                  )
                
                case 'table':
                  return (
                    <div key={elementIndex} style={style}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {element.config?.tableConfig?.headers?.map((col: string, i: number) => (
                              <TableHead key={i}>{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(cert.testData?.attributes || []).map((attr, i) => (
                            <TableRow key={i}>
                              <TableCell>{attr.name}</TableCell>
                              <TableCell>{attr.method}</TableCell>
                              <TableCell>{attr.unit}</TableCell>
                              <TableCell>{attr.range}</TableCell>
                              <TableCell className="font-bold">{attr.obtainedValue}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
            
                case 'divider':
                  return <hr key={elementIndex} style={style} className="border-gray-300" />
                
                case 'logo':
                  return (
                    <div key={elementIndex} style={{ textAlign: element.config?.imageConfig?.alignment || 'center', ...style }}>
                      <div className="inline-block border-2 border-dashed border-gray-300 rounded p-8">
                        <Building2 className="h-12 w-12 mx-auto text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">Company Logo</p>
                      </div>
                    </div>
                  )
                
                default:
                  return null
              }
            })}
          </div>
        ))}
      </div>
    )
  }

  const handlePreviewCertificate = async () => {
    if (!formData.productId || !formData.testReportId || !formData.customerName) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setGenerating(true)
      
      // Get selected product and report details
      const selectedProduct = products.find(p => p.id === formData.productId)
      const selectedReport = savedReports.find(r => r.id === formData.testReportId)
      
      if (!selectedProduct || !selectedReport) {
        alert('Invalid product or test report selected')
        return
      }

      // Get test data for the report
      const testDataIds = selectedReport.testDataIds || []
      const testDataPromises = testDataIds.map(id => testDataService.getById(id))
      const testDataArray = await Promise.all(testDataPromises)
      const validTestData = testDataArray.filter(td => td !== null)

      // Calculate statistics from the report
      const statistics = selectedReport.statistics

      // Get manual test specifications for this product
      const manualTestSpecs = selectedProduct.specifications?.filter(spec => 
        ['Dielectric Strength', 'Volume Resistivity', 'Tracking Resistance', 'Flammability', 'Polymer Content'].includes(spec.property)
      ) || []

      // Prepare certificate data for preview
      const certificatePreviewData = {
        productName: selectedProduct.name,
        batchNo: validTestData.length > 0 ? validTestData[0]?.batchNo || '' : '',
        customerName: formData.customerName,
        customerAddress: formData.customerAddress,
        invoiceNo: formData.invoiceNo,
        supplyQuantity: formData.supplyQuantity,
        lotNo: formData.lotNo,
        netWeight: formData.netWeight,
        shelfLife: formData.shelfLife,
        testData: {
          attributes: selectedProduct.specifications?.filter(spec => 
            !['Dielectric Strength', 'Volume Resistivity', 'Tracking Resistance', 'Flammability', 'Polymer Content'].includes(spec.property)
          ).map(spec => ({
            name: spec.property,
            method: spec.standard,
            unit: spec.unit,
            range: spec.specification,
            obtainedValue: statistics[spec.property]?.mean?.toString() || spec.typicalValue
          })) || []
        },
        manualTestSpecs,
        selectedProduct,
        selectedReport,
        validTestData,
        statistics,
        issueDate: new Date().toISOString().split('T')[0]
      }

      // Initialize manual test values with typical values
      const initialManualValues: Record<string, string> = {}
      manualTestSpecs.forEach(spec => {
        initialManualValues[spec.property] = spec.typicalValue?.toString() || ''
      })
      setManualTestValues(initialManualValues)

      setPreviewData(certificatePreviewData)
      setShowPreviewModal(true)
      setShowGenerateModal(false)
      
    } catch (error) {
      console.error('Error preparing certificate preview:', error)
      alert('Failed to prepare certificate preview. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Range validation function
  const validateManualTestValue = (value: string, specification: string): boolean => {
    if (!value || !specification) return false
    
    const numValue = parseFloat(value)
    if (isNaN(numValue)) {
      // Handle string specifications like "V-0"
      return value.trim().toLowerCase() === specification.toLowerCase()
    }
    
    // Handle numeric specifications
    if (specification.includes('≥') || specification.includes('>=')) {
      const minValue = parseFloat(specification.replace(/[≥>=]/g, '').trim())
      return numValue >= minValue
    }
    
    if (specification.includes('≤') || specification.includes('<=')) {
      const maxValue = parseFloat(specification.replace(/[≤<=]/g, '').trim())
      return numValue <= maxValue
    }
    
    if (specification.includes('>')) {
      const minValue = parseFloat(specification.replace('>', '').trim())
      return numValue > minValue
    }
    
    if (specification.includes('<')) {
      const maxValue = parseFloat(specification.replace('<', '').trim())
      return numValue < maxValue
    }
    
    if (specification.includes('±')) {
      const [base, tolerance] = specification.split('±').map(s => parseFloat(s.trim()))
      const baseVal = base || 0
      const toleranceVal = tolerance || 0
      return numValue >= (baseVal - toleranceVal) && numValue <= (baseVal + toleranceVal)
    }
    
    if (specification.includes('-')) {
      const [min, max] = specification.split('-').map(s => parseFloat(s.trim()))
      const minVal = min || 0
      const maxVal = max || 0
      return numValue >= minVal && numValue <= maxVal
    }
    
    // Exact match
    return numValue === parseFloat(specification)
  }

  const handleGenerateCertificate = async () => {
    if (!previewData) return
    
    try {
      setGenerating(true)
      
      // Validate manual test values
      const manualTestData = previewData.manualTestSpecs.map((spec: any) => {
        const obtainedValue = manualTestValues[spec.property] || ''
        const isWithinRange = validateManualTestValue(obtainedValue, spec.specification)
        
        return {
          name: spec.property,
          method: spec.standard,
          unit: spec.unit,
          specification: spec.specification,
          obtainedValue,
          isWithinRange
        }
      })

      // Check if any manual test is out of range
      const hasOutOfRangeValues = manualTestData.some((test: any) => !test.isWithinRange)
      
      // Prepare certificate data
      const certificateData: Omit<Certificate, 'id'> = {
        certificateNo: '', // Will be generated by service
        productId: formData.productId,
        productName: previewData.selectedProduct.name,
        batchNo: previewData.batchNo,
        customerName: previewData.customerName,
        customerAddress: previewData.customerAddress,
        invoiceNo: previewData.invoiceNo,
        supplyQuantity: previewData.supplyQuantity,
        lotNo: previewData.lotNo,
        testData: previewData.testData,
        manualTestData,
        netWeight: previewData.netWeight,
        shelfLife: previewData.shelfLife,
        issueDate: previewData.issueDate,
        status: hasOutOfRangeValues ? 'draft' : 'awaiting_authentication',
        templateId: 'default'
      }

      // Create certificate
      const result = await certificatesService.create(certificateData, user?.uid || '')
      
      // Send approval email if certificate is awaiting authentication
      if (certificateData.status === 'awaiting_authentication') {
        try {
          // Get email settings from client-side Firebase
          const settings = await settingsService.getSettings()
          const emailSettings = settings.emailSettings
          
          if (emailSettings.enableEmailApprovals && emailSettings.certificateApprovalEmail) {
            
            // Prepare complete certificate data for email (same structure as certificateViewData)
            const certificateForEmail = {
              id: result.id,
              certificateNumber: result.certificateNo,
              certificateNo: result.certificateNo,
              productName: previewData.productName,
              batchNo: previewData.batchNo,
              customerName: previewData.customerName,
              customerAddress: previewData.customerAddress,
              invoiceNo: previewData.invoiceNo,
              supplyQuantity: previewData.supplyQuantity,
              lotNo: previewData.lotNo,
              netWeight: previewData.netWeight,
              shelfLife: previewData.shelfLife,
              status: certificateData.status,
              testData: previewData.testData,
              manualTestData: manualTestData,
              issueDate: previewData.issueDate
            }
            
            const emailResponse = await fetch('/api/send-approval-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                certificateData: certificateForEmail,
                emailSettings: emailSettings
              })
            })
            
            if (emailResponse.ok) {
              const emailResult = await emailResponse.json()
              console.log('Approval email sent successfully:', emailResult)
            } else {
              const emailError = await emailResponse.json()
              console.warn('Failed to send approval email:', emailError.error)
              // Don't block certificate creation if email fails
            }
          } else {
            console.log('Email approvals not enabled or no approval email configured')
          }
        } catch (emailError) {
          console.warn('Error sending approval email:', emailError)
          // Don't block certificate creation if email fails
        }
      }
      
      // Reload certificates
      await loadCertificates()
      
      // Prepare certificate data for HTML view
      const certificateViewData = {
        certificateNo: result.certificateNo,
        productName: previewData.productName,
        batchNo: previewData.batchNo,
        customerName: previewData.customerName,
        customerAddress: previewData.customerAddress,
        invoiceNo: previewData.invoiceNo,
        supplyQuantity: previewData.supplyQuantity,
        lotNo: previewData.lotNo,
        netWeight: previewData.netWeight,
        shelfLife: previewData.shelfLife,
        status: hasOutOfRangeValues ? 'draft' : 'awaiting_authentication',
        testData: previewData.testData,
        manualTestData,
        issueDate: previewData.issueDate
      }

      // Store certificate data in sessionStorage and redirect
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('certificateViewData', JSON.stringify(certificateViewData))
      }
      router.push('/certificate-view')
      
      setShowPreviewModal(false)
      
      // Reset form
      setFormData({
        customerName: "",
        customerAddress: "",
        productId: "",
        invoiceNo: "",
        supplyQuantity: "",
        lotNo: "",
        testReportId: "",
        netWeight: "",
        shelfLife: "12 Months",
        reportDate: new Date().toISOString().split('T')[0]
      })
      setManualTestValues({})
      setPreviewData(null)
      
    } catch (error) {
      console.error('Error generating certificate:', error)
      alert('Failed to generate certificate. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleView = async (cert: Certificate) => {
    // Prepare certificate data for HTML view
    const certificateViewData = {
      certificateNo: cert.certificateNo,
      productName: cert.productName,
      batchNo: cert.batchNo,
      customerName: cert.customerName,
      customerAddress: cert.customerAddress,
      invoiceNo: cert.invoiceNo,
      supplyQuantity: cert.supplyQuantity,
      lotNo: cert.lotNo,
      netWeight: cert.netWeight || '',
      shelfLife: cert.shelfLife || '12 Months',
      status: cert.status === 'approved' ? 'approved' : (cert.status === 'awaiting_authentication' ? 'awaiting_authentication' : 'draft'),
      testData: cert.testData,
      manualTestData: cert.manualTestData || [],
      issueDate: cert.issueDate
    }

    // Store certificate data in sessionStorage and redirect
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('certificateViewData', JSON.stringify(certificateViewData))
    }
    router.push('/certificate-view')
  }





  return (
    <ProtectedRoute page="certificates" pagePermission="canView">
      <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
      {/* Header - Mobile Optimized */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Link href="/">
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">Certificates of Analysis</h1>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button onClick={() => setShowGenerateModal(true)} className="hidden sm:flex text-sm">
                <Plus className="mr-2 h-4 w-4" />
                Generate Certificate
              </Button>
              <Button onClick={() => setShowGenerateModal(true)} size="sm" className="sm:hidden">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile Optimized */}
      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Filter Section - Mobile Optimized */}
        <Card className={showFilterSection ? '' : 'hidden'}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Filter Certificates</CardTitle>
            <CardDescription className="text-sm">Search and filter certificates by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-fromDate" className="text-sm">From Date</Label>
                <Input
                  id="filter-fromDate"
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters({...filters, fromDate: e.target.value})}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-toDate" className="text-sm">To Date</Label>
                <Input
                  id="filter-toDate"
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters({...filters, toDate: e.target.value})}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2 relative">
                <Label htmlFor="filter-customer" className="text-sm">Customer Name</Label>
                <Input
                  id="filter-customer"
                  placeholder="Search by customer..."
                  value={filters.customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  autoComplete="off"
                  className="text-sm"
                />
                {showCustomerSuggestions && (
                  <div className="absolute top-full mt-1 w-full bg-white border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto customer-suggestions">
                    {customerSuggestions
                      .filter(name => name.toLowerCase().includes(filters.customerName.toLowerCase()))
                      .map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => {
                            setFilters({ ...filters, customerName: suggestion })
                            setShowCustomerSuggestions(false)
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="space-y-2 relative">
                <Label htmlFor="filter-certificateNo">Certificate No</Label>
                <Input
                  id="filter-certificateNo"
                  placeholder="Search by certificate no..."
                  value={filters.certificateNo}
                  onChange={(e) => handleCertificateNoChange(e.target.value)}
                  autoComplete="off"
                />
                {showCertNoSuggestions && (
                  <div className="absolute top-full mt-1 w-full bg-white border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto cert-suggestions">
                    {certificateNoSuggestions
                      .filter(no => no.toLowerCase().includes(filters.certificateNo.toLowerCase()))
                      .map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => {
                            setFilters({ ...filters, certificateNo: suggestion })
                            setShowCertNoSuggestions(false)
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-product">Product</Label>
                <Select
                  value={filters.productId}
                  onValueChange={(value) => setFilters({...filters, productId: value})}
                >
                  <SelectTrigger id="filter-product">
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                                      <SelectContent>
                      <SelectItem value="all">All products</SelectItem>
                      {products
                        .filter(product => product.id && product.id.trim() !== '')
                        .map(product => (
                          <SelectItem key={product.id} value={product.id!}>
                            {product.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-status">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({...filters, status: value})}
                >
                  <SelectTrigger id="filter-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="awaiting_authentication">Awaiting Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 lg:col-span-2">
                <Button onClick={applyFilters} className="flex-1">
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={clearFilters}>
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg">Recent Certificates</CardTitle>
                <CardDescription className="text-sm">View and download generated certificates</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilterSection(!showFilterSection)}
                className="text-xs sm:text-sm w-full sm:w-auto"
              >
                {showFilterSection ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Report No</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Customer</TableHead>
                    <TableHead className="text-xs sm:text-sm">Product</TableHead>
                    <TableHead className="hidden md:table-cell text-xs sm:text-sm">Invoice No</TableHead>
                    <TableHead className="hidden lg:table-cell text-xs sm:text-sm">Date</TableHead>
                    <TableHead className="text-xs sm:text-sm">Status</TableHead>
                    <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCertificates ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        <p className="text-gray-500 mt-2">Loading certificates...</p>
                      </TableCell>
                    </TableRow>
                  ) : certificates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No certificates found. Click "Generate Certificate" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCertificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium text-xs sm:text-sm max-w-[120px] truncate">{cert.certificateNo}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm max-w-[150px] truncate">{cert.customerName}</TableCell>
                        <TableCell className="text-xs sm:text-sm max-w-[120px] truncate">{cert.productName}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs sm:text-sm">{cert.invoiceNo}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs sm:text-sm">{cert.issueDate}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap ${
                            cert.status === "approved" 
                              ? "bg-green-100 text-green-700" 
                              : cert.status === "issued"
                              ? "bg-green-100 text-green-700"
                              : cert.status === "awaiting_authentication"
                              ? "bg-orange-100 text-orange-700"
                              : cert.status === "draft"
                              ? "bg-gray-100 text-gray-700"
                              : cert.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            <span className="hidden sm:inline">
                              {cert.status === 'awaiting_authentication' ? 'Awaiting Approval' : 
                               cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                            </span>
                            <span className="sm:hidden">
                              {cert.status === 'awaiting_authentication' ? 'Pending' : 
                               cert.status === 'approved' ? 'OK' :
                               cert.status === 'rejected' ? 'X' :
                               cert.status.charAt(0).toUpperCase()}
                            </span>
                          </span>
                          {cert.status === 'rejected' && cert.rejectionReason && (
                            <div className="text-xs text-red-600 mt-1 truncate max-w-32" title={cert.rejectionReason}>
                              Reason: {cert.rejectionReason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 sm:gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleView(cert)}
                              className="h-6 w-6 sm:h-8 sm:w-8"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
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
      </main>

      {/* Generate Certificate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generate Certificate of Analysis</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowGenerateModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer Name *</Label>
                  <Input
                    id="customer"
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerAddress">Customer Address</Label>
                  <Input
                    id="customerAddress"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                    placeholder="Enter customer address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product">Product *</Label>
                  <Select 
                    value={formData.productId}
                    onValueChange={(value) => setFormData({...formData, productId: value, testReportId: ""})}
                  >
                    <SelectTrigger id="product">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products
                        .filter(product => product.id && product.id.trim() !== '')
                        .map(product => (
                          <SelectItem key={product.id} value={product.id!}>
                            {product.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="testReport">Test Report *</Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="reportDate" className="text-xs text-gray-600">Date:</Label>
                      <Input
                        id="reportDate"
                        type="date"
                        value={formData.reportDate}
                        onChange={(e) => setFormData({...formData, reportDate: e.target.value, testReportId: ""})}
                        className="w-32 h-7 text-xs"
                        disabled={!formData.productId}
                      />
                    </div>
                  </div>
                  <Select
                    value={formData.testReportId}
                    onValueChange={async (value) => {
                      // Update the test report ID
                      setFormData(prev => ({...prev, testReportId: value}))
                      
                      // Calculate and update net weight
                      if (value && value !== 'no-reports') {
                        setCalculatingWeight(true)
                        try {
                          const calculatedWeight = await calculateNetWeightFromReport(value)
                          setFormData(prev => ({...prev, netWeight: calculatedWeight}))
                        } catch (error) {
                          console.error('Error calculating weight:', error)
                          setFormData(prev => ({...prev, netWeight: ''}))
                        } finally {
                          setCalculatingWeight(false)
                        }
                      } else {
                        setFormData(prev => ({...prev, netWeight: ''}))
                      }
                    }}
                    disabled={!formData.productId}
                  >
                    <SelectTrigger id="testReport">
                      <SelectValue placeholder={formData.productId ? "Select test report" : "Select product first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const filteredReports = savedReports.filter(report => {
                          // First filter by product
                          if (report.productId !== formData.productId || !report.id || report.id.trim() === '') {
                            return false;
                          }
                          
                          // Then filter by date if reportDate is selected
                          if (formData.reportDate && report.createdAt) {
                            try {
                              let createdDate;
                              
                              // Handle Firebase Timestamp
                              if (report.createdAt && typeof report.createdAt.toDate === 'function') {
                                createdDate = report.createdAt.toDate();
                              } 
                              // Handle regular Date object or date string
                              else {
                                createdDate = new Date(report.createdAt);
                              }
                              
                              // Check if the date is valid
                              if (isNaN(createdDate.getTime())) {
                                console.warn('Invalid date in report:', report.id, report.createdAt);
                                return false;
                              }
                              
                              const reportDate = createdDate.toISOString().split('T')[0];
                              console.log('Filtering report:', report.name, 'Report date:', reportDate, 'Selected date:', formData.reportDate);
                              return reportDate === formData.reportDate;
                            } catch (error) {
                              console.warn('Error processing date in report:', report.id, report.createdAt, error);
                              return false;
                            }
                          }
                          
                          // If no date filter is selected, show all reports for the product
                          return true;
                        });

                        console.log('Total saved reports:', savedReports.length);
                        console.log('Reports for product:', formData.productId, savedReports.filter(r => r.productId === formData.productId).length);
                        console.log('Filtered reports for date:', formData.reportDate, filteredReports.length);

                        if (filteredReports.length === 0 && formData.reportDate) {
                          return (
                            <SelectItem value="no-reports" disabled>
                              No reports found for {formData.reportDate}
                            </SelectItem>
                          );
                        }

                        if (filteredReports.length === 0) {
                          return (
                            <SelectItem value="no-reports" disabled>
                              No reports available for this product
                            </SelectItem>
                          );
                        }

                        return filteredReports.map(report => (
                          <SelectItem key={report.id} value={report.id!}>
                            {report.name} ({report.recordsCount} records)
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceNo">Invoice No</Label>
                  <Input
                    id="invoiceNo"
                    value={formData.invoiceNo}
                    onChange={(e) => setFormData({...formData, invoiceNo: e.target.value})}
                    placeholder="CSE/25-26/XXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplyQty">Gross Quantity/Weight</Label>
                  <Input
                    id="supplyQty"
                    value={formData.supplyQuantity}
                    onChange={(e) => setFormData({...formData, supplyQuantity: e.target.value})}
                    placeholder="7200 KGS"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lotNo">LOT No</Label>
                  <Input
                    id="lotNo"
                    value={formData.lotNo}
                    onChange={(e) => setFormData({...formData, lotNo: e.target.value})}
                    placeholder="TD250C2516041H"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="netWeight">Net Weight</Label>
                    {calculatingWeight && (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Calculating...</span>
                      </div>
                    )}
                  </div>
                  <Input
                    id="netWeight"
                    value={formData.netWeight}
                    onChange={(e) => setFormData({...formData, netWeight: e.target.value})}
                    placeholder="7200 KGS"
                    disabled={calculatingWeight}
                  />
                </div>

              </div>
              <div className="flex justify-end gap-4 mt-6">
                <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePreviewCertificate} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing Preview...
                    </>
                  ) : (
                    'Preview Certificate'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}






      {/* Certificate Preview Modal with Manual Test Entry - Mobile Optimized */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Certificate Preview & Manual Test Entry</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowPreviewModal(false)
                    setPreviewData(null)
                    setManualTestValues({})
                  }}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Certificate Preview Section - Mobile Optimized */}
              <div className="border rounded-lg p-3 sm:p-4 bg-gray-50">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Certificate Preview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div><strong>Product:</strong> {previewData.productName}</div>
                  <div><strong>Customer:</strong> {previewData.customerName}</div>
                  <div><strong>Batch No:</strong> {previewData.batchNo}</div>
                  <div><strong>Invoice No:</strong> {previewData.invoiceNo}</div>
                  <div><strong>LOT No:</strong> {previewData.lotNo}</div>
                  <div><strong>Net Weight:</strong> {previewData.netWeight}</div>
                  <div><strong>Gross Quantity/Weight:</strong> {previewData.supplyQuantity}</div>
                  <div><strong>Issue Date:</strong> {previewData.issueDate}</div>
                </div>
              </div>

              {/* Manual Test Entry Section - Mobile Optimized */}
              <div className="border rounded-lg p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Manual Test Results Entry</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  Please enter the manual test values. Values will be validated against product specifications.
                </p>
                
                <div className="space-y-3 sm:space-y-4">
                  {previewData.manualTestSpecs.map((spec: any, index: number) => {
                    const currentValue = manualTestValues[spec.property] || ''
                    const isValid = currentValue ? validateManualTestValue(currentValue, spec.specification) : true
                    
                    return (
                      <div key={index} className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 items-start lg:items-center p-3 border rounded">
                        <div>
                          <Label className="text-sm font-medium">{spec.property}</Label>
                          <div className="text-xs text-gray-500">{spec.standard}</div>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">Unit: {spec.unit}</div>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">Range: {spec.specification}</div>
                        </div>
                        <div>
                          <Input
                            value={currentValue}
                            onChange={(e) => setManualTestValues(prev => ({
                              ...prev,
                              [spec.property]: e.target.value
                            }))}
                            placeholder="Enter value"
                            className={`${!isValid && currentValue ? 'border-red-500 bg-red-50' : ''}`}
                          />
                        </div>
                        <div className="text-sm">
                          {currentValue && (
                            <span className={`px-2 py-1 rounded text-xs ${
                              isValid 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {isValid ? '✓ Valid' : '✗ Out of Range'}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Summary */}
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <div className="text-sm">
                    <strong>Status:</strong> {
                      previewData.manualTestSpecs.every((spec: any) => {
                        const value = manualTestValues[spec.property]
                        return value && validateManualTestValue(value, spec.specification)
                      }) 
                        ? '✓ All values within range - Certificate will be sent for admin approval'
                        : '⚠ Some values are out of range or missing - Certificate will be saved as draft'
                    }
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPreviewModal(false)
                    setShowGenerateModal(true)
                  }}
                >
                  Back to Form
                </Button>
                <Button 
                  onClick={handleGenerateCertificate} 
                  disabled={generating || previewData.manualTestSpecs.some((spec: any) => !manualTestValues[spec.property])}
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Certificate'
                  )}
                </Button>
              </div>
            </CardContent>
        </Card>
      </div>
      )}

      </div>
    </ProtectedRoute>
  )
} 

