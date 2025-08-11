import nodemailer from 'nodemailer'
import { settingsService } from '@/lib/firebase/services/settings'

export interface EmailTemplateData {
  certificateId: string
  certificateNumber: string
  companyName: string
  productName: string
  batchNumber: string
  testDate: string
  approvalToken: string
  certificatePreviewUrl: string
  appBaseUrl: string
}

class EmailService {
  private async createTransporter() {
    const emailSettings = await settingsService.getEmailSettings()
    
    if (!emailSettings.smtpHost || !emailSettings.smtpUser) {
      throw new Error('Email settings not configured. Please configure SMTP settings first.')
    }

    return nodemailer.createTransport({
      host: emailSettings.smtpHost,
      port: emailSettings.smtpPort,
      secure: emailSettings.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: emailSettings.smtpUser,
        pass: emailSettings.smtpPassword,
      },
      // For localhost testing, you might want to use these settings for Gmail:
      // host: 'smtp.gmail.com',
      // port: 587,
      // secure: false,
      // Use app-specific password for Gmail
    })
  }

  async sendCertificateApprovalEmail(templateData: EmailTemplateData): Promise<boolean> {
    try {
      const emailSettings = await settingsService.getEmailSettings()
      
      if (!emailSettings.enableEmailApprovals || !emailSettings.certificateApprovalEmail) {
        console.log('Email approvals disabled or no approval email configured')
        return false
      }

      const transporter = await this.createTransporter()
      const htmlContent = this.generateApprovalEmailTemplate(templateData)

      const mailOptions = {
        from: emailSettings.smtpUser,
        to: emailSettings.certificateApprovalEmail,
        subject: `Certificate Approval Required - ${templateData.certificateNumber}`,
        html: htmlContent,
      }

      const result = await transporter.sendMail(mailOptions)
      console.log('Certificate approval email sent:', result.messageId)
      return true
    } catch (error) {
      console.error('Error sending certificate approval email:', error)
      return false
    }
  }

  private generateApprovalEmailTemplate(data: EmailTemplateData): string {
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
        .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
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
        .certificate-info h3 {
            margin: 0 0 15px 0;
            color: #667eea;
            font-size: 18px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: 600;
            color: #555;
            flex: 1;
        }
        .info-value {
            flex: 2;
            text-align: right;
            color: #333;
        }
        .action-buttons {
            text-align: center;
            margin: 40px 0;
        }
        .btn {
            display: inline-block;
            padding: 15px 30px;
            margin: 0 10px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            min-width: 120px;
        }
        .btn-approve {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
        }
        .btn-approve:hover {
            background: linear-gradient(135deg, #45a049, #3d8b40);
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(76, 175, 80, 0.3);
        }
        .btn-reject {
            background: linear-gradient(135deg, #f44336, #da190b);
            color: white;
        }
        .btn-reject:hover {
            background: linear-gradient(135deg, #da190b, #c61208);
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(244, 67, 54, 0.3);
        }
        .btn-preview {
            background: linear-gradient(135deg, #2196F3, #1976D2);
            color: white;
            margin-top: 20px;
            display: block;
            width: 200px;
            margin-left: auto;
            margin-right: auto;
        }
        .btn-preview:hover {
            background: linear-gradient(135deg, #1976D2, #1565C0);
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(33, 150, 243, 0.3);
        }
        .footer {
            background-color: #f1f3f4;
            padding: 25px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .footer p {
            margin: 5px 0;
        }
        .divider {
            height: 2px;
            background: linear-gradient(to right, #667eea, #764ba2);
            margin: 30px 0;
            border-radius: 1px;
        }
        .warning-box {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .warning-box strong {
            color: #B8860B;
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
            <p>A new certificate has been generated and requires your approval. Please review the details below and take appropriate action.</p>
            
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

            <a href="${data.certificatePreviewUrl}" class="btn btn-preview" target="_blank">
                📄 View Certificate Preview
            </a>

            <div class="divider"></div>

            <div class="action-buttons">
                <a href="${data.appBaseUrl}/api/certificate-approval/approve?token=${data.approvalToken}&certificateId=${data.certificateId}" 
                   class="btn btn-approve">
                    ✅ APPROVE
                </a>
                <a href="${data.appBaseUrl}/api/certificate-approval/reject?token=${data.approvalToken}&certificateId=${data.certificateId}" 
                   class="btn btn-reject">
                    ❌ REJECT
                </a>
            </div>

            <div class="warning-box">
                <strong>Note:</strong> If you need to make any changes to the certificate, please log in to the application and edit it manually. These quick action buttons are for approval/rejection only.
            </div>

            <div class="divider"></div>

            <p style="color: #666; font-size: 14px; text-align: center;">
                Need to access the full application? 
                <a href="${data.appBaseUrl}/login" style="color: #667eea; text-decoration: none;">
                    Login to ${data.companyName} Certificate Management System
                </a>
            </p>
        </div>
        
        <div class="footer">
            <p><strong>${data.companyName}</strong></p>
            <p>Certificate Management System</p>
            <p>This is an automated email. Please do not reply directly to this message.</p>
        </div>
    </div>
</body>
</html>
    `
  }

  // Test email configuration
  async testEmailConfiguration(): Promise<boolean> {
    try {
      const transporter = await this.createTransporter()
      await transporter.verify()
      return true
    } catch (error) {
      console.error('Email configuration test failed:', error)
      return false
    }
  }
}

export const emailService = new EmailService()


