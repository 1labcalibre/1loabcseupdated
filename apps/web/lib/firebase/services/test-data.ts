import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config'

// Machine-specific test interfaces
export interface G1Tests {
  hardness?: number
  density?: number
  completedBy: string
  completedById?: string // UUID of the user who completed this test
  completedAt?: any
  [key: string]: any // Allow dynamic property access
}

export interface G2Tests {
  ts1?: number
  ts2?: number
  ts3?: number
  ts4?: number
  elongation1?: number
  elongation2?: number
  elongation3?: number
  elongation4?: number
  tearStrength?: number
  completedBy: string
  completedById?: string // UUID of the user who completed this test
  completedAt?: any
  [key: string]: any // Allow dynamic property access
}

export interface G3Tests {
  mooneyViscosity?: number
  rheoTS2Min?: number
  rheoTS2Sec?: number
  rheoTC90Min?: number
  rheoTC90Sec?: number
  completedBy: string
  completedById?: string // UUID of the user who completed this test
  completedAt?: any
  [key: string]: any // Allow dynamic property access
}

export type TestStatus = 'pending_g1' | 'pending_g2' | 'pending_g3' | 'completed' | 'hold'

export interface TestData {
  id?: string
  referenceNo: string // Unique identifier (e.g., AN27-1801A2)
  productId: string
  productName: string
  productCode: string // For reference number generation
  batchNo: string
  shift: 'A' | 'B' | 'C'
  testDate: string
  testTime: string
  
  // Machine-specific test data
  g1Tests?: G1Tests
  g2Tests?: G2Tests
  g3Tests?: G3Tests
  
  // Workflow status
  status: TestStatus
  currentStage: 'G1' | 'G2' | 'G3' | 'COMPLETED' | 'HOLD'
  
  // Hold information
  isHold?: boolean
  holdReason?: string
  holdBy?: string
  holdAt?: any
  outOfRangeValues?: Record<string, { value: number, expected: string, actual: string }>
  
  // Legacy fields for backward compatibility
  operator?: string
  line?: string
  recordNo?: string
  shiftIncharge?: string
  weight?: string // Added for certificate generation
  values?: Record<string, number> // Will be migrated to machine-specific tests
  
  // Edit/Release tracking
  editedBy?: string
  editedAt?: any
  releasedBy?: string
  releasedAt?: any
  
  // Metadata
  createdAt?: any
  updatedAt?: any
  createdBy?: string
}

