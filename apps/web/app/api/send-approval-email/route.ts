import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { certificateData, emailSettings } = await request.json()

    if (!certificateData || !emailSettings) {
      return NextResponse.json(
        { success: false, error: 'Certificate data and email settings are required' },
        { status: 400 }
      )
    }

    // Check if certificate is in correct status for approval
    if (certificateData.status !== 'awaiting_authentication' && certificateData.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Certificate is not in a state that requires approval' },
        { status: 400 }
      )
    }
    
    // Check if email approvals are enabled
    if (!emailSettings.enableEmailApprovals) {
      return NextResponse.json(
        { success: false, error: 'Email approvals are not enabled in settings' },
        { status: 400 }
      )
    }

    if (!emailSettings.certificateApprovalEmail) {
      return NextResponse.json(
        { success: false, error: 'No approval email configured in settings' },
        { status: 400 }
      )
    }

    // Generate approval token - using a simpler approach for email links
    const approvalToken = `approve_${certificateData.id}_${Math.random().toString(36).substr(2, 9)}`
    
    // Get base URL for links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`
    
    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtpHost,
      port: emailSettings.smtpPort,
      secure: emailSettings.smtpPort === 465,
      auth: {
        user: emailSettings.smtpUser,
        pass: emailSettings.smtpPassword,
      },
    })

    // Generate email HTML
    const htmlContent = generateApprovalEmailTemplate({
      certificateId: certificateData.id,
      certificateNumber: certificateData.certificateNumber || certificateData.certificateNo,
      companyName: certificateData.customerName,
      productName: certificateData.productName,
      batchNumber: certificateData.batchNumber || certificateData.batchNo,
      testDate: certificateData.testDate || certificateData.issueDate,
      approvalToken: approvalToken,
      certificatePreviewUrl: `${baseUrl}/api/certificate-preview/${certificateData.id}?token=${approvalToken}`,
      appBaseUrl: baseUrl
    })

    // Store the token and certificate data for email API access
    const tokenData = {
      certificateId: certificateData.id,
      certificateData: certificateData,
      timestamp: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }
    
    // Send email
    const mailOptions = {
      from: emailSettings.smtpUser,
      to: emailSettings.certificateApprovalEmail,
      subject: `Certificate Approval Required - ${certificateData.certificateNumber || certificateData.certificateNo}`,
      html: htmlContent,
      // Store token data in email headers for tracking
      headers: {
        'X-Certificate-Token': approvalToken,
        'X-Certificate-ID': certificateData.id
      }
    }

    await transporter.sendMail(mailOptions)
    
    // Store token for API access (in a real app, use Redis or a proper cache)
    global.approvalTokens = global.approvalTokens || new Map()
    global.approvalTokens.set(approvalToken, tokenData)

    return NextResponse.json({
      success: true,
      message: 'Approval email sent successfully',
      approvalEmail: emailSettings.certificateApprovalEmail,
      token: approvalToken // for debugging
    })

  } catch (error) {
    console.error('Error sending approval email:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error while sending email' },
      { status: 500 }
    )
  }
}

