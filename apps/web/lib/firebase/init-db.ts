import { db } from './config'
import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore'

// Initialize default data structures
export async function initializeDatabase() {
  const batch = writeBatch(db)

  // Create default products
  const defaultProducts = [
    {
      id: 'TD200',
      name: 'TD200',
      category: 'Elastomer',
      attributes: [
        { name: 'Hardness', method: 'ASTM D2240', unit: 'Shore A', min: 70, max: 80 },
        { name: 'Tensile Strength', method: 'ASTM D412', unit: 'MPa', min: 15, max: 25 },
        { name: 'Elongation', method: 'ASTM D412', unit: '%', min: 300, max: 500 },
        { name: 'Tear Strength', method: 'ASTM D624', unit: 'kN/m', min: 30, max: 50 },
        { name: 'Compression Set', method: 'ASTM D395', unit: '%', min: 0, max: 25 }
      ],
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: 'TD300',
      name: 'TD300',
      category: 'Elastomer',
      attributes: [
        { name: 'Hardness', method: 'ASTM D2240', unit: 'Shore A', min: 80, max: 90 },
        { name: 'Tensile Strength', method: 'ASTM D412', unit: 'MPa', min: 20, max: 30 },
        { name: 'Elongation', method: 'ASTM D412', unit: '%', min: 250, max: 400 },
        { name: 'Tear Strength', method: 'ASTM D624', unit: 'kN/m', min: 40, max: 60 },
        { name: 'Compression Set', method: 'ASTM D395', unit: '%', min: 0, max: 20 }
      ],
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  ]

  // Add products to batch
  defaultProducts.forEach(product => {
    const productRef = doc(db, 'products', product.id)
    batch.set(productRef, product)
  })

  // Create default certificate template
  const defaultTemplate = {
    id: 'default',
    name: 'Standard Certificate Template',
    elements: [
      {
        id: '1',
        type: 'header',
        content: 'CERTIFICATE OF ANALYSIS',
        style: {
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: '20px',
          marginBottom: '20px'
        }
      },
      {
        id: '2',
        type: 'text',
        content: 'Calibre Specialty Elastomers India Pvt. Ltd.',
        style: {
          fontSize: '16px',
          textAlign: 'center',
          marginBottom: '30px'
        }
      },
      {
        id: '3',
        type: 'field',
        content: '{{customerName}}',
        config: { fieldType: 'customerName' }
      },
      {
        id: '4',
        type: 'table',
        content: '',
        config: {
          columns: ['Attribute', 'Test Method', 'Unit', 'Range', 'Obtained Value'],
          showBorder: true
        }
      },
      {
        id: '5',
        type: 'signature',
        content: '',
        config: {
          title: 'Authorized Signatory',
          showDate: true
        }
      }
    ],
    pageSettings: {
      orientation: 'portrait',
      margin: '20px'
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  const templateRef = doc(db, 'certificateTemplates', defaultTemplate.id)
  batch.set(templateRef, defaultTemplate)

  // Create system settings
  const systemSettings = {
    companyName: 'Calibre Specialty Elastomers India Pvt. Ltd.',
    companyAddress: 'Your Company Address',
    companyPhone: '+91 XXXXXXXXXX',
    companyEmail: 'info@calibre.com',
    certificatePrefix: 'COA',
    reportPrefix: 'RPT',
    sessionTimeout: 30, // minutes
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  const settingsRef = doc(db, 'settings', 'system')
  batch.set(settingsRef, systemSettings)

  // Commit all changes
  try {
    await batch.commit()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

// Collection structure reference
export const collections = {
  users: 'users',
  products: 'products',
  testData: 'testData',
  batches: 'batches',
  certificates: 'certificates',
  certificateTemplates: 'certificateTemplates',
  auditTrail: 'auditTrail',
  workflows: 'workflows',
  settings: 'settings',
  pendingApprovals: 'pendingApprovals'
} 