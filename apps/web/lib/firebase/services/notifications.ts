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
  writeBatch
} from 'firebase/firestore'
import { db } from '../config'

export type NotificationType = 'test_pending' | 'test_completed' | 'test_rejected' | 'system'

export interface Notification {
  id?: string
  userId: string // Recipient user ID
  type: NotificationType
  title: string
  message: string
  referenceNo?: string // For test-related notifications
  testId?: string // ID of the test data
  fromUserId?: string // Who triggered the notification
  read: boolean
  createdAt?: any
  updatedAt?: any
}

const COLLECTION = 'notifications'

export const notificationsService = {
  // Get all notifications for a user
  async getByUser(userId: string) {
    try {
      const q = query(
        collection(db, COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[]
    } catch (error) {
      // Fallback without orderBy if index doesn't exist
      const q = query(
        collection(db, COLLECTION),
        where('userId', '==', userId)
      )
      const snapshot = await getDocs(q)
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[]
      
      // Sort manually
      return notifications.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB.getTime() - dateA.getTime()
      })
    }
  },

  // Get unread notifications count
  async getUnreadCount(userId: string) {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    )
    const snapshot = await getDocs(q)
    return snapshot.size
  },

  // Create notification
  async create(notification: Omit<Notification, 'id'>) {
    const data = {
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    const docRef = await addDoc(collection(db, COLLECTION), data)
    return docRef.id
  },

  // Create test pending notification
  async createTestPendingNotification(
    recipientUserId: string,
    referenceNo: string,
    testId: string,
    fromMachine: string,
    toMachine: string,
    fromUserId?: string
  ) {
    return this.create({
      userId: recipientUserId,
      type: 'test_pending',
      title: `Test Entry Required - ${referenceNo}`,
      message: `${fromMachine} testing completed. Please complete ${toMachine} tests for reference ${referenceNo}`,
      referenceNo,
      testId,
      fromUserId,
      read: false
    })
  },

  // Create notifications for all users with specific machine access
  async notifyMachineOperators(
    machine: 'G1' | 'G2' | 'G3',
    referenceNo: string,
    testId: string,
    fromMachine?: string,
    fromUserId?: string
  ) {
    // Import users service to get users with machine access
    const { usersService } = await import('./users')
    const users = await usersService.getAll()
    
    // Filter users who have access to the specified machine
    const machineOperators = users.filter(user => 
      user.active && 
      user.machineAccess?.includes(machine)
    )

    // Create notifications for all operators
    const batch = writeBatch(db)
    const notificationIds: string[] = []

    machineOperators.forEach(user => {
      if (user.uid && user.uid !== fromUserId) { // Don't notify the user who completed the test
        const notificationRef = doc(collection(db, COLLECTION))
        const notificationData: Omit<Notification, 'id'> = {
          userId: user.uid,
          type: 'test_pending',
          title: `New Test Created - ${referenceNo}`,
          message: fromMachine 
            ? `${fromMachine} operator created a new test. Please add your ${machine} test values for reference ${referenceNo}`
            : `New test entry required for ${machine} - Reference: ${referenceNo}`,
          referenceNo,
          testId,
          fromUserId,
          read: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        batch.set(notificationRef, notificationData)
        notificationIds.push(notificationRef.id)
      }
    })

    await batch.commit()
    return notificationIds
  },

  // Mark notification as read
  async markAsRead(id: string) {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      read: true,
      updatedAt: serverTimestamp()
    })
  },

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    const unreadNotifications = await this.getByUser(userId)
    const batch = writeBatch(db)

    unreadNotifications
      .filter(n => !n.read && n.id)
      .forEach(notification => {
        const docRef = doc(db, COLLECTION, notification.id!)
        batch.update(docRef, {
          read: true,
          updatedAt: serverTimestamp()
        })
      })

    await batch.commit()
  },

  // Delete notification
  async delete(id: string) {
    const docRef = doc(db, COLLECTION, id)
    await deleteDoc(docRef)
  },

  // Delete all notifications for a user
  async deleteAllForUser(userId: string) {
    const notifications = await this.getByUser(userId)
    const batch = writeBatch(db)

    notifications.forEach(notification => {
      if (notification.id) {
        const docRef = doc(db, COLLECTION, notification.id)
        batch.delete(docRef)
      }
    })

    await batch.commit()
  },

  // Remove test notification for a specific user when they complete their test
  async removeTestNotificationForUser(userId: string, referenceNo: string) {
    const q = query(
      collection(db, COLLECTION), 
      where('userId', '==', userId),
      where('referenceNo', '==', referenceNo),
      where('type', '==', 'test_pending')
    )
    const snapshot = await getDocs(q)
    
    const batch = writeBatch(db)
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })
    
    await batch.commit()
  },

  // Subscribe to notifications for a user
  subscribe(userId: string, callback: (notifications: Notification[]) => void) {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId)
    )
    
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[]
      
      // Sort manually by createdAt
      const sortedNotifications = notifications.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB.getTime() - dateA.getTime()
      })
      
      callback(sortedNotifications)
    })
  },

  // Subscribe to unread count
  subscribeToUnreadCount(userId: string, callback: (count: number) => void) {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    )
    
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size)
    })
  }
} 

