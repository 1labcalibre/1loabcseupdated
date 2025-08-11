import { db } from "@/lib/firebase/config"
import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore"

const COLLECTION = 'settings'

export interface EmailSettings {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  notificationEmails: string[] // L1 notification emails
  certificateApprovalEmail: string // Single email for certificate approvals
  enableEmailApprovals: boolean
}

export interface AppSettings {
  id?: string
  companyInfo: {
    name: string
    address: string
    email: string
    website: string
  }
  emailSettings: EmailSettings
  certificateSettings: {
    invoicePrefix: string
    reportPrefix: string
    defaultShelfLife: number
    testConditions: string
  }
  createdAt?: any
  updatedAt?: any
}

class SettingsService {
  // Get all settings (or create default if none exist)
  async getSettings(): Promise<AppSettings> {
    try {
      const settingsDoc = await getDoc(doc(db, COLLECTION, 'app'))
      
      if (settingsDoc.exists()) {
        return {
          id: settingsDoc.id,
          ...settingsDoc.data()
        } as AppSettings
      } else {
        // Return default settings
        const defaultSettings: AppSettings = {
          companyInfo: {
            name: "Calibre Specialty Elastomers India Pvt. Ltd.",
            address: "204, Vishwakarma Industrial Estate, Bagpat Road, Meerut, 250002. (U.P)",
            email: "calibreelastomers@gmail.com",
            website: "www.calibreelastomers.com"
          },
          emailSettings: {
            smtpHost: "",
            smtpPort: 587,
            smtpUser: "",
            smtpPassword: "",
            notificationEmails: [],
            certificateApprovalEmail: "",
            enableEmailApprovals: false
          },
          certificateSettings: {
            invoicePrefix: "CSE/",
            reportPrefix: "TD",
            defaultShelfLife: 12,
            testConditions: "Test specimens are cured at (2mm) 165°C for 15 mins and (6mm) 165°C for 20 mins in compression molding."
          }
        }
        
        // Save default settings
        await this.updateSettings(defaultSettings)
        return defaultSettings
      }
    } catch (error) {
      console.error('Error getting settings:', error)
      throw error
    }
  }

  // Update settings
  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const settingsData = {
        ...settings,
        updatedAt: new Date()
      }
      
      if (settings.id) {
        delete settingsData.id
        await updateDoc(doc(db, COLLECTION, 'app'), settingsData)
      } else {
        await setDoc(doc(db, COLLECTION, 'app'), {
          ...settingsData,
          createdAt: new Date()
        })
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      throw error
    }
  }

  // Get email settings specifically
  async getEmailSettings(): Promise<EmailSettings> {
    const settings = await this.getSettings()
    return settings.emailSettings
  }

  // Update email settings only
  async updateEmailSettings(emailSettings: Partial<EmailSettings>): Promise<void> {
    const currentSettings = await this.getSettings()
    await this.updateSettings({
      ...currentSettings,
      emailSettings: {
        ...currentSettings.emailSettings,
        ...emailSettings
      }
    })
  }
}

export const settingsService = new SettingsService()