// Helper function to generate reference number
export function generateReferenceNo(productCode: string, shift: string, batchNo: string): string {
  const date = new Date()
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${productCode}-${day}${month}${shift}${batchNo}`
}

// Helper function to determine next stage
export function getNextStage(currentStage: string): TestStatus {
  switch (currentStage) {
    case 'G1':
      return 'pending_g2'
    case 'G2':
      return 'pending_g3'
    case 'G3':
      return 'completed'
    default:
      return 'pending_g1'
  }
}

const COLLECTION = 'testData'

export const testDataService = {
  // Get all test data
  async getAll() {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION))
      const testData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestData[]
      
      // Sort manually by createdAt
      return testData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB.getTime() - dateA.getTime()
      })
    } catch (error) {
      console.error('Error in getAll:', error)
      throw error
    }
  },

  // Get test data by reference number
  async getByReferenceNo(referenceNo: string) {
    const q = query(
      collection(db, COLLECTION),
      where('referenceNo', '==', referenceNo)
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    
    const doc = snapshot.docs[0]
    if (!doc) return null
    return { id: doc.id, ...doc.data() } as TestData
  },

  // Get pending tests for a specific machine
  async getPendingForMachine(machine: 'G1' | 'G2' | 'G3') {
    const status = `pending_${machine.toLowerCase()}` as TestStatus
    const q = query(
      collection(db, COLLECTION),
      where('status', '==', status)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TestData[]
  },

  // Get test data by product
  async getByProduct(productId: string) {
    try {
      const q = query(
        collection(db, COLLECTION),
        where('productId', '==', productId)
      )
      const snapshot = await getDocs(q)
      const testData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestData[]
      
      // Sort manually by createdAt
      return testData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB.getTime() - dateA.getTime()
      })
    } catch (error) {
      console.error('Error in getByProduct:', error)
      throw error
    }
  },

  // Get test data by batch
  async getByBatch(batchNo: string) {
    const q = query(
      collection(db, COLLECTION),
      where('batchNo', '==', batchNo)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TestData[]
  },

  // Get single test data
  async getById(id: string) {
    const docRef = doc(db, COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as TestData
    }
    return null
  },

  // Create new test data (initiated by G1)
  async create(testData: Omit<TestData, 'id'>, userId: string) {
    const data = {
      ...testData,
      status: 'pending_g1' as TestStatus,
      currentStage: 'G1',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId
    }
    const docRef = await addDoc(collection(db, COLLECTION), data)
    return docRef.id
  },

  // Update G1 tests
  async updateG1Tests(id: string, g1Tests: Omit<G1Tests, 'completedAt'>, userId: string) {
    const docRef = doc(db, COLLECTION, id)
    const testDoc = await getDoc(docRef)
    const testData = testDoc.data() as TestData
    
    // Update G1 tests with user ID
    await updateDoc(docRef, {
      g1Tests: {
        ...g1Tests,
        completedBy: userId,
        completedById: userId, // Store the user's UUID
        completedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    })
    
    // Check if all tests are complete
    await this.updateTestStatus(id)
  },

  // Update G2 tests
  async updateG2Tests(id: string, g2Tests: Omit<G2Tests, 'completedAt'>, userId: string) {
    const docRef = doc(db, COLLECTION, id)
    const testDoc = await getDoc(docRef)
    const testData = testDoc.data() as TestData
    
    // Update G2 tests with user ID
    await updateDoc(docRef, {
      g2Tests: {
        ...g2Tests,
        completedBy: userId,
        completedById: userId, // Store the user's UUID
        completedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    })
    
    // Check if all tests are complete
    await this.updateTestStatus(id)
  },

  // Update G3 tests
  async updateG3Tests(id: string, g3Tests: Omit<G3Tests, 'completedAt'>, userId: string) {
    const docRef = doc(db, COLLECTION, id)
    const testDoc = await getDoc(docRef)
    const testData = testDoc.data() as TestData
    
    // Update G3 tests with user ID
    await updateDoc(docRef, {
      g3Tests: {
        ...g3Tests,
        completedBy: userId,
        completedById: userId, // Store the user's UUID
        completedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    })
    
    // Check if all tests are complete
    await this.updateTestStatus(id)
  },

  // Update test status based on completed tests
  async updateTestStatus(id: string) {
    const docRef = doc(db, COLLECTION, id)
    const testDoc = await getDoc(docRef)
    const testData = testDoc.data() as TestData
    
    // Check which tests are completed
    const hasG1 = !!testData.g1Tests?.completedAt
    const hasG2 = !!testData.g2Tests?.completedAt
    const hasG3 = !!testData.g3Tests?.completedAt
    
    let newStatus: TestStatus = 'pending_g1'
    let newStage: string = 'G1'
    
    // Determine new status based on what's missing
    if (!hasG1) {
      newStatus = 'pending_g1'
      newStage = 'G1'
    } else if (!hasG2) {
      newStatus = 'pending_g2'
      newStage = 'G2'
    } else if (!hasG3) {
      newStatus = 'pending_g3'
      newStage = 'G3'
    } else {
      // All tests completed
      newStatus = 'completed'
      newStage = 'COMPLETED'
    }
    
    // Update status if changed
    if (testData.status !== newStatus) {
      await updateDoc(docRef, {
        status: newStatus,
        currentStage: newStage,
        updatedAt: serverTimestamp()
      })
    }
  },

  // Update reference number (L1 only)
  async updateReferenceNo(id: string, newReferenceNo: string) {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      referenceNo: newReferenceNo,
      updatedAt: serverTimestamp()
    })
  },

  // Legacy update method for backward compatibility
  async update(id: string, testData: Partial<TestData>) {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      ...testData,
      updatedAt: serverTimestamp()
    })
  },

  // Delete test data
  async delete(id: string) {
    const docRef = doc(db, COLLECTION, id)
    await deleteDoc(docRef)
  },

  // Subscribe to test data changes
  subscribe(callback: (testData: TestData[]) => void) {
    return onSnapshot(collection(db, COLLECTION), (snapshot) => {
      const testData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestData[]
      
      // Sort manually by createdAt
      const sortedData = testData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB.getTime() - dateA.getTime()
      })
      
      callback(sortedData)
    })
  },

  // Subscribe to pending tests for a specific machine
  subscribeToPendingTests(machine: 'G1' | 'G2' | 'G3', callback: (testData: TestData[]) => void) {
    const status = `pending_${machine.toLowerCase()}` as TestStatus
    const q = query(
      collection(db, COLLECTION),
      where('status', '==', status)
    )
    
    return onSnapshot(q, (snapshot) => {
      const testData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestData[]
      
      // Sort by createdAt descending (newest first)
      const sortedData = testData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB.getTime() - dateA.getTime()
      })
      
      callback(sortedData)
    })
  },

  // Get statistics for completed tests
  async getCompletedStatistics(referenceNo: string) {
    const testData = await this.getByReferenceNo(referenceNo)
    if (!testData || testData.status !== 'completed') {
      return null
    }

    // Compile all test values
    const allTests = {
      ...(testData.g1Tests || {}),
      ...(testData.g2Tests || {}),
      ...(testData.g3Tests || {})
    }

    // Remove metadata fields
    delete allTests.completedBy
    delete allTests.completedAt

    return allTests
  },

  // Mark test as hold
  async markAsHold(
    id: string, 
    holdReason: string, 
    holdBy: string, 
    outOfRangeValues: Record<string, { value: number, expected: string, actual: string }>
  ) {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      status: 'hold',
      currentStage: 'HOLD',
      isHold: true,
      holdReason,
      holdBy,
      holdAt: serverTimestamp(),
      outOfRangeValues,
      updatedAt: serverTimestamp()
    })
  },

  // Get all hold tests (for admin view)
  async getHoldTests() {
    try {
      const q = query(
        collection(db, COLLECTION), 
        where('isHold', '==', true)
      )
      const snapshot = await getDocs(q)
      const holdTests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestData[]
      
      // Sort manually by holdAt (most recent first)
      holdTests.sort((a, b) => {
        if (!a.holdAt && !b.holdAt) return 0
        if (!a.holdAt) return 1
        if (!b.holdAt) return -1
        
        const aTime = a.holdAt.toDate ? a.holdAt.toDate().getTime() : new Date(a.holdAt).getTime()
        const bTime = b.holdAt.toDate ? b.holdAt.toDate().getTime() : new Date(b.holdAt).getTime()
        return bTime - aTime
      })
      
      console.log('Hold tests found:', holdTests.length, holdTests)
      return holdTests
    } catch (error) {
      console.error('Error in getHoldTests:', error)
      throw error
    }
  },

  // Get history of tests that were previously on hold (released or edited)
  async getHoldHistory() {
    try {
      const q = query(
        collection(db, COLLECTION),
        where('holdAt', '!=', null) // Tests that were once on hold
      )
      const snapshot = await getDocs(q)
      const historyTests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestData[]

      console.log('All tests with holdAt:', historyTests.length, historyTests.map(t => ({
        id: t.id,
        referenceNo: t.referenceNo,
        isHold: t.isHold,
        editedBy: t.editedBy,
        editedAt: t.editedAt,
        releasedBy: t.releasedBy,
        releasedAt: t.releasedAt,
        holdAt: t.holdAt
      })))

      // Filter to only include tests that have been acted upon (released or edited)
      const actionedTests = historyTests.filter(test => {
        const hasBeenEdited = test.editedBy && test.editedAt
        const hasBeenReleased = test.releasedBy && test.releasedAt
        const wasOnHoldButNotAnymore = !test.isHold && test.holdAt
        
        const shouldInclude = hasBeenEdited || hasBeenReleased || wasOnHoldButNotAnymore
        
        if (shouldInclude) {
          console.log(`Including in history: ${test.referenceNo}`, {
            hasBeenEdited,
            hasBeenReleased,
            wasOnHoldButNotAnymore,
            isHold: test.isHold
          })
        }
        
        return shouldInclude
      })

      // Sort by most recent action (editedAt, releasedAt, or holdAt)
      actionedTests.sort((a, b) => {
        const aTime = this.getLatestActionTime(a)
        const bTime = this.getLatestActionTime(b)
        return bTime - aTime
      })

      console.log('Hold history found:', actionedTests.length, actionedTests)
      return actionedTests
    } catch (error) {
      console.error('Error in getHoldHistory:', error)
      throw error
    }
  },

  // Helper function to get the latest action time for sorting
  getLatestActionTime(test: TestData): number {
    const times = []
    
    if (test.editedAt) {
      times.push(test.editedAt.toDate ? test.editedAt.toDate().getTime() : new Date(test.editedAt).getTime())
    }
    if (test.releasedBy && test.releasedAt) {
      times.push(test.releasedAt.toDate ? test.releasedAt.toDate().getTime() : new Date(test.releasedAt).getTime())
    }
    if (test.holdAt) {
      times.push(test.holdAt.toDate ? test.holdAt.toDate().getTime() : new Date(test.holdAt).getTime())
    }
    
    return times.length > 0 ? Math.max(...times) : 0
  },

  // Update edited test values (admin only)
  async updateEditedTestValues(id: string, editedValues: Record<string, string>, editedBy: string) {
    const docRef = doc(db, COLLECTION, id)
    const testDoc = await getDoc(docRef)
    
    if (!testDoc.exists()) {
      throw new Error('Test not found')
    }
    
    const testData = testDoc.data() as TestData
    const updates: any = {
      editedBy,
      editedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    // Update values in the appropriate machine test objects
    if (testData.g1Tests) {
      const g1Updates: any = { ...testData.g1Tests }
      Object.entries(editedValues).forEach(([key, value]) => {
        if (['hardness', 'density'].includes(key)) {
          g1Updates[key] = parseFloat(value)
        }
      })
      updates.g1Tests = g1Updates
    }
    
    if (testData.g2Tests) {
      const g2Updates: any = { ...testData.g2Tests }
      Object.entries(editedValues).forEach(([key, value]) => {
        if (['ts1', 'ts2', 'ts3', 'ts4', 'elongation1', 'elongation2', 'elongation3', 'elongation4', 'tearStrength'].includes(key)) {
          g2Updates[key] = parseFloat(value)
        }
      })
      updates.g2Tests = g2Updates
    }
    
    if (testData.g3Tests) {
      const g3Updates: any = { ...testData.g3Tests }
      Object.entries(editedValues).forEach(([key, value]) => {
        if (['mooneyViscosity', 'rheoTS2Min', 'rheoTS2Sec', 'rheoTC90Min', 'rheoTC90Sec'].includes(key)) {
          if (key === 'rheoTS2Min') {
            g3Updates[key] = parseFloat(value)
            g3Updates['rheoTS2Sec'] = parseFloat(value) * 60
          } else if (key === 'rheoTC90Min') {
            g3Updates[key] = parseFloat(value)
            g3Updates['rheoTC90Sec'] = parseFloat(value) * 60
          } else {
            g3Updates[key] = parseFloat(value)
          }
        }
      })
      updates.g3Tests = g3Updates
    }
    
    await updateDoc(docRef, updates)
  },

  // Release from hold (admin only)
  async releaseFromHold(id: string, releasedBy: string) {
    const docRef = doc(db, COLLECTION, id)
    const testDoc = await getDoc(docRef)
    
    if (!testDoc.exists()) {
      throw new Error('Test not found')
    }
    
    const testData = testDoc.data() as TestData
    
    // Determine the correct status based on completed tests
    let newStatus: TestStatus = 'pending_g1'
    let newStage: 'G1' | 'G2' | 'G3' | 'COMPLETED' = 'G1'
    
    if (testData.g1Tests && testData.g2Tests && testData.g3Tests) {
      newStatus = 'completed'
      newStage = 'COMPLETED'
    } else if (testData.g1Tests && testData.g2Tests) {
      newStatus = 'pending_g3'
      newStage = 'G3'
    } else if (testData.g1Tests) {
      newStatus = 'pending_g2'
      newStage = 'G2'
    }
    
    await updateDoc(docRef, {
      status: newStatus,
      currentStage: newStage,
      isHold: false,
      holdReason: null,
      holdBy: null,
      // Keep holdAt for history purposes - don't set to null
      outOfRangeValues: null,
      releasedBy,
      releasedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }
} 

