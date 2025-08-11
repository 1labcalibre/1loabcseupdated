"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { ArrowLeft, Eye, CheckCircle, XCircle, Clock, Loader2, FileText, User, Package, Calendar, Hash, MapPin, Edit, Save, X, Filter, Mail } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { certificatesService, type Certificate } from "@/lib/firebase/services/certificates"
import { settingsService } from "@/lib/firebase/services/settings"
import { onSnapshot, collection } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

export default function CertificateApprovalsPage() {
  const { userData } = useAuth()
  const [loading, setLoading] = useState(true)
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [filteredCertificates, setFilteredCertificates] = useState<Certificate[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Certificate>>({})
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewCertificate, setReviewCertificate] = useState<Certificate | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null)
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)

  useEffect(() => {
    loadAllCertificates()
    
    // Set up real-time listener for certificates
    const certificatesQuery = collection(db, 'certificates')
    const unsubscribeCertificates = onSnapshot(certificatesQuery, (snapshot) => {
      console.log('Real-time update: Certificates changed in approvals page')
      loadAllCertificates()
    }, (error) => {
      console.error('Error in certificates listener (approvals):', error)
      if (error.code === 'permission-denied') {
        console.warn('Permission denied in certificate approvals listener - user may be logging out')
        return
      }
    })
    
    return () => {
      unsubscribeCertificates()
    }
  }, [])

  useEffect(() => {
    filterCertificates()
  }, [certificates, statusFilter, searchTerm])

  // Function to sync pending email approvals with Firebase
  const syncPendingEmailApprovals = async () => {
    try {
      // Get pending approvals from the server
      const response = await fetch('/api/sync-email-approvals')
      if (response.ok) {
        const data = await response.json()
        if (data.pendingApprovals && data.pendingApprovals.length > 0) {
          console.log(`Found ${data.pendingApprovals.length} pending email approval(s)`)
          
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
              console.log(`Synced certificate ${approval.certificateId} status: ${approval.updates.status}`)
            } catch (error) {
              console.error(`Failed to sync certificate ${approval.certificateId}:`, error)
            }
          }
          
          if (syncedCount > 0) {
            console.log(`Successfully synced ${syncedCount} email approval(s)`)
          }
        }
      }
    } catch (error) {
      console.error('Error syncing pending email approvals:', error)
    }
  }

  const loadAllCertificates = async () => {
    try {
      setLoading(true)
      
      // First, sync any pending email approvals
      try {
        await syncPendingEmailApprovals()
      } catch (syncError) {
        console.warn('Failed to sync email approvals:', syncError)
      }
      
      const allCerts = await certificatesService.getAll()
      // Sort by creation date, newest first
      const sortedCerts = allCerts.sort((a, b) => {
        const dateA = new Date(a.issueDate).getTime()
        const dateB = new Date(b.issueDate).getTime()
        return dateB - dateA
      })
      setCertificates(sortedCerts)
    } catch (error) {
      console.error('Error loading certificates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCertificates = () => {
    let filtered = certificates

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(cert => cert.status === statusFilter)
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(cert => 
        cert.certificateNo.toLowerCase().includes(search) ||
        cert.customerName.toLowerCase().includes(search) ||
        cert.productName.toLowerCase().includes(search) ||
        cert.batchNo.toLowerCase().includes(search)
      )
    }

    setFilteredCertificates(filtered)
  }

  const handleApproveCertificate = async (certificateId: string) => {
    if (!userData?.uid) return
    
    try {
      setProcessingId(certificateId)
      await certificatesService.approve(certificateId, userData.uid)
      await loadAllCertificates() // Reload the list
      alert('Certificate approved successfully!')
    } catch (error) {
      console.error('Error approving certificate:', error)
      alert('Failed to approve certificate. Please try again.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectCertificate = async (certificateId: string) => {
    if (!userData?.uid) return
    
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return // User cancelled
    
    try {
      setProcessingId(certificateId)
      await certificatesService.update(certificateId, { 
        status: 'rejected',
        rejectionReason: reason,
        rejectedBy: userData.uid,
        rejectedAt: new Date().toISOString()
      })
      await loadAllCertificates() // Reload the list
      alert('Certificate rejected.')
    } catch (error) {
      console.error('Error rejecting certificate:', error)
      alert('Failed to reject certificate. Please try again.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleSendApprovalEmail = async (certificateId: string) => {
    try {
      setSendingEmailId(certificateId)
      
      // Get the certificate data
      const certificate = certificates.find(cert => cert.id === certificateId)
      if (!certificate) {
        alert('Certificate not found')
        return
      }
      
      // Get email settings from client-side Firebase
      const settings = await settingsService.getSettings()
      const emailSettings = settings.emailSettings
      
      if (!emailSettings.enableEmailApprovals || !emailSettings.certificateApprovalEmail) {
        alert('Email approvals not enabled or no approval email configured. Please check settings.')
        return
      }
      
      // Get complete certificate data from Firebase for email preview
      let certificateForEmail
      try {
        const fullCertificate = await certificatesService.getById(certificateId)
        if (fullCertificate) {
          // Try to construct complete data or use what we have
          certificateForEmail = {
            id: certificate.id,
            certificateNumber: certificate.certificateNo,
            certificateNo: certificate.certificateNo,
            productName: certificate.productName,
            batchNo: certificate.batchNo,
            customerName: certificate.customerName,
            customerAddress: certificate.customerAddress || '',
            invoiceNo: certificate.invoiceNo || '',
            supplyQuantity: '',
            lotNo: '',
            netWeight: certificate.netWeight || '',
            shelfLife: certificate.shelfLife || '',
            issueDate: certificate.issueDate,
            status: certificate.status,
            // Use empty test data for manual emails - they can still approve/reject
            testData: { attributes: [] },
            manualTestData: []
          }
        } else {
          throw new Error('Certificate not found')
        }
      } catch (error) {
        console.error('Error fetching complete certificate data:', error)
        alert('Failed to fetch complete certificate data. Please try again.')
        return
      }
      
      const response = await fetch('/api/send-approval-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificateData: certificateForEmail,
          emailSettings: emailSettings
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Approval email sent successfully to ${result.approvalEmail}!`)
        await loadAllCertificates() // Reload to show email sent status
      } else {
        const error = await response.json()
        alert(`Failed to send approval email: ${error.error}`)
      }
    } catch (error) {
      console.error('Error sending approval email:', error)
      alert('Failed to send approval email. Please check your email configuration.')
    } finally {
      setSendingEmailId(null)
    }
  }

  const handleEditStart = (cert: Certificate) => {
    setEditingCertificate(cert)
    setEditForm({
      customerName: cert.customerName || '',
      customerAddress: cert.customerAddress || '',
      invoiceNo: cert.invoiceNo || '',
      supplyQuantity: cert.supplyQuantity || '',
      lotNo: cert.lotNo || '',
      netWeight: cert.netWeight || '',
      shelfLife: cert.shelfLife || '12 Months',
      manualTestData: cert.manualTestData || [],
      testData: cert.testData || { attributes: [] }
    })
    setShowEditModal(true)
  }

  const handleEditCancel = () => {
    setEditForm({})
    setShowEditModal(false)
    setEditingCertificate(null)
  }

  const handleEditSave = async () => {
    if (!userData?.uid || !editingCertificate?.id) return
    
    try {
      setProcessingId(editingCertificate.id)
      await certificatesService.update(editingCertificate.id, {
        ...editForm,
        updatedBy: userData.uid,
        updatedAt: new Date().toISOString()
      })
      await loadAllCertificates() // Reload the list
      setEditForm({})
      setShowEditModal(false)
      setEditingCertificate(null)
      alert('Certificate updated successfully!')
    } catch (error) {
      console.error('Error updating certificate:', error)
      alert('Failed to update certificate. Please try again.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleManualTestUpdate = (index: number, field: string, value: string) => {
    const updatedTests = [...(editForm.manualTestData || [])]
    if (updatedTests[index]) {
      updatedTests[index] = { ...updatedTests[index], [field]: value }
      // Recalculate isWithinRange if obtainedValue changed
      if (field === 'obtainedValue') {
        updatedTests[index].isWithinRange = validateManualTestValue(value, updatedTests[index].specification)
      }
      setEditForm({ ...editForm, manualTestData: updatedTests })
    }
  }

  const handleAutomatedTestUpdate = (index: number, field: string, value: string) => {
    const updatedTestData = { ...editForm.testData }
    const updatedAttributes = [...(updatedTestData.attributes || [])]
    if (updatedAttributes[index]) {
      updatedAttributes[index] = { ...updatedAttributes[index], [field]: value }
      updatedTestData.attributes = updatedAttributes || []
      setEditForm({ ...editForm, testData: { ...updatedTestData, attributes: updatedAttributes } })
    }
  }

  const validateManualTestValue = (value: string, specification: string): boolean => {
    if (!value || !specification) return false
    const numValue = parseFloat(value)
    if (isNaN(numValue)) {
      return value.trim().toLowerCase() === specification.toLowerCase()
    }
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
    return numValue === parseFloat(specification)
  }

  const handleReviewCertificate = (cert: Certificate) => {
    setReviewCertificate(cert)
    setShowReviewModal(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return { className: 'bg-gray-100 text-gray-700', icon: Clock, text: 'Draft' }
      case 'awaiting_authentication':
        return { className: 'bg-orange-100 text-orange-700', icon: Clock, text: 'Awaiting Approval' }
      case 'approved':
        return { className: 'bg-green-100 text-green-700', icon: CheckCircle, text: 'Approved' }
      case 'rejected':
        return { className: 'bg-red-100 text-red-700', icon: XCircle, text: 'Rejected' }
      default:
        return { className: 'bg-gray-100 text-gray-700', icon: Clock, text: status }
    }
  }

  return (
    <ProtectedRoute page="certificates" pagePermission="canApprove">
      <div className="min-h-screen bg-gray-50">
        {/* Header - Mobile Optimized */}
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">Certificate Approvals</h1>
                <p className="text-xs sm:text-sm text-gray-600">Review and approve pending certificates</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Mobile Optimized */}
        <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <div className="space-y-6">
            {/* Stats and Filters Card - Mobile Optimized */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Stats - Mobile Optimized */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Total Certificates - Mobile Optimized */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold">{certificates.length}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">Certificates</p>
                      </div>
                    </div>

                    {/* Approved - Mobile Optimized */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold">{certificates.filter(cert => cert.status === 'approved').length}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">Approved</p>
                      </div>
                    </div>

                    {/* Draft - Mobile Optimized */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg flex-shrink-0">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold">{certificates.filter(cert => cert.status === 'draft').length}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">Draft</p>
                      </div>
                    </div>

                    {/* Rejected - Mobile Optimized */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg flex-shrink-0">
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold">{certificates.filter(cert => cert.status === 'rejected').length}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">Rejected</p>
                      </div>
                    </div>
                  </div>

                  {/* Filters - Mobile Optimized */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Label htmlFor="status-filter" className="text-sm">Filter by Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="search" className="text-sm">Search Certificates</Label>
                        <Input
                          id="search"
                          placeholder="Search by certificate no, customer, product..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certificates List - Mobile Optimized */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">All Certificates</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Review, edit, approve or reject certificates. Use filters above to narrow down the list.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-4">Loading certificates...</p>
                  </div>
                ) : filteredCertificates.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates found</h3>
                    <p className="text-gray-500">
                      {certificates.length === 0 
                        ? "No certificates have been generated yet." 
                        : "No certificates match your current filters."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredCertificates.map((cert) => {
                      const statusBadge = getStatusBadge(cert.status)
                      const StatusIcon = statusBadge.icon
                      
                      return (
                      <div key={cert.id} className="border rounded-lg p-3 sm:p-6 bg-white hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                          <div className="flex-1 space-y-3 sm:space-y-4 min-w-0 w-full">
                            {/* Certificate Header - Mobile Optimized */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${statusBadge.className} flex-shrink-0`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  <span className="hidden sm:inline">{statusBadge.text}</span>
                                  <span className="sm:hidden">{statusBadge.text.charAt(0)}</span>
                                </span>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{cert.certificateNo}</h3>
                              </div>
                              {cert.status === 'rejected' && cert.rejectionReason && (
                                <div className="text-xs sm:text-sm text-red-600 bg-red-50 px-2 py-1 rounded max-w-full truncate">
                                  <span className="hidden sm:inline">Reason: </span>{cert.rejectionReason}
                                </div>
                              )}
                            </div>

                            {/* Certificate Details Grid - Mobile Optimized */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-gray-500">Customer</p>
                                    <p className="text-sm sm:text-base font-medium truncate">{cert.customerName}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Package className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-gray-500">Product</p>
                                    <p className="text-sm sm:text-base font-medium truncate">{cert.productName}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-gray-500">Batch No</p>
                                    <p className="text-sm sm:text-base font-medium truncate">{cert.batchNo}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-gray-500">Invoice No</p>
                                    <p className="text-sm sm:text-base font-medium truncate">{cert.invoiceNo}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Package className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-gray-500">LOT No</p>
                                    <p className="text-sm sm:text-base font-medium truncate">{cert.lotNo}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-gray-500">Issue Date</p>
                                    <p className="text-sm sm:text-base font-medium truncate">{formatDate(cert.issueDate)}</p>
                                  </div>
                                </div>

                                {cert.approvalEmailSent && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-xs sm:text-sm text-blue-600">Email Status</p>
                                      <p className="text-sm sm:text-base font-medium text-blue-700">
                                        Approval email sent
                                        {cert.approvalEmailSentAt && (
                                          <span className="text-xs text-blue-500 block">
                                            {new Date(cert.approvalEmailSentAt.toDate()).toLocaleString()}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {cert.netWeight && (
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-gray-400" />
                                    <div>
                                      <p className="text-sm text-gray-500">Net Weight</p>
                                      <p className="font-medium">{cert.netWeight}</p>
                                    </div>
                                  </div>
                                )}

                                {cert.shelfLife && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <div>
                                      <p className="text-sm text-gray-500">Shelf Life</p>
                                      <p className="font-medium">{cert.shelfLife}</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                            {/* Customer Address - Compact */}
                            {cert.customerAddress && (
                              <div className="flex items-start gap-2 mt-3 pt-3 border-t border-gray-100">
                                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div>
                                  <p className="text-sm text-gray-500">Customer Address</p>
                                  <p className="text-sm text-gray-700">{cert.customerAddress}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons - Mobile Optimized */}
                          <div className="flex flex-row sm:flex-col gap-2 sm:ml-6 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReviewCertificate(cert)}
                              className="flex-1 sm:w-24 text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              <span className="hidden xs:inline">Review</span>
                              <span className="xs:hidden">View</span>
                            </Button>
                            
                            {userData?.role === 'L1' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditStart(cert)}
                                className="flex-1 sm:w-24 text-xs"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            )}
                            
                            {cert.status === 'awaiting_authentication' && userData?.role === 'L1' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendApprovalEmail(cert.id!)}
                                disabled={sendingEmailId === cert.id}
                                className="flex-1 sm:w-24 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title={cert.approvalEmailSent ? 'Resend approval email' : 'Send approval email'}
                              >
                                {sendingEmailId === cert.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Mail className="h-3 w-3 mr-1" />
                                    <span className="hidden xs:inline">
                                      {cert.approvalEmailSent ? 'Resend' : 'Email'}
                                    </span>
                                    <span className="xs:hidden">📧</span>
                                  </>
                                )}
                              </Button>
                            )}
                            
                            {cert.status !== 'approved' && userData?.role === 'L1' && (
                              <Button
                                size="sm"
                                onClick={() => handleApproveCertificate(cert.id!)}
                                disabled={processingId === cert.id}
                                className="flex-1 sm:w-24 text-xs"
                              >
                                {processingId === cert.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    <span className="hidden xs:inline">Approve</span>
                                    <span className="xs:hidden">OK</span>
                                  </>
                                )}
                              </Button>
                            )}

                            {cert.status !== 'rejected' && userData?.role === 'L1' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectCertificate(cert.id!)}
                                disabled={processingId === cert.id}
                                className="w-24 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {processingId === cert.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Review Certificate Modal */}
        {showReviewModal && reviewCertificate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Certificate Preview - {reviewCertificate.certificateNo}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowReviewModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
                             <CardContent className="p-0">
                 {/* Certificate Preview - Professional & Authentic */}
                 <div className="bg-white" style={{
                   width: '800px',
                   maxWidth: '100%',
                   margin: '0 auto',
                   fontFamily: 'Arial, sans-serif',
                   fontSize: '11px',
                   lineHeight: '1.2',
                   border: '4px solid #3b4db8',
                   position: 'relative'
                 }}>
                   {/* Top Border Design - Exact Match */}
                   <div style={{
                     background: 'linear-gradient(45deg, #dc2626 0%, #3b4db8 50%, #dc2626 100%)',
                     height: '6px',
                     width: '100%'
                   }}></div>
                   
                   {/* Header Section */}
                   <div style={{
                     display: 'flex',
                     justifyContent: 'space-between',
                     alignItems: 'center',
                     padding: '12px 20px 8px',
                     minHeight: '75px'
                   }}>
                     {/* ILAB Logo - Larger */}
                     <div style={{ width: '140px', height: '70px' }}>
                       <img 
                         src="/logos/ilab-logo.png" 
                         alt="ILAB Logo" 
                         style={{ 
                           width: '100%', 
                           height: '100%',
                           objectFit: 'contain'
                         }} 
                       />
                     </div>
                     
                     {/* Company Name and Certificate Title */}
                     <div style={{ flex: '1', textAlign: 'center', margin: '5px 20px 0' }}>
                       <h2 style={{
                         fontSize: '16px',
                         fontWeight: 'bold',
                         margin: '0 0 3px 0',
                         letterSpacing: '1px',
                         color: '#000',
                         textDecoration: 'underline'
                       }}>
                         Calibre Speciality Elastomers India Pvt. Ltd.
                       </h2>
                       <h1 style={{
                         fontSize: '18px',
                         fontWeight: 'bold',
                         margin: '0',
                         letterSpacing: '3px',
                         color: '#000',
                         textDecoration: 'underline'
                       }}>
                         Certificate of Analysis
                       </h1>
                     </div>
                     
                     {/* CSE Logo - Larger */}
                     <div style={{ width: '95px', height: '70px' }}>
                       <img 
                         src="/logos/cse-logo.png" 
                         alt="CSE Logo" 
                         style={{ 
                           width: '100%', 
                           height: '100%',
                           objectFit: 'contain'
                         }} 
                       />
                     </div>
                   </div>
                   
                   {/* Customer and Date Info */}
                   <div style={{ padding: '0 20px 3px', fontSize: '10px', lineHeight: '1.3' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <div>
                         <div style={{ marginBottom: '1px' }}><strong>Customer Name :-</strong> {reviewCertificate.customerName}</div>
                         <div style={{ marginBottom: '1px' }}><strong>Invoice No :-</strong> {reviewCertificate.invoiceNo}</div>
                         <div><strong>Supply Quantity :-</strong> {reviewCertificate.supplyQuantity}</div>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                         <div style={{ marginBottom: '1px' }}><strong>Date of Issue :-</strong> {new Date(reviewCertificate.issueDate).toLocaleDateString('en-GB')}</div>
                         <div><strong>Report No :-</strong> {reviewCertificate.certificateNo}</div>
                       </div>
                     </div>
                   </div>
                   
                   {/* Product Name */}
                   <div style={{ textAlign: 'center', padding: '6px 0' }}>
                     <h2 style={{
                       fontSize: '15px',
                       fontWeight: 'bold',
                       margin: '0',
                       letterSpacing: '1.5px'
                     }}>
                       {reviewCertificate.productName}
                     </h2>
                   </div>
                   
                   {/* Net Weight and Shelf Life */}
                   <div style={{ padding: '0 20px 6px', textAlign: 'center' }}>
                     <div style={{ display: 'inline-flex', gap: '35px' }}>
                       <div style={{
                         border: '1px solid #000',
                         padding: '2px 10px',
                         fontSize: '10px'
                       }}>
                         <strong>Net Weight:-</strong> {reviewCertificate.netWeight || reviewCertificate.supplyQuantity}
                       </div>
                       <div style={{
                         border: '1px solid #000',
                         padding: '2px 10px',
                         fontSize: '10px'
                       }}>
                         <strong>Shelf Life:-</strong> {reviewCertificate.shelfLife || '12 Months'}
                       </div>
                     </div>
                   </div>
                   
                   {/* Test Results Table - Professional */}
                   <div style={{ padding: '0 20px 6px' }}>
                     <table style={{
                       width: '100%',
                       borderCollapse: 'collapse',
                       border: '2px solid #000',
                       fontSize: '8px'
                     }}>
                       <thead>
                         <tr style={{ backgroundColor: '#f5f5f5' }}>
                           <th style={{
                             border: '1px solid #000',
                             padding: '3px 2px',
                             textAlign: 'center',
                             fontWeight: 'bold',
                             fontSize: '9px',
                             width: '22%',
                             height: '35px'
                           }}>
                             <u>Attributes</u>
                           </th>
                           <th style={{
                             border: '1px solid #000',
                             padding: '3px 2px',
                             textAlign: 'center',
                             fontWeight: 'bold',
                             fontSize: '9px',
                             width: '18%'
                           }}>
                             <u>Test Method References</u>
                           </th>
                           <th style={{
                             border: '1px solid #000',
                             padding: '3px 2px',
                             textAlign: 'center',
                             fontWeight: 'bold',
                             fontSize: '9px',
                             width: '8%'
                           }}>
                             <u>Unit</u>
                           </th>
                           <th style={{
                             border: '1px solid #000',
                             padding: '3px 2px',
                             textAlign: 'center',
                             fontWeight: 'bold',
                             fontSize: '9px',
                             width: '12%'
                           }}>
                             <u>Range</u>
                           </th>
                           <th style={{
                             border: '1px solid #000',
                             padding: '3px 2px',
                             textAlign: 'center',
                             fontWeight: 'bold',
                             fontSize: '8px',
                             width: '40%'
                           }}>
                             <u>Obtained Value</u><br />
                             <strong>LOT NO- {reviewCertificate.lotNo}</strong><br />
                             <strong>QTY- {reviewCertificate.supplyQuantity}</strong>
                           </th>
                         </tr>
                       </thead>
                       <tbody>
                         {/* Automated Test Results */}
                         {reviewCertificate.testData?.attributes && reviewCertificate.testData.attributes.map((test, index) => (
                           <tr key={`auto-${index}`}>
                             <td style={{
                               border: '1px solid #000',
                               padding: '2px',
                               textAlign: 'left',
                               fontSize: '7px',
                               fontWeight: '500',
                               height: '18px',
                               verticalAlign: 'middle'
                             }}>{test.name}</td>
                             <td style={{
                               border: '1px solid #000',
                               padding: '2px',
                               textAlign: 'center',
                               fontSize: '7px',
                               verticalAlign: 'middle'
                             }}>{test.method}</td>
                             <td style={{
                               border: '1px solid #000',
                               padding: '2px',
                               textAlign: 'center',
                               fontSize: '7px',
                               fontWeight: 'bold',
                               verticalAlign: 'middle'
                             }}>{test.unit}</td>
                             <td style={{
                               border: '1px solid #000',
                               padding: '2px',
                               textAlign: 'center',
                               fontSize: '7px',
                               verticalAlign: 'middle'
                             }}>{test.range}</td>
                             <td style={{
                               border: '1px solid #000',
                               padding: '2px',
                               textAlign: 'center',
                               fontSize: '8px',
                               fontWeight: 'bold',
                               verticalAlign: 'middle'
                             }}>{test.obtainedValue}</td>
                           </tr>
                         ))}
                         
                         {/* Manual Test Results */}
                         {reviewCertificate.manualTestData && reviewCertificate.manualTestData.map((test, index) => (
                           <tr key={`manual-${index}`}>
                             <td style={{
                               border: '1px solid #000',
                               padding: '2px',
                               textAlign: 'left',
                               fontSize: '7px',
                               fontWeight: '500',
                               height: '18px',
                               verticalAlign: 'middle'
                             }}>{test.name}</td>
                             <td style={{
                               border: '1px solid #000',
                               padding: '2px',
                               textAlign: 'center',
                               fontSize: '7px',
                               verticalAlign: 'middle'
                             }}>{test.method}</td>
                             <td style={{
                               border: '1px solid #000',
                               padding: '2px',
                               textAlign: 'center',
                               fontSize: '7px',
                               fontWeight: 'bold',
                               verticalAlign: 'middle'
                             }}>{test.unit}</td>
                             <td style={{
                               border: '1px solid #000',
                               padding: '2px',
                               textAlign: 'center',
                               fontSize: '7px',
                               verticalAlign: 'middle'
                             }}>{test.specification}</td>
                             <td style={{
                               border: '1px solid #000',
                               padding: '2px',
                               textAlign: 'center',
                               fontSize: '8px',
                               fontWeight: 'bold',
                               verticalAlign: 'middle',
                               color: test.isWithinRange ? '#000' : '#dc2626'
                             }}>{test.obtainedValue}</td>
                           </tr>
                         ))}
                         
                         {/* Overall conclusion row */}
                         <tr>
                           <td style={{
                             border: '1px solid #000',
                             padding: '2px',
                             textAlign: 'left',
                             fontSize: '7px',
                             fontWeight: 'bold',
                             height: '18px',
                             verticalAlign: 'middle'
                           }}>Overall conclusion</td>
                           <td style={{
                             border: '1px solid #000',
                             padding: '2px',
                             verticalAlign: 'middle'
                           }}></td>
                           <td style={{
                             border: '1px solid #000',
                             padding: '2px',
                             verticalAlign: 'middle'
                           }}></td>
                           <td style={{
                             border: '1px solid #000',
                             padding: '2px',
                             textAlign: 'center',
                             fontSize: '7px',
                             fontWeight: 'bold',
                             verticalAlign: 'middle'
                           }}>PASS</td>
                           <td style={{
                             border: '1px solid #000',
                             padding: '2px',
                             textAlign: 'center',
                             fontSize: '8px',
                             fontWeight: 'bold',
                             verticalAlign: 'middle',
                             color: '#22c55e'
                           }}>PASS</td>
                         </tr>
                       </tbody>
                     </table>
                   </div>
                   
                   {/* Footer Text - Professional */}
                   <div style={{ padding: '0 20px 4px', fontSize: '7px', lineHeight: '1.1' }}>
                     <p style={{ margin: '0', textAlign: 'justify' }}>
                       Test specimens are cured at (2mm) 165°C for 15 mins and (6mm) 165°C for 20 mins in compression molding.<br />
                       This item is Regularly Tested by our Quality Team and meets all the requirements defined by the appropriate current specifications and standards.<br />
                       This material is manufactured, Packed, stored and shipped in accordance with good manufacturing practices and standard.
                     </p>
                   </div>
                   
                   {/* Digital Authentication - Right Aligned */}
                   <div style={{ padding: '0 20px 4px', textAlign: 'right', fontSize: '6px', lineHeight: '1.0' }}>
                     <p style={{ margin: '0' }}>
                       This certificate has been digitally<br />
                       authenticated and verified by<br />
                       <strong>Systems & Quality Assurance - CSE</strong><br />
                       via iLab, the digital laboratory platform<br />
                       by Calibre Speciality Elastomers.
                     </p>
                   </div>
                   
                   {/* Company Address Footer - Professional */}
                   <div style={{
                     background: 'linear-gradient(90deg, #3b4db8 0%, #dc2626 50%, #3b4db8 100%)',
                     color: 'white',
                     textAlign: 'center',
                     padding: '4px',
                     fontSize: '7px'
                   }}>
                     <div>
                       <strong>204, Vishwakarma Industrial Estate, Bagpat road, Meerut, UP – 250002 || E-Mail – info@calibreelastomers.com</strong>
                     </div>
                     <div>
                       <strong>www.calibreelastomers.com</strong>
                     </div>
                   </div>
                   
                   {/* Bottom Border Design - Exact Match */}
                   <div style={{
                     background: 'linear-gradient(45deg, #dc2626 0%, #3b4db8 50%, #dc2626 100%)',
                     height: '6px',
                     width: '100%'
                   }}></div>
                 </div>

                {/* Action Buttons */}
                <div className="flex justify-end items-center pt-4 border-t">
                  
                  <div className="flex gap-2">
                    {reviewCertificate.status !== 'rejected' && userData?.role === 'L1' && (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setShowReviewModal(false)
                          handleRejectCertificate(reviewCertificate.id!)
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    )}
                    
                    {reviewCertificate.status !== 'approved' && userData?.role === 'L1' && (
                      <Button 
                        onClick={() => {
                          setShowReviewModal(false)
                          handleApproveCertificate(reviewCertificate.id!)
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Certificate Modal */}
        {showEditModal && editingCertificate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit Certificate - {editingCertificate.certificateNo}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={handleEditCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Certificate Basic Info */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="text-lg font-semibold mb-4">Certificate Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Customer Name</Label>
                      <Input
                        value={editForm.customerName || ''}
                        onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Invoice No</Label>
                      <Input
                        value={editForm.invoiceNo || ''}
                        onChange={(e) => setEditForm({ ...editForm, invoiceNo: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Supply Quantity</Label>
                      <Input
                        value={editForm.supplyQuantity || ''}
                        onChange={(e) => setEditForm({ ...editForm, supplyQuantity: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>LOT No</Label>
                      <Input
                        value={editForm.lotNo || ''}
                        onChange={(e) => setEditForm({ ...editForm, lotNo: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Net Weight</Label>
                      <Input
                        value={editForm.netWeight || ''}
                        onChange={(e) => setEditForm({ ...editForm, netWeight: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Shelf Life</Label>
                      <Input
                        value={editForm.shelfLife || ''}
                        onChange={(e) => setEditForm({ ...editForm, shelfLife: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Customer Address</Label>
                      <Textarea
                        value={editForm.customerAddress || ''}
                        onChange={(e) => setEditForm({ ...editForm, customerAddress: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Automated Test Results Editing */}
                {editForm.testData?.attributes && editForm.testData.attributes.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Automated Test Results</h3>
                    <div className="space-y-2">
                      {editForm.testData.attributes.map((test, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-3 border rounded bg-white">
                          <div>
                            <Label className="text-sm">Test Name</Label>
                            <div className="font-medium text-sm">{test.name}</div>
                            <div className="text-xs text-gray-500">{test.method}</div>
                          </div>
                          <div>
                            <Label className="text-sm">Unit</Label>
                            <Input
                              value={test.unit}
                              onChange={(e) => handleAutomatedTestUpdate(index, 'unit', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Range</Label>
                            <Input
                              value={test.range}
                              onChange={(e) => handleAutomatedTestUpdate(index, 'range', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Obtained Value</Label>
                            <Input
                              value={test.obtainedValue}
                              onChange={(e) => handleAutomatedTestUpdate(index, 'obtainedValue', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                              ✓ Auto-tested
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Test Results Editing */}
                {editForm.manualTestData && editForm.manualTestData.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Manual Test Results</h3>
                    <div className="space-y-2">
                      {editForm.manualTestData.map((test, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-3 border rounded bg-white">
                          <div>
                            <Label className="text-sm">Test Name</Label>
                            <div className="font-medium text-sm">{test.name}</div>
                            <div className="text-xs text-gray-500">{test.method}</div>
                          </div>
                          <div>
                            <Label className="text-sm">Unit</Label>
                            <div className="text-sm font-medium">{test.unit}</div>
                          </div>
                          <div>
                            <Label className="text-sm">Specification</Label>
                            <div className="text-sm font-medium">{test.specification}</div>
                          </div>
                          <div>
                            <Label className="text-sm">Obtained Value</Label>
                            <Input
                              value={test.obtainedValue}
                              onChange={(e) => handleManualTestUpdate(index, 'obtainedValue', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <span 
                              className={`text-xs px-2 py-1 rounded ${test.isWithinRange ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                            >
                              {test.isWithinRange ? '✓ Valid' : '✗ Out of Range'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button variant="outline" onClick={handleEditCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleEditSave}
                    disabled={processingId === editingCertificate.id}
                  >
                    {processingId === editingCertificate.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
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