function generateApprovalEmailTemplate(data: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate Approval Required</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            color: #333;
        }
        .email-container {
            max-width: 700px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .certificate-info {
            background-color: #f8f9ff;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .info-label {
            font-weight: 600;
            color: #555;
        }
        .info-value {
            color: #333;
        }
        .action-buttons {
            text-align: center;
            margin: 50px 0;
            padding: 30px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            border: 1px solid #dee2e6;
        }
        .action-buttons-title {
            font-size: 18px;
            font-weight: 600;
            color: #495057;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .action-buttons-subtitle {
            font-size: 14px;
            color: #6c757d;
            margin-bottom: 25px;
            font-style: italic;
        }
        .btn {
            display: inline-block;
            padding: 18px 40px;
            margin: 0 15px;
            text-decoration: none !important;
            border-radius: 12px;
            font-weight: 700;
            font-size: 16px;
            min-width: 140px;
            text-align: center;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #FFFFFF !important;
            font-family: 'Arial', 'Helvetica', sans-serif;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            color: #FFFFFF !important;
            text-decoration: none !important;
        }
        .btn-approve {
            background: #4CAF50 !important;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: #FFFFFF !important;
            border: 2px solid transparent;
        }
        .btn-approve:hover {
            background: #45a049 !important;
            background: linear-gradient(135deg, #45a049 0%, #388e3c 100%);
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
            color: #FFFFFF !important;
        }
        .btn-reject {
            background: #f44336 !important;
            background: linear-gradient(135deg, #f44336 0%, #da190b 100%);
            color: #FFFFFF !important;
            border: 2px solid transparent;
        }
        .btn-reject:hover {
            background: #da190b !important;
            background: linear-gradient(135deg, #da190b 0%, #c62828 100%);
            box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
            color: #FFFFFF !important;
        }
        .btn-preview {
            background: #2196F3 !important;
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            color: #FFFFFF !important;
            display: block;
            width: 240px;
            margin: 25px auto;
            border: 2px solid transparent;
            font-size: 15px;
        }
        .btn-preview:hover {
            background: #1976D2 !important;
            background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%);
            box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
            color: #FFFFFF !important;
        }
        .footer {
            background-color: #f1f3f4;
            padding: 25px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Certificate Approval Required</h1>
            <p>A new certificate is awaiting your approval</p>
        </div>
        
        <div class="content">
            <p>Dear Approver,</p>
            <p>A new certificate has been generated and requires your approval.</p>
            
            <div class="certificate-info">
                <h3>Certificate Details</h3>
                <div class="info-row">
                    <span class="info-label">Certificate Number:</span>
                    <span class="info-value"><strong>${data.certificateNumber}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Company:</span>
                    <span class="info-value">${data.companyName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Product Name:</span>
                    <span class="info-value">${data.productName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Batch Number:</span>
                    <span class="info-value">${data.batchNumber}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Test Date:</span>
                    <span class="info-value">${data.testDate}</span>
                </div>
            </div>

            <a href="${data.certificatePreviewUrl}" class="btn btn-preview" target="_blank"
               style="display: block; padding: 18px 40px; margin: 25px auto; text-decoration: none !important; border-radius: 12px; font-weight: 700; font-size: 15px; width: 240px; text-align: center; border: none; background: #2196F3 !important; color: #FFFFFF !important; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, Helvetica, sans-serif;">
                📄 View Certificate Preview
            </a>

            <div class="action-buttons">
                <div class="action-buttons-title">Take Action</div>
                <div class="action-buttons-subtitle">Click one of the buttons below to approve or reject this certificate</div>
                <a href="${data.appBaseUrl}/api/certificate-approval/approve?token=${data.approvalToken}&certificateId=${data.certificateId}" 
                   class="btn btn-approve"
                   style="display: inline-block; padding: 18px 40px; margin: 0 15px; text-decoration: none !important; border-radius: 12px; font-weight: 700; font-size: 16px; min-width: 140px; text-align: center; border: none; background: #4CAF50 !important; color: #FFFFFF !important; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, Helvetica, sans-serif;">
                    ✅ APPROVE
                </a>
                <a href="${data.appBaseUrl}/api/certificate-approval/reject?token=${data.approvalToken}&certificateId=${data.certificateId}" 
                   class="btn btn-reject"
                   style="display: inline-block; padding: 18px 40px; margin: 0 15px; text-decoration: none !important; border-radius: 12px; font-weight: 700; font-size: 16px; min-width: 140px; text-align: center; border: none; background: #f44336 !important; color: #FFFFFF !important; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, Helvetica, sans-serif;">
                    ❌ REJECT
                </a>
            </div>

            <p style="color: #666; font-size: 14px; text-align: center;">
                Need to make changes? 
                <a href="${data.appBaseUrl}/login" style="color: #667eea;">Login to Application</a>
            </p>
        </div>
        
        <div class="footer">
            <p><strong>Calibre Specialty Elastomers India Pvt. Ltd.</strong></p>
            <p>Certificate Management System</p>
        </div>
    </div>
</body>
</html>
  `
}
