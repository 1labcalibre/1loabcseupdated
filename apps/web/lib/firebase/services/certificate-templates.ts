import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../config'

// Advanced Certificate Template interfaces
export interface LineElement {
  id: string;
  type: 'text' | 'field' | 'image' | 'logo';
  content: string;
  alignment: 'left' | 'center' | 'right';
  style: {
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    color?: string;
    backgroundColor?: string;
    padding?: string;
    width?: string;
  };
  config?: {
    fieldType?: string;
    imageConfig?: {
      src?: string;
      alt?: string;
      alignment?: 'left' | 'center' | 'right';
      width?: string;
      height?: string;
      objectFit?: 'contain' | 'cover' | 'fill';
    };
  };
}

export interface TableConfig {
  headers: string[];
  rows: string[][]; // This will be flattened for Firebase
  borderStyle: 'none' | 'solid' | 'dashed' | 'dotted';
  headerStyle: {
    backgroundColor?: string;
    fontWeight?: string;
    textAlign?: string;
    fontSize?: string;
    padding?: string;
  };
  cellStyle: {
    padding?: string;
    textAlign?: string;
    fontSize?: string;
  };
}

export interface TemplateElement {
  id: string;
  type: 'text' | 'field' | 'table' | 'image' | 'divider' | 'logo' | 'qrcode' | 'barcode' | 'signature' | 'line' | 'header' | 'footer';
  content: string;
  style: {
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
    backgroundColor?: string;
    padding?: string;
    margin?: string;
    border?: string;
    borderRadius?: string;
    width?: string;
    height?: string;
    lineHeight?: string;
    letterSpacing?: string;
  };
  config?: {
    fieldType?: string;
    tableConfig?: TableConfig;
    imageConfig?: {
      src?: string;
      alt?: string;
      alignment?: 'left' | 'center' | 'right';
      width?: string;
      height?: string;
      objectFit?: 'contain' | 'cover' | 'fill';
    };
    signatureConfig?: {
      title?: string;
      showDate?: boolean;
      showName?: boolean;
      showTitle?: boolean;
      alignment?: 'left' | 'center' | 'right';
    };
    lineConfig?: {
      elements: LineElement[];
      height?: string;
      verticalAlign?: 'top' | 'middle' | 'bottom';
    };
  };
}

export interface CertificateSection {
  id: string;
  name: string;
  type: 'header' | 'body' | 'table' | 'signature';
  elements: TemplateElement[];
  layout: {
    columns: number;
    gap: string;
    padding: string;
    backgroundColor: string;
  };
  position: {
    x: number;
    y: number;
    width: string;
  };
}

