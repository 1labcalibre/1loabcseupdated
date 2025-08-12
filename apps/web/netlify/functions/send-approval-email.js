const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { certificateData, emailSettings } = JSON.parse(event.body);
    
    if (!certificateData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Certificate data is required" }),
      };
    }
    
    const { certificateId, certificateNo, productName, customerName } = certificateData;

    if (!certificateId || !certificateNo || !emailSettings) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Required parameters missing" }),
      };
    }

    if (!emailSettings.certificateApprovalEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Certificate approval email not configured" }),
      };
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
    });

    // Generate approval URLs - use the current site URL
    const siteUrl = event.headers.origin || 'https://your-site.netlify.app';
    const approveUrl = `${siteUrl}/certificate-view?id=${certificateId}&action=approve`;
    const rejectUrl = `${siteUrl}/certificate-view?id=${certificateId}&action=reject`;

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
    };

    // Send approval email
    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: "Approval email sent successfully!",
        recipient: emailSettings.certificateApprovalEmail
      }),
    };

  } catch (error) {
    console.error("Error sending approval email:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Failed to send approval email", 
        details: error.message || "Unknown error"
      }),
    };
  }
};
