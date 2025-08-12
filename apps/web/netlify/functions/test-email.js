const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  console.log('Netlify Function: test-email called');
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
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Request body is required" }),
      };
    }

    const { smtpSettings } = JSON.parse(event.body);

    if (!smtpSettings) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "SMTP settings are required" }),
      };
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
    });

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
    };

    // Send test email
    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: "Test email sent successfully!" 
      }),
    };

  } catch (error) {
    console.error("Error sending test email:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Failed to send test email", 
        details: error.message || "Unknown error"
      }),
    };
  }
};
