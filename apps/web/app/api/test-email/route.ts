import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    const { smtpSettings } = await request.json()

    if (!smtpSettings) {
      return NextResponse.json({ error: "SMTP settings are required" }, { status: 400 })
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpSettings.smtpHost,
      port: smtpSettings.smtpPort,
      secure: smtpSettings.smtpPort === 465,
      auth: {
        user: smtpSettings.smtpUser,
        pass: smtpSettings.smtpPassword
      }
    })

    // Test email content
    const mailOptions = {
      from: smtpSettings.smtpUser,
      to: smtpSettings.smtpUser, // Send to self for testing
      subject: 'Calibre Project - Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Configuration Test</h2>
          <p>This is a test email to verify your SMTP configuration is working correctly.</p>
          <p><strong>SMTP Host:</strong> ${smtpSettings.smtpHost}</p>
          <p><strong>SMTP Port:</strong> ${smtpSettings.smtpPort}</p>
          <p><strong>From:</strong> ${smtpSettings.smtpUser}</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from the Calibre Project application to test the email configuration.
          </p>
        </div>
      `
    }

    // Send test email
    await transporter.sendMail(mailOptions)

    return NextResponse.json({ 
      success: true, 
      message: "Test email sent successfully!" 
    })

  } catch (error) {
    console.error("Error sending test email:", error)
    return NextResponse.json({ 
      error: "Failed to send test email", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}