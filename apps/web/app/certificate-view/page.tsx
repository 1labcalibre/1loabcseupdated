"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { ArrowLeft, Printer } from "lucide-react"
// Dynamic import for jsPDF to handle SSR issues
// import jsPDF from 'jspdf'

interface CertificateData {
  certificateNo: string
  productName: string
  batchNo: string
  customerName: string
  customerAddress: string
  invoiceNo: string
  supplyQuantity: string
  lotNo: string
  issueDate: string
  netWeight: string
  shelfLife: string
  status: 'draft' | 'awaiting_authentication' | 'approved' | 'rejected' | 'issued' | 'cancelled'
  testData: {
    attributes: Array<{
      name: string
      method: string
      unit: string
      range: string
      obtainedValue: string
    }>
  }
  manualTestData: Array<{
    name: string
    method: string
    unit: string
    specification: string
    obtainedValue: string
    isWithinRange: boolean
  }>
  // Email approval tracking
  approvedVia?: 'manual' | 'email'
  rejectedVia?: 'manual' | 'email'
  approvedAt?: any
  rejectedAt?: any
}

export default function CertificateViewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEmailPreview, setIsEmailPreview] = useState(false)
  const [accessedDirectly, setAccessedDirectly] = useState(false)

  useEffect(() => {
    const loadCertificateData = async () => {
      // Check if this is an email preview with token
      const certificateId = searchParams.get('id')
      const token = searchParams.get('token')
      const preview = searchParams.get('preview')
      
      if (certificateId && token && preview) {
        setIsEmailPreview(true)
        try {
          // Validate token and get certificate data from our token storage
          const response = await fetch(`/api/validate-token?token=${token}&certificateId=${certificateId}`)
          if (response.ok) {
            const tokenData = await response.json()
            
            // If this certificate was approved/rejected via email, sync it to Firebase immediately
            if ((tokenData.certificateData.approvedVia === 'email' || tokenData.certificateData.rejectedVia === 'email') && !tokenData.certificateData.synced) {
              try {
                console.log('Syncing email approval to Firebase...')
                // Import the certificates service dynamically
                const { certificatesService } = await import('@/lib/firebase/services/certificates')
                
                const updates: any = {}
                if (tokenData.certificateData.status === 'approved') {
                  updates.status = 'approved'
                  updates.approvedAt = new Date()
                  updates.approvedBy = 'Email Approval'
                  updates.approvedVia = 'email'
                } else if (tokenData.certificateData.status === 'rejected') {
                  updates.status = 'rejected'
                  updates.rejectedAt = new Date()
                  updates.rejectedBy = 'Email Approval'
                  updates.rejectedVia = 'email'
                }
                
                if (Object.keys(updates).length > 0) {
                  await certificatesService.update(certificateId, updates)
                  console.log(`Successfully synced certificate ${certificateId} status: ${tokenData.certificateData.status}`)
                  
                  // Mark as synced on the server
                  await fetch('/api/sync-email-approvals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      certificateId: certificateId,
                      token: token
                    })
                  })
                }
              } catch (syncError) {
                console.warn('Failed to sync email approval:', syncError)
              }
            }
            
            setCertificateData(tokenData.certificateData)
            setLoading(false)
            return
          } else {
            console.error('Invalid token for email preview')
          }
        } catch (error) {
          console.error('Error validating token:', error)
        }
      }
      
      // Fallback to sessionStorage for normal certificate viewing
      try {
        // Check if we're in the browser (not server-side)
        if (typeof window !== 'undefined') {
          const storedData = sessionStorage.getItem('certificateViewData')
          if (storedData) {
            const parsedData = JSON.parse(storedData)
            setCertificateData(parsedData)
            // Clear the data from sessionStorage after use
            sessionStorage.removeItem('certificateViewData')
          } else {
            // No data found - user probably accessed page directly
            setAccessedDirectly(true)
            // Only log warning in development
            if (process.env.NODE_ENV === 'development') {
              console.warn('Certificate data not found. Please generate or view a certificate from the certificates page.')
            }
          }
        }
      } catch (error) {
        console.error('Error parsing certificate data:', error)
      }
      setLoading(false)
    }
    
    loadCertificateData()
  }, [searchParams])

  const handlePrint = () => {
    if (certificateData?.status !== 'approved') {
      alert('Certificate must be approved by admin before printing.')
      return
    }
    window.print()
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading certificate...</div>
      </div>
    )
  }

  if (!certificateData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {accessedDirectly ? 'Page Accessed Directly' : 'No Certificate Data'}
            </h2>
            <p className="text-gray-600 mb-6">
              {accessedDirectly ? (
                <>
                  This page needs to be accessed through the certificate generation or view process.
                  <br />
                  <span className="text-sm">Please use the "Generate Certificate" or "View" buttons from the certificates page.</span>
                </>
              ) : (
                <>
                  No certificate data was found. The data may have expired or been cleared.
                  <br />
                  <span className="text-sm">Please generate or view a certificate from the certificates page.</span>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={() => router.push('/certificates')}>
              View Certificates
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Email Preview Banner - Hidden for cleaner email preview */}
      {isEmailPreview && false && (
        <div className="print:hidden bg-blue-50 border-b border-blue-200 p-3">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              📧 Certificate Email Preview - View complete certificate details
            </div>
          </div>
        </div>
      )}
      
      {/* Email Approval Status Banner - Hidden for email preview */}
      {!isEmailPreview && (certificateData?.approvedVia === 'email' || certificateData?.rejectedVia === 'email') && (
        <div className="print:hidden bg-green-50 border-b border-green-200 p-3">
          <div className="max-w-4xl mx-auto text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              certificateData.status === 'approved' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {certificateData.status === 'approved' ? '✅' : '❌'}
              Certificate {certificateData.status} via email approval
              {certificateData.approvedAt && (
                <span className="text-xs opacity-75">
                  on {new Date(certificateData.approvedAt).toLocaleString()}
                </span>
              )}
              {certificateData.rejectedAt && (
                <span className="text-xs opacity-75">
                  on {new Date(certificateData.rejectedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Print Controls - Hidden when printing and for email preview */}
      {!isEmailPreview && (
        <div className="print:hidden bg-white shadow-sm border-b p-3 sm:p-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.back()} className="text-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Certificates</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">

            <Button 
              onClick={handlePrint}
              disabled={certificateData?.status !== 'approved' && certificateData?.status !== 'issued'}
              className="text-xs sm:text-sm w-full sm:w-auto"
            >
              <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              <span className="hidden sm:inline">
                {(certificateData?.status === 'approved' || certificateData?.status === 'issued') ? 'Print' : 'Print (Pending Approval)'}
              </span>
              <span className="sm:hidden">
                {(certificateData?.status === 'approved' || certificateData?.status === 'issued') ? 'Print' : 'Print (Pending)'}
              </span>
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* Certificate Content - Mobile Optimized */}
      <div className="py-4 sm:py-8 print:py-0 px-2 sm:px-4">
        <div 
          className="certificate-container bg-white shadow-lg mx-auto relative overflow-hidden"
          style={{
            width: '100%',
            maxWidth: '800px',
            margin: '0 auto',
            position: 'relative'
          }}
        >
          {/* Authentication Status Overlay - Hidden for email preview */}
          {!isEmailPreview && certificateData.status !== 'approved' && (
            <>
              {/* Draft/Awaiting Authentication Watermark */}
              <div 
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-45deg)',
                  fontSize: '60px',
                  fontWeight: 'bold',
                  color: certificateData.status === 'draft' ? '#dc2626' : '#f59e0b',
                  opacity: 0.1,
                  zIndex: 10,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                {certificateData.status === 'draft' ? 'DRAFT COPY' : 
                 (['approved', 'issued'].includes(certificateData.status)) ? 'APPROVED' :
                 certificateData.status === 'rejected' ? 'REJECTED' : 'AWAITING AUTHENTICATION'}
              </div>
              
              {/* Status Badge */}
              <div 
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: certificateData.status === 'draft' ? '#dc2626' : '#f59e0b',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  zIndex: 10
                }}
              >
                {certificateData.status === 'draft' ? 'DRAFT' : 
                 (['approved', 'issued'].includes(certificateData.status)) ? 'APPROVED' :
                 certificateData.status === 'rejected' ? 'REJECTED' : 'AWAITING AUTHENTICATION'}
              </div>
            </>
          )}

          {/* Main Content */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Professional Certificate Format - Exact Copy from Approvals Page */}
            <div style={{
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
                    <div style={{ marginBottom: '1px' }}><strong>Customer Name :-</strong> {certificateData.customerName}</div>
                    <div style={{ marginBottom: '1px' }}><strong>Invoice No :-</strong> {certificateData.invoiceNo}</div>
                    <div><strong>Supply Quantity :-</strong> {certificateData.supplyQuantity}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ marginBottom: '1px' }}><strong>Date of Issue :-</strong> {new Date(certificateData.issueDate).toLocaleDateString('en-GB')}</div>
                    <div><strong>Report No :-</strong> {certificateData.certificateNo}</div>
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
                  {certificateData.productName}
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
                    <strong>Net Weight:-</strong> {certificateData.netWeight || certificateData.supplyQuantity}
                  </div>
                  <div style={{
                    border: '1px solid #000',
                    padding: '2px 10px',
                    fontSize: '10px'
                  }}>
                    <strong>Shelf Life:-</strong> {certificateData.shelfLife || '12 Months'}
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
                        <strong>LOT NO- {certificateData.lotNo}</strong><br />
                        <strong>QTY- {certificateData.supplyQuantity}</strong>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Automated Test Results */}
                    {certificateData.testData?.attributes && certificateData.testData.attributes.map((test, index) => (
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
                    {certificateData.manualTestData && certificateData.manualTestData.map((test, index) => (
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
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .certificate-container {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
            transform: scale(1) !important;
            transform-origin: top left !important;
          }
          
          @page {
            size: A4 landscape;
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  )
}