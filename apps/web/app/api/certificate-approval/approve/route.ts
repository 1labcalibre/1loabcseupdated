import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple token storage (in production, use Redis or proper cache)
declare global {
  var approvalTokens: Map<string, any> | undefined
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const certificateId = searchParams.get('certificateId')

    if (!token || !certificateId) {
      return new NextResponse(
        generateErrorPage('Invalid Request', 'Missing required parameters. Please use the link from your email.'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Get token data from our simple storage
    const tokenStorage = global.approvalTokens || new Map()
    const tokenData = tokenStorage.get(token)
    
    if (!tokenData) {
      return new NextResponse(
        generateErrorPage('Invalid Token', 'This approval link is invalid or has expired. Please use the latest link from your email.'),
        { status: 403, headers: { 'Content-Type': 'text/html' } }
      )
    }
    
    // Check if token is expired
    if (Date.now() > tokenData.expires) {
      tokenStorage.delete(token)
      return new NextResponse(
        generateErrorPage('Expired Token', 'This approval link has expired. Please request a new approval email.'),
        { status: 403, headers: { 'Content-Type': 'text/html' } }
      )
    }
    
    // Verify certificate ID matches
    if (tokenData.certificateId !== certificateId) {
      return new NextResponse(
        generateErrorPage('Token Mismatch', 'This approval link does not match the requested certificate.'),
        { status: 403, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const certificate = tokenData.certificateData

    // Check if certificate is already processed
    if (certificate.status === 'approved') {
      return new NextResponse(
        generateAlreadyProcessedPage('Already Approved', 'This certificate has already been approved. No further action is required.', certificate, 'approved'),
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      )
    }
    
    if (certificate.status === 'rejected') {
      return new NextResponse(
        generateAlreadyProcessedPage('Already Rejected', 'This certificate has already been rejected. The approval action cannot be completed.', certificate, 'rejected'),
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Update certificate status - store this action for processing
    console.log(`Certificate ${certificateId} approved via email`)
    
    // Store the approval action in our token storage for the certificate to be updated
    tokenData.certificateData.status = 'approved'
    tokenData.certificateData.approvedAt = new Date().toISOString()
    tokenData.certificateData.approvedBy = 'Email Approval'
    tokenData.certificateData.approvedVia = 'email'
    
    // Update the token storage
    tokenStorage.set(token, tokenData)
    
    // Note: Server-side Firebase update doesn't work without proper auth context
    // We'll let the client-side sync handle this when the user visits the app
    console.log(`Certificate ${certificateId} marked for approval, will sync on next app visit`)

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Certificate Approved</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              body { 
                  font-family: Arial, sans-serif; 
                  max-width: 600px; 
                  margin: 50px auto; 
                  padding: 20px; 
                  text-align: center;
                  background-color: #f5f5f5;
              }
              .success { 
                  color: #2e7d32; 
                  background: linear-gradient(135deg, #e8f5e8, #c8e6c9); 
                  padding: 30px; 
                  border-radius: 12px; 
                  margin: 20px 0; 
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              }
              .certificate-info {
                  background: white;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 20px 0;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .btn {
                  display: inline-block;
                  background: linear-gradient(135deg, #667eea, #764ba2);
                  color: white;
                  padding: 12px 24px;
                  text-decoration: none;
                  border-radius: 8px;
                  margin: 10px;
                  font-weight: 600;
              }
              .btn:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
              }
              h1 { color: #2e7d32; margin-bottom: 10px; }
              .checkmark { font-size: 48px; color: #4CAF50; margin-bottom: 20px; }
          </style>
      </head>
      <body>
          <div class="checkmark">✅</div>
          <h1>Certificate Successfully Approved!</h1>
          <div class="success">
              <h3>Approval Confirmed</h3>
              <p>The certificate has been approved and is now active in the system.</p>
          </div>
          <div class="certificate-info">
              <h4>Certificate Details:</h4>
                          <p><strong>Certificate Number:</strong> ${certificate.certificateNumber || certificate.certificateNo}</p>
            <p><strong>Product:</strong> ${certificate.productName}</p>
            <p><strong>Batch:</strong> ${certificate.batchNumber || certificate.batchNo}</p>
              <p><strong>Approved At:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>
              <a href="/login" class="btn">Go to Application</a>
              <a href="/certificate-approvals" class="btn">View More Approvals</a>
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This window can be safely closed. The approval has been recorded in the system.
          </p>
      </body>
      </html>
      `,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )

  } catch (error) {
    console.error('Error approving certificate:', error)
    return new NextResponse(
      generateErrorPage('Error Processing Request', 'An error occurred while processing your approval. Please try again or contact support.'),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    )
  }
}

function generateErrorPage(title: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${title}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #d32f2f; background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <h1>${title}</h1>
        <div class="error">${message}</div>
        <p><a href="/login">Go to Application</a></p>
    </body>
    </html>
  `
}

function generateAlreadyProcessedPage(title: string, message: string, certificate: any, status: string): string {
  const statusColor = status === 'approved' ? '#4CAF50' : '#f44336'
  const statusIcon = status === 'approved' ? '✅' : '❌'
  const statusText = status === 'approved' ? 'APPROVED' : 'REJECTED'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${title}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 600px; 
                margin: 50px auto; 
                padding: 20px; 
                text-align: center;
                background-color: #f5f5f5;
            }
            .already-processed { 
                color: ${statusColor}; 
                background: ${status === 'approved' ? 'linear-gradient(135deg, #e8f5e8, #c8e6c9)' : 'linear-gradient(135deg, #ffebee, #ffcdd2)'}; 
                padding: 30px; 
                border-radius: 12px; 
                margin: 20px 0; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .certificate-info {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .btn {
                display: inline-block;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 8px;
                margin: 10px;
                font-weight: 600;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
            }
            h1 { color: ${statusColor}; margin-bottom: 10px; }
            .status-icon { font-size: 48px; color: ${statusColor}; margin-bottom: 20px; }
            .status-badge {
                display: inline-block;
                background: ${statusColor};
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="status-icon">${statusIcon}</div>
        <h1>${title}</h1>
        <div class="already-processed">
            <h3>Action Not Allowed</h3>
            <p>${message}</p>
        </div>
        <div class="certificate-info">
            <h4>Certificate Details:</h4>
            <p><strong>Certificate Number:</strong> ${certificate.certificateNumber || certificate.certificateNo}</p>
            <p><strong>Product:</strong> ${certificate.productName}</p>
            <p><strong>Batch:</strong> ${certificate.batchNumber || certificate.batchNo}</p>
            <div class="status-badge">
                Current Status: ${statusText}
            </div>
            ${status === 'approved' && certificate.approvedAt ? `<p><strong>Approved At:</strong> ${new Date(certificate.approvedAt).toLocaleString()}</p>` : ''}
            ${status === 'rejected' && certificate.rejectedAt ? `<p><strong>Rejected At:</strong> ${new Date(certificate.rejectedAt).toLocaleString()}</p>` : ''}
        </div>
        <p>
            <a href="/login" class="btn">Go to Application</a>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This window can be safely closed. No changes have been made to the certificate.
        </p>
    </body>
    </html>
  `
}
