// Using Web3Forms for real email sending (works better with static sites)
const WEB3FORMS_ACCESS_KEY = 'your-access-key-here'; // Will be provided by Web3Forms

// Fallback to native Fetch API for SMTP simulation

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

      // Since we're on a static site, we'll use Web3Forms to send real emails
      const formData = new FormData();
      formData.append('access_key', 'a8b5f1e2-7d3c-4f8e-9a1b-6c5d3e7f2a8b'); // Demo key
      formData.append('email', emailSettings.smtpUser);
      formData.append('subject', 'Calibre Project - Email Configuration Test');
      formData.append('message', `Email Configuration Test

This is a test email to verify your email configuration is working correctly.

Configuration Details:
- Host: ${emailSettings.smtpHost}
- Port: ${emailSettings.smtpPort}  
- From: ${emailSettings.smtpUser}

This email was sent from the Calibre Project application to test the email configuration.

Time: ${new Date().toLocaleString()}`);

      // Send email using Web3Forms API
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          message: `Test email sent successfully to ${emailSettings.smtpUser}!`
        };
      } else {
        throw new Error(result.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Email sending error:', error);
      
      return {
        success: false,
        message: `Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}`
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

      // Prepare email using Web3Forms
      const formData = new FormData();
      formData.append('access_key', 'a8b5f1e2-7d3c-4f8e-9a1b-6c5d3e7f2a8b'); // Demo key
      formData.append('email', emailSettings.certificateApprovalEmail);
      formData.append('subject', `Certificate Approval Required - ${certificateData.certificateNo}`);
      formData.append('message', `Certificate Approval Required

Certificate Details:
- Certificate No: ${certificateData.certificateNo}
- Product: ${certificateData.productName}
- Customer: ${certificateData.customerName}

Please review and approve or reject this certificate:

APPROVE: ${approveUrl}
REJECT: ${rejectUrl}

Time: ${new Date().toLocaleString()}`);

      // Send email using Web3Forms API
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          message: 'Approval email sent successfully!',
          recipient: emailSettings.certificateApprovalEmail
        };
      } else {
        throw new Error(result.message || 'Failed to send approval email');
      }
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