export interface CertificateTemplate {
  id?: string;
  name: string;
  description?: string;
  sections: CertificateSection[];
  elements?: TemplateElement[]; // Legacy support for old templates
  theme: {
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    backgroundColor: string;
    borderColor: string;
  };
  pageSettings: {
    orientation: 'portrait' | 'landscape';
    size: 'A4' | 'A3' | 'Letter' | 'Legal';
    margins: {
      top: string;
      right: string;
      bottom: string;
      left: string;
    };
  };
  isDefault?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Firebase-safe version (flattened arrays)
interface FirebaseTableConfig extends Omit<TableConfig, 'rows'> {
  rows: string[]; // Flattened rows
  rowCount: number; // Number of rows
  colCount: number; // Number of columns per row
}

interface FirebaseTemplateElement extends Omit<TemplateElement, 'config'> {
  config?: {
    fieldType?: string;
    tableConfig?: FirebaseTableConfig;
    imageConfig?: {
      src?: string;
      alt?: string;
      alignment?: 'left' | 'center' | 'right';
      width?: string;
      height?: string;
      objectFit?: 'contain' | 'cover' | 'fill';
    };
    signatureConfig?: {
      title?: string;
      showDate?: boolean;
      showName?: boolean;
      showTitle?: boolean;
      alignment?: 'left' | 'center' | 'right';
    };
    lineConfig?: {
      elements: LineElement[];
      height?: string;
      verticalAlign?: 'top' | 'middle' | 'bottom';
    };
  };
}

interface FirebaseCertificateSection extends Omit<CertificateSection, 'elements'> {
  elements: FirebaseTemplateElement[];
}

interface FirebaseCertificateTemplate extends Omit<CertificateTemplate, 'sections'> {
  sections: FirebaseCertificateSection[];
}

const COLLECTION = 'certificateTemplates'

// Helper functions to convert between nested arrays and Firebase-safe format
const flattenTableConfig = (tableConfig: TableConfig): FirebaseTableConfig => {
  const flatRows = tableConfig.rows.flat()
  return {
    ...tableConfig,
    rows: flatRows,
    rowCount: tableConfig.rows.length,
    colCount: tableConfig.rows[0]?.length || 0
  }
}

const unflattenTableConfig = (firebaseConfig: FirebaseTableConfig): TableConfig => {
  const rows: string[][] = []
  for (let i = 0; i < firebaseConfig.rowCount; i++) {
    const row = firebaseConfig.rows.slice(i * firebaseConfig.colCount, (i + 1) * firebaseConfig.colCount)
    rows.push(row)
  }
  
  return {
    ...firebaseConfig,
    rows
  }
}

const serializeTemplate = (template: CertificateTemplate): FirebaseCertificateTemplate => {
  if (!template) {
    throw new Error('Template is undefined')
  }
  
  return {
    ...template,
    sections: (template.sections || []).map(section => ({
      ...section,
      elements: (section.elements || []).map(element => {
        if (element.config?.tableConfig) {
          return {
            ...element,
            config: {
              ...element.config,
              tableConfig: flattenTableConfig(element.config.tableConfig)
            }
          }
        }
        return element as FirebaseTemplateElement
      })
    }))
  }
}

const deserializeTemplate = (firebaseTemplate: FirebaseCertificateTemplate): CertificateTemplate => {
  if (!firebaseTemplate) {
    throw new Error('Firebase template is undefined')
  }
  
  const result = {
    ...firebaseTemplate,
    sections: (firebaseTemplate.sections || []).map(section => ({
      ...section,
      elements: (section.elements || []).map(element => {
        if (element.config?.tableConfig) {
          return {
            ...element,
            config: {
              ...element.config,
              tableConfig: unflattenTableConfig(element.config.tableConfig)
            }
          }
        }
        return element as TemplateElement
      })
    }))
  }
  
  // Ensure ID is preserved
  if (firebaseTemplate.id && !result.id) {
    result.id = firebaseTemplate.id
  }
  
  return result
}

export const certificateTemplatesService = {
  // Get all templates
  async getAll() {
    try {
      const q = query(collection(db, COLLECTION), orderBy('name'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => {
        try {
          const docData = doc.data()
          const firebaseTemplate = {
            id: doc.id,
            ...docData
          } as FirebaseCertificateTemplate
          
          // Ensure the ID is always set correctly
          firebaseTemplate.id = doc.id
          
          // Ensure required properties exist
          if (!firebaseTemplate.sections) {
            console.warn(`Template ${doc.id} has no sections, initializing empty array`)
            firebaseTemplate.sections = []
          }
          
          const deserializedTemplate = deserializeTemplate(firebaseTemplate)
          
          // Double-check the ID is preserved after deserialization
          if (!deserializedTemplate.id) {
            console.warn(`Template ${doc.id} lost its ID during deserialization, restoring it`)
            deserializedTemplate.id = doc.id
          }
          
          return deserializedTemplate
        } catch (docError) {
          console.error(`Error deserializing template ${doc.id}:`, docError)
          // Return a minimal valid template instead of crashing
          return {
            id: doc.id,
            name: doc.data().name || 'Corrupted Template',
            description: 'This template has corrupted data',
            sections: [],
            theme: {
              primaryColor: '#3b82f6',
              secondaryColor: '#6b7280',
              textColor: '#1f2937',
              backgroundColor: '#ffffff',
              borderColor: '#d1d5db'
            },
            pageSettings: {
              orientation: 'portrait' as const,
              size: 'A4' as const,
              margins: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
            }
          }
        }
      })
    } catch (error) {
      console.error('Error fetching certificate templates:', error)
      return []
    }
  },

  // Get single template
  async getById(id: string) {
    try {
      const docRef = doc(db, COLLECTION, id)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const firebaseTemplate = {
          id: docSnap.id,
          ...docSnap.data()
        } as FirebaseCertificateTemplate
        return deserializeTemplate(firebaseTemplate)
      }
      return null
    } catch (error) {
      console.error('Error fetching template:', error)
      return null
    }
  },

  // Create or update template
  async save(template: CertificateTemplate) {
    try {
      if (!template) {
        throw new Error('Template is required')
      }
      
      if (!template.name) {
        throw new Error('Template name is required')
      }
      
      // Ensure sections exist
      if (!template.sections) {
        template.sections = []
      }
      
      // Serialize the template to Firebase-safe format
      const serializedTemplate = serializeTemplate(template)
      const templateData = {
        ...serializedTemplate,
        updatedAt: serverTimestamp()
      }
      
      // Remove id from templateData if it exists (Firebase doesn't store document ID in the document)
      delete templateData.id
      
      if (template.id) {
        // Check if document exists first
        const docRef = doc(db, COLLECTION, template.id)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          // Update existing
          await updateDoc(docRef, templateData)
          return template.id
        } else {
          // Document doesn't exist, create it with the given ID
          await setDoc(docRef, {
            ...templateData,
            createdAt: serverTimestamp()
          })
          return template.id
        }
      } else {
        // Create new with auto-generated ID
        const newId = doc(collection(db, COLLECTION)).id
        const docRef = doc(db, COLLECTION, newId)
        await setDoc(docRef, {
          ...templateData,
          createdAt: serverTimestamp()
        })
        return newId
      }
    } catch (error) {
      console.error('Error saving template:', error)
      throw error
    }
  },

  // Delete template
  async delete(id: string) {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Template ID is required for deletion')
      }
      console.log('Attempting to delete template with ID:', id)
      const docRef = doc(db, COLLECTION, id)
      await deleteDoc(docRef)
      console.log('Template deleted successfully:', id)
    } catch (error) {
      console.error('Error deleting template:', error)
      throw error
    }
  },

  // Utility function to fix templates without proper IDs
  async fixCorruptedTemplates() {
    try {
      console.log('Checking for corrupted templates...')
      const snapshot = await getDocs(collection(db, COLLECTION))
      const fixes = []
      
      for (const doc of snapshot.docs) {
        const data = doc.data()
        const needsUpdate = !data.id || data.id !== doc.id
        
        if (needsUpdate) {
          console.log(`Fixing template ${doc.id} - current data.id:`, data.id)
          await updateDoc(doc.ref, { id: doc.id })
          fixes.push(doc.id)
        }
      }
      
      console.log(`Fixed ${fixes.length} corrupted templates:`, fixes)
      return fixes
    } catch (error) {
      console.error('Error fixing corrupted templates:', error)
      throw error
    }
  },

  // Get default template
  async getDefault() {
    try {
      const templates = await this.getAll()
      return templates.find(t => (t as any).isDefault) || templates[0] || null
    } catch (error) {
      console.error('Error fetching default template:', error)
      return null
    }
  }
} 