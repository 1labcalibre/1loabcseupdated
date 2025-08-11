import { 
  collection, 
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore'
import { db } from '../config'

export interface AuditEntry {
  id?: string
  userId: string
  userEmail: string
  userName: string
  action: string
  entityType: 'product' | 'testData' | 'certificate' | 'user' | 'settings'
  entityId?: string
  details: string
  changes?: Record<string, any>
  ipAddress?: string
  timestamp?: any
}

const COLLECTION = 'auditTrail'

export const auditService = {
  // Log an action
  async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>) {
    try {
      await addDoc(collection(db, COLLECTION), {
        ...entry,
        timestamp: serverTimestamp()
      })
    } catch (error) {
      console.error('Failed to log audit entry:', error)
    }
  },

  // Get all audit entries
  async getAll(limit = 100) {
    const q = query(
      collection(db, COLLECTION), 
      orderBy('timestamp', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AuditEntry[]
  },

  // Get audit entries by user
  async getByUser(userId: string, limit = 50) {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AuditEntry[]
  },

  // Get audit entries by entity
  async getByEntity(entityType: string, entityId: string) {
    const q = query(
      collection(db, COLLECTION),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('timestamp', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AuditEntry[]
  },

  // Subscribe to audit trail changes
  subscribe(callback: (entries: AuditEntry[]) => void, limit = 100) {
    const q = query(
      collection(db, COLLECTION), 
      orderBy('timestamp', 'desc')
    )
    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.slice(0, limit).map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditEntry[]
      callback(entries)
    })
  }
} 

