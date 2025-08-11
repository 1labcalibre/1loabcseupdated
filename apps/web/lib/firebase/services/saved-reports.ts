import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config'

export interface SavedReport {
  id?: string
  name: string
  productId: string
  productName: string
  line: string
  recordsCount: number
  statistics: any
  testDataIds: string[]
  // Enhanced data for certificate generation
  testData: {
    referenceNumbers: string[]
    dateRange: {
      from: string
      to: string
    }
    batchNumbers: string[]
    completedMachines: string[] // ['G1', 'G2', 'G3']
  }
  // Quality assurance
  qualityInfo: {
    allTestsCompleted: boolean
    holdItemsExcluded: boolean
    validationStatus: 'passed' | 'failed'
    totalSamples: number
  }
  filters: {
    fromDate: string
    toDate: string
    line: string
  }
  // User and timestamp info
  createdBy: string
  createdByEmail: string
  createdAt?: any
  updatedAt?: any
  // Certificate generation metadata
  certificateReady: boolean
  reportVersion: string
}

const COLLECTION = 'savedReports'

export const savedReportsService = {
  // Get all saved reports
  async getAll() {
    try {
      const q = query(
        collection(db, COLLECTION),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedReport[]
    } catch (error) {
      console.error('Error fetching saved reports:', error)
      return []
    }
  },

  // Get reports from last month
  async getLastMonth() {
    try {
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      
      const q = query(
        collection(db, COLLECTION),
        where('createdAt', '>=', Timestamp.fromDate(oneMonthAgo)),
        orderBy('createdAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      })) as SavedReport[]
    } catch (error) {
      console.error('Error fetching last month reports:', error)
      return []
    }
  },

  // Search reports by name
  async searchByName(searchTerm: string) {
    try {
      // Firestore doesn't support full-text search, so we'll get all and filter
      const allReports = await this.getAll()
      return allReports.filter(report => 
        report.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    } catch (error) {
      console.error('Error searching reports:', error)
      return []
    }
  },

  // Get a single report
  async getById(id: string) {
    try {
      const docRef = doc(db, COLLECTION, id)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as SavedReport
      }
      return null
    } catch (error) {
      console.error('Error fetching report:', error)
      return null
    }
  },

  // Save a new report
  async create(report: Omit<SavedReport, 'id'>) {
    try {
      const docRef = doc(collection(db, COLLECTION))
      const reportData = {
        ...report,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      await setDoc(docRef, reportData)
      return docRef.id
    } catch (error) {
      console.error('Error creating report:', error)
      throw error
    }
  },

  // Update a report
  async update(id: string, updates: Partial<SavedReport>) {
    try {
      const docRef = doc(db, COLLECTION, id)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating report:', error)
      throw error
    }
  },

  // Delete a report
  async delete(id: string) {
    try {
      const docRef = doc(db, COLLECTION, id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error deleting report:', error)
      throw error
    }
  },

  // Get unique report names for autocomplete
  async getUniqueReportNames() {
    try {
      const reports = await this.getAll()
      const uniqueNames = [...new Set(reports.map(r => r.name))]
      return uniqueNames.sort()
    } catch (error) {
      console.error('Error fetching unique names:', error)
      return []
    }
  }
} 

