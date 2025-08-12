import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    const { certificateData, emailSettings } = await request.json()
    
    if (!certificateData) {
      return NextResponse.json({ error: "Certificate data is required" }, { status: 400 })
    }
    
    const { certificateId, certificateNo, productName, customerName } = certificateData

    if (!certificateId || !certificateNo || !emailSettings) {
      return NextResponse.json({ error: "Required parameters missing" }, { status: 400 })
    }

    if (!emailSettings.certificateApprovalEmail) {
      return NextResponse.json({ error: "Certificate approval email not configured" }, { status: 400 })
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtpHost,
      port: emailSettings.smtpPort,
      secure: emailSettings.smtpPort === 465,
      auth: {
        user: emailSettings.smtpUser,
        pass: emailSettings.smtpPassword
      }
    })

    // Generate approval URLs - use the request origin
    const origin = request.headers.get('origin') || 'http://localhost:3000'
    const approveUrl = `${origin}/certificate-view?id=${certificateId}&action=approve`
    const rejectUrl = `${origin}/certificate-view?id=${certificateId}&action=reject`

    // Email content
    const mailOptions = {
      from: emailSettings.smtpUser,
      to: emailSettings.certificateApprovalEmail,
      subject: `Certificate Approval Required - ${certificateNo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">Certificate Approval Required</h1>
            <div style="height: 3px; background: linear-gradient(to right, #3b82f6, #06b6d4); border-radius: 2px;"></div>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Certificate Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Certificate No:</td>
                <td style="padding: 8px 0; color: #333;">${certificateNo}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Product:</td>
                <td style="padding: 8px 0; color: #333;">${productName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Customer:</td>
                <td style="padding: 8px 0; color: #333;">${customerName}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; margin-bottom: 20px;">Please review and approve or reject this certificate:</p>
            
            <div style="display: inline-block; margin: 0 10px;">
              <a href="${approveUrl}" 
                 style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                ✓ APPROVE
              </a>
            </div>
            
            <div style="display: inline-block; margin: 0 10px;">
              <a href="${rejectUrl}" 
                 style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                ✗ REJECT
              </a>
            </div>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              This email was sent from the Calibre Project certificate management system. 
              If you received this email in error, please contact your system administrator.
            </p>
          </div>
        </div>
      `
    }

    // Send approval email
    await transporter.sendMail(mailOptions)

    return NextResponse.json({ 
      success: true, 
      message: "Approval email sent successfully!",
      recipient: emailSettings.certificateApprovalEmail
    })

  } catch (error) {
    console.error("Error sending approval email:", error)
    return NextResponse.json({ 
      error: "Failed to send approval email", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
