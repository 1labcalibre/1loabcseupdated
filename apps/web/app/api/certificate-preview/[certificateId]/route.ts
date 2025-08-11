import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple token storage (in production, use Redis or proper cache)
declare global {
  var approvalTokens: Map<string, any> | undefined
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const { certificateId } = await params
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!certificateId) {
      return new NextResponse('Certificate ID is required', { status: 400 })
    }

    if (!token) {
      return new NextResponse('Access token is required', { status: 401 })
    }

    // Get token data from our simple storage
    const tokenStorage = global.approvalTokens || new Map()
    const tokenData = tokenStorage.get(token)
    
    if (!tokenData) {
      return new NextResponse('Invalid or expired token', { status: 403 })
    }
    
    // Check if token is expired
    if (Date.now() > tokenData.expires) {
      tokenStorage.delete(token)
      return new NextResponse('Token has expired', { status: 403 })
    }
    
    // Verify certificate ID matches
    if (tokenData.certificateId !== certificateId) {
      return new NextResponse('Token does not match certificate', { status: 403 })
    }

    // Redirect to certificate-view page with token for authentication
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`
    const redirectUrl = `${baseUrl}/certificate-view?id=${certificateId}&token=${token}&preview=true`
    
    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Error generating certificate preview:', error)
    return new NextResponse('Error generating preview', { status: 500 })
  }
}

function generateCertificatePreviewHtml(certificate: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate Preview - ${certificate.certificateNumber}</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .certificate-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            border: 2px solid #667eea;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #667eea;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .company-address {
            font-size: 14px;
            color: #666;
            margin-bottom: 20px;
        }
        .certificate-title {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .certificate-number {
            font-size: 18px;
            color: #667eea;
            font-weight: bold;
        }
        .certificate-content {
            line-height: 1.8;
            margin: 30px 0;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .info-table th,
        .info-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .info-table th {
            background-color: #f8f9ff;
            font-weight: bold;
            color: #667eea;
        }
        .test-results {
            margin: 30px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #667eea;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            margin: 10px 0;
        }
        .status-awaiting {
            background-color: #fff3cd;
            color: #856404;
            border: 2px solid #ffeaa7;
        }
        .status-approved {
            background-color: #d4edda;
            color: #155724;
            border: 2px solid #c3e6cb;
        }
        .status-rejected {
            background-color: #f8d7da;
            color: #721c24;
            border: 2px solid #f5c6cb;
        }
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 100px;
            color: rgba(102, 126, 234, 0.1);
            font-weight: bold;
            z-index: -1;
            pointer-events: none;
        }
        .preview-note {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            color: #1976d2;
            text-align: center;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="watermark">PREVIEW</div>
    
    <div class="certificate-container">
        <div class="preview-note">
            📄 CERTIFICATE PREVIEW - This is a preview of the certificate pending approval
        </div>
        
        <div class="header">
            <div class="company-name">Calibre Specialty Elastomers India Pvt. Ltd.</div>
            <div class="company-address">
                204, Vishwakarma Industrial Estate, Bagpat Road, Meerut, 250002. (U.P)<br>
                Email: calibreelastomers@gmail.com | Website: www.calibreelastomers.com
            </div>
            <div class="certificate-title">Certificate of Analysis</div>
            <div class="certificate-number">Certificate No: ${certificate.certificateNumber || certificate.certificateNo}</div>
            <div class="status-badge status-${certificate.status === 'awaiting_authentication' ? 'awaiting' : certificate.status}">
                Status: ${certificate.status === 'awaiting_authentication' ? 'Awaiting Approval' : certificate.status.toUpperCase()}
            </div>
        </div>

        <div class="certificate-content">
            <p>This is to certify that the following material has been tested and analyzed in accordance with the specified test methods and standards:</p>
            
            <table class="info-table">
                <tr>
                    <th>Product Name</th>
                    <td>${certificate.productName || 'N/A'}</td>
                </tr>
                <tr>
                    <th>Batch Number</th>
                    <td>${certificate.batchNumber || certificate.batchNo || 'N/A'}</td>
                </tr>
                <tr>
                    <th>Manufacturing Date</th>
                    <td>${certificate.manufacturingDate || 'N/A'}</td>
                </tr>
                <tr>
                    <th>Test Date</th>
                    <td>${certificate.testDate || certificate.issueDate || 'N/A'}</td>
                </tr>
                <tr>
                    <th>Net Weight</th>
                    <td>${certificate.netWeight || 'N/A'}</td>
                </tr>
                <tr>
                    <th>Shelf Life</th>
                    <td>${certificate.shelfLife || 'N/A'}</td>
                </tr>
                <tr>
                    <th>Customer Name</th>
                    <td>${certificate.customerName || 'N/A'}</td>
                </tr>
                <tr>
                    <th>Customer Address</th>
                    <td>${certificate.customerAddress || 'N/A'}</td>
                </tr>
            </table>

            <div class="test-results">
                <h3 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Test Results</h3>
                ${certificate.testResults ? `
                <table class="info-table">
                    <thead>
                        <tr>
                            <th>Test Parameter</th>
                            <th>Test Method</th>
                            <th>Unit</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(certificate.testResults).map(([key, value]: [string, any]) => `
                            <tr>
                                <td>${key}</td>
                                <td>${value.method || 'N/A'}</td>
                                <td>${value.unit || 'N/A'}</td>
                                <td>${value.value || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : '<p>No test results available</p>'}
            </div>

            <div style="margin: 30px 0;">
                <h4 style="color: #667eea;">Test Conditions:</h4>
                <p>${certificate.testConditions || 'Test specimens are cured at (2mm) 165°C for 15 mins and (6mm) 165°C for 20 mins in compression molding.'}</p>
            </div>

            <div style="margin: 30px 0;">
                <h4 style="color: #667eea;">Remarks:</h4>
                <p>${certificate.remarks || 'No additional remarks'}</p>
            </div>
        </div>

        <div class="footer">
            <p><strong>Certificate generated on:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Issue Date:</strong> ${certificate.issueDate || certificate.testDate || 'N/A'}</p>
            ${certificate.approvedBy ? `<p><strong>Approved by:</strong> ${certificate.approvedBy} on ${certificate.approvedAt || 'N/A'}</p>` : ''}
            <p style="margin-top: 20px; font-style: italic;">
                This certificate is issued based on laboratory test results and is valid only for the tested batch.
            </p>
        </div>
    </div>

    <div style="text-align: center; margin: 20px 0; color: #666;">
        <p>This is a preview of the certificate. You can close this window after reviewing.</p>
    </div>
</body>
</html>
  `
}
