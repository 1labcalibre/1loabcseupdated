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
  onSnapshot
} from 'firebase/firestore'
import { db } from '../config'

export interface Certificate {
  id?: string
  certificateNo: string
  productId: string
  productName: string
  batchNo: string
  customerName: string
  customerAddress: string
  invoiceNo: string
  supplyQuantity: string
  lotNo: string
  testData: {
    attributes: Array<{
      name: string
      method: string
      unit: string
      range: string
      obtainedValue: string
    }>
  }
  manualTestData?: Array<{
    name: string
    method: string
    unit: string
    specification: string
    obtainedValue: string
    isWithinRange: boolean
  }>
  netWeight?: string
  shelfLife?: string
  issueDate: string
  expiryDate?: string
  status: 'draft' | 'awaiting_authentication' | 'approved' | 'rejected' | 'issued' | 'cancelled'
  templateId: string
  createdAt?: any
  updatedAt?: any
  createdBy?: string
  approvedBy?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  updatedBy?: string
  approvedAt?: any
  // Email approval tracking
  approvalEmailSent?: boolean
  approvalEmailSentAt?: any
  approvalToken?: string
  approvedVia?: 'manual' | 'email'
  rejectedVia?: 'manual' | 'email'
}

const COLLECTION = 'certificates'

export const certificatesService = {
  // Get all certificates
  async getAll() {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Certificate[]
  },

  // Get certificates by product
  async getByProduct(productId: string) {
    const q = query(
      collection(db, COLLECTION),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Certificate[]
  },

  // Get certificates by customer
  async getByCustomer(customerName: string) {
    const q = query(
      collection(db, COLLECTION),
      where('customerName', '==', customerName),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Certificate[]
  },

  // Get single certificate
  async getById(id: string) {
    const docRef = doc(db, COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Certificate
    }
    return null
  },

  // Generate certificate number
  async generateCertificateNo() {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    
    // Get count of certificates this month
    const startOfMonth = new Date(year, new Date().getMonth(), 1)
    const q = query(
      collection(db, COLLECTION),
      where('createdAt', '>=', startOfMonth)
    )
    const snapshot = await getDocs(q)
    const count = snapshot.size + 1
    
    return `COA-${year}${month}-${String(count).padStart(4, '0')}`
  },

  // Create certificate
  async create(certificate: Omit<Certificate, 'id'>, userId: string) {
    const certificateNo = await this.generateCertificateNo()
    const data = {
      ...certificate,
      certificateNo,
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId
    }
    const docRef = await addDoc(collection(db, COLLECTION), data)
    return { id: docRef.id, certificateNo }
  },

  // Reject certificate
  async reject(id: string, rejectedBy: string, reason: string = "Rejected") {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      status: 'rejected',
      rejectedBy,
      rejectedAt: serverTimestamp(),
      rejectionReason: reason,
      updatedAt: serverTimestamp()
    })
  },

  // Issue certificate
  async issue(id: string, userId: string) {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      status: 'issued',
      approvedBy: userId,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  },

  // Update certificate
  async update(id: string, updates: Partial<Certificate>) {
    const docRef = doc(db, COLLECTION, id)
    
    // Filter out undefined values to prevent Firebase errors
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    )
    
    await updateDoc(docRef, {
      ...cleanedUpdates,
      updatedAt: serverTimestamp()
    })
  },

  // Approve certificate
  async approve(id: string, approvedBy: string) {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      status: 'approved',
      approvedBy,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  },

  // Get certificates awaiting approval
  async getAwaitingApproval() {
    try {
      // First try with orderBy, if it fails due to index, fallback to simple query
      let q = query(
        collection(db, COLLECTION), 
        where('status', '==', 'awaiting_authentication'),
        orderBy('createdAt', 'desc')
      )
      
      try {
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Certificate[]
      } catch (indexError) {
        console.log('Using fallback query without orderBy due to missing index')
        // Fallback to simple query without orderBy
        const simpleQ = query(
          collection(db, COLLECTION), 
          where('status', '==', 'awaiting_authentication')
        )
        const snapshot = await getDocs(simpleQ)
        const certificates = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Certificate[]
        
        // Sort in memory by createdAt
        return certificates.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0)
          const bTime = b.createdAt?.toDate?.() || new Date(0)
          return bTime.getTime() - aTime.getTime()
        })
      }
    } catch (error) {
      console.error('Error fetching certificates awaiting approval:', error)
      return []
    }
  },

  // Cancel certificate
  async cancel(id: string) {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp()
    })
  },

  // Delete certificate
  async delete(id: string) {
    const docRef = doc(db, COLLECTION, id)
    await deleteDoc(docRef)
  },

  // Subscribe to certificates changes
  subscribe(callback: (certificates: Certificate[]) => void) {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snapshot) => {
      const certificates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Certificate[]
      callback(certificates)
    })
  }
} 