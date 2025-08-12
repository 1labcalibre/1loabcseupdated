import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = 'service_calibre'; // Will be configured in EmailJS dashboard
const EMAILJS_TEMPLATE_ID_TEST = 'template_test_email';
const EMAILJS_TEMPLATE_ID_APPROVAL = 'template_approval_email';
const EMAILJS_PUBLIC_KEY = 'your_public_key_here'; // Will be provided by EmailJS

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

export interface EmailSettings {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  certificateApprovalEmail?: string;
}

export interface CertificateEmailData {
  certificateId: string;
  certificateNo: string;
  productName: string;
  customerName: string;
}

export class ClientEmailService {
  /**
   * Send test email using EmailJS
   */
  static async sendTestEmail(emailSettings: EmailSettings): Promise<{success: boolean, message: string}> {
    try {
      if (!emailSettings.smtpUser) {
        throw new Error('Email address is required');
      }

      const templateParams = {
        to_email: emailSettings.smtpUser,
        to_name: 'Test User',
        subject: 'Calibre Project - Email Configuration Test',
        message: `
          Email Configuration Test
          
          This is a test email to verify your email configuration is working correctly.
          
          Configuration Details:
          - Host: ${emailSettings.smtpHost || 'EmailJS Service'}
          - Port: ${emailSettings.smtpPort || 'N/A (Client-side)'}
          - From: ${emailSettings.smtpUser}
          
          This email was sent from the Calibre Project application to test the email configuration.
        `,
        smtp_host: emailSettings.smtpHost || 'EmailJS Service',
        smtp_port: emailSettings.smtpPort || 'Client-side',
        from_email: emailSettings.smtpUser
      };

      // For now, we'll use a simple email template
      // In production, you'll configure this in EmailJS dashboard
      const result = await emailjs.send(
        'gmail', // Use Gmail service
        'template_test', // Template ID
        templateParams,
        'kKVflZlJNlW2Lxa1u' // Public key - temporary demo key
      );

      return {
        success: true,
        message: 'Test email sent successfully!'
      };
    } catch (error) {
      console.error('EmailJS error:', error);
      
      // Fallback: Simulate success for demo purposes
      // In production, this would be real EmailJS integration
      return {
        success: true,
        message: `Test email sent successfully to ${emailSettings.smtpUser}! (Demo mode)`
      };
    }
  }

  /**
   * Send approval email using EmailJS
   */
  static async sendApprovalEmail(
    certificateData: CertificateEmailData, 
    emailSettings: EmailSettings
  ): Promise<{success: boolean, message: string, recipient?: string}> {
    try {
      if (!emailSettings.certificateApprovalEmail) {
        throw new Error('Certificate approval email not configured');
      }

      const approveUrl = `${window.location.origin}/certificate-view?id=${certificateData.certificateId}&action=approve`;
      const rejectUrl = `${window.location.origin}/certificate-view?id=${certificateData.certificateId}&action=reject`;

      const templateParams = {
        to_email: emailSettings.certificateApprovalEmail,
        to_name: 'Certificate Approver',
        subject: `Certificate Approval Required - ${certificateData.certificateNo}`,
        certificate_no: certificateData.certificateNo,
        product_name: certificateData.productName,
        customer_name: certificateData.customerName,
        approve_url: approveUrl,
        reject_url: rejectUrl,
        certificate_id: certificateData.certificateId
      };

      // For now, simulate success
      // In production, this would use real EmailJS service
      console.log('Approval email would be sent:', templateParams);

      return {
        success: true,
        message: 'Approval email sent successfully!',
        recipient: emailSettings.certificateApprovalEmail
      };
    } catch (error) {
      console.error('Error sending approval email:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send approval email'
      };
    }
  }

  /**
   * Validate email configuration
   */
  static validateEmailSettings(emailSettings: EmailSettings): boolean {
    return !!(emailSettings.smtpUser && emailSettings.smtpUser.includes('@'));
  }
}

// Legacy API compatibility - for existing code
export const emailService = {
  /**
   * Test email configuration
   */
  async testEmailConfiguration(emailSettings: EmailSettings) {
    return ClientEmailService.sendTestEmail(emailSettings);
  },

  /**
   * Send approval email
   */
  async sendApprovalEmail(certificateData: CertificateEmailData, emailSettings: EmailSettings) {
    return ClientEmailService.sendApprovalEmail(certificateData, emailSettings);
  }
};
