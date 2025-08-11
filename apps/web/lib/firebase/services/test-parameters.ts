import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../config'

export interface TestParameter {
  id?: string
  name: string
  unit: string
  method?: string
  order: number
  isCalculated?: boolean
  calculationFormula?: string
  active: boolean
  createdAt?: any
  updatedAt?: any
}

const COLLECTION = 'testParameters'
const SETTINGS_DOC = 'settings'

export const testParametersService = {
  // Get all test parameters
  async getAll() {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION))
      const parameters = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestParameter[]
      
      // Sort by order
      return parameters.sort((a, b) => a.order - b.order)
    } catch (error) {
      console.error('Error fetching test parameters:', error)
      return []
    }
  },

  // Get active test parameters only
  async getActive() {
    const allParams = await this.getAll()
    return allParams.filter(p => p.active)
  },

  // Create or update parameter
  async save(parameter: TestParameter) {
    const id = parameter.id || parameter.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const docRef = doc(db, COLLECTION, id)
    
    const data = {
      ...parameter,
      updatedAt: serverTimestamp()
    }
    
    if (!parameter.id) {
      data.createdAt = serverTimestamp()
    }
    
    await setDoc(docRef, data)
    return id
  },

  // Delete parameter
  async delete(id: string) {
    const docRef = doc(db, COLLECTION, id)
    await deleteDoc(docRef)
  },

  // Initialize default parameters
  async initializeDefaults() {
    const defaultParameters: Omit<TestParameter, 'id'>[] = [
      { name: 'Hardness (ShA)', unit: 'ShA', method: 'ASTM D2240', order: 1, active: true },
      { name: 'Density', unit: 'g/cm³', method: 'ASTM D792', order: 2, active: true },
      { name: 'TS-1', unit: 'MPa', method: 'ISO 37', order: 3, active: true },
      { name: 'TS-2', unit: 'MPa', method: 'ISO 37', order: 4, active: true },
      { name: 'TS-3', unit: 'MPa', method: 'ISO 37', order: 5, active: true },
      { name: 'TS-4', unit: 'MPa', method: 'ISO 37', order: 6, active: true },
      { name: 'Elongation %1', unit: '%', method: 'ISO 37', order: 7, active: true },
      { name: 'Elongation %2', unit: '%', method: 'ISO 37', order: 8, active: true },
      { name: 'Elongation %3', unit: '%', method: 'ISO 37', order: 9, active: true },
      { name: 'Elongation %4', unit: '%', method: 'ISO 37', order: 10, active: true },
      { name: 'Tear Strength', unit: 'N/mm', method: 'DIN 53507', order: 11, active: true },
      { name: 'Mooney Viscosity', unit: 'MU', method: 'ISO 289', order: 12, active: true },
      { name: 'Rheo (TS2)', unit: 'min', method: 'ISO 6502', order: 13, active: true },
      { name: 'TS2', unit: 'sec', method: 'Calculated', order: 14, isCalculated: true, calculationFormula: 'Rheo (TS2) * 60', active: true },
      { name: 'Rheo (TC90)', unit: 'min', method: 'ISO 6502', order: 15, active: true },
      { name: 'TC90', unit: 'sec', method: 'Calculated', order: 16, isCalculated: true, calculationFormula: 'Rheo (TC90) * 60', active: true }
    ]

    for (const param of defaultParameters) {
      await this.save(param)
    }
  }
} 