import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { smtpSettings } = await request.json()

    if (!smtpSettings || !smtpSettings.smtpHost || !smtpSettings.smtpUser) {
      return NextResponse.json(
        { success: false, error: 'SMTP settings are incomplete' },
        { status: 400 }
      )
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpSettings.smtpHost,
      port: smtpSettings.smtpPort,
      secure: smtpSettings.smtpPort === 465,
      auth: {
        user: smtpSettings.smtpUser,
        pass: smtpSettings.smtpPassword,
      },
    })

    // Verify connection
    await transporter.verify()

    // Send test email
    const mailOptions = {
      from: smtpSettings.smtpUser,
      to: smtpSettings.smtpUser, // Send to self for testing
      subject: 'Email Configuration Test - Calibre Certificate System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #667eea;">✅ Email Configuration Test Successful!</h2>
          <p>This is a test email from your Calibre Certificate Management System.</p>
          <p><strong>SMTP Configuration Details:</strong></p>
          <ul>
            <li>Host: ${smtpSettings.smtpHost}</li>
            <li>Port: ${smtpSettings.smtpPort}</li>
            <li>Username: ${smtpSettings.smtpUser}</li>
            <li>Secure: ${smtpSettings.smtpPort === 465 ? 'Yes' : 'No'}</li>
          </ul>
          <p>If you received this email, your email configuration is working correctly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            This is an automated test email from Calibre Certificate Management System.
          </p>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully! Check your inbox.'
    })

  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send test email'
      },
      { status: 500 }
    )
  }
}
