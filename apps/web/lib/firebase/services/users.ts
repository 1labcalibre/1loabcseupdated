import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore'
import { db } from '../config'
import { deleteUser } from 'firebase/auth'

export type MachineType = 'G1' | 'G2' | 'G3'

export interface TestPermissions {
  g1Tests?: string[] // ['hardness', 'density']
  g2Tests?: string[] // ['ts1', 'ts2', 'ts3', 'ts4', 'elongation1', 'elongation2', 'elongation3', 'elongation4', 'tearStrength']
  g3Tests?: string[] // ['mooneyViscosity', 'rheoTS2Min', 'rheoTS2Sec', 'rheoTC90Min', 'rheoTC90Sec']
}

export interface PagePermissions {
  canView: boolean
  canEdit: boolean
  canCreate: boolean
  canDelete: boolean
  canApprove?: boolean
}

export interface UserPermissions {
  // Global permissions
  canApprove: boolean
  canEdit: boolean
  canView: boolean
  canDelete: boolean
  canModifyReferenceNo?: boolean // Only for L1 users
  
  // Page-specific permissions
  dashboard: PagePermissions
  analytics: PagePermissions
  testEntry: PagePermissions
  batchSelection: PagePermissions
  certificates: PagePermissions
  pendingTests: PagePermissions
  holdManagement: PagePermissions
  products: PagePermissions
  users: PagePermissions
  settings: PagePermissions
}

export interface User {
  id?: string  // Firestore document ID
  uid: string  // Firebase Auth UID
  email: string | null
  displayName: string | null
  role: 'L1' | 'L2' | 'L3' | 'MachineUser' | 'ViewOnly'
  permissions: UserPermissions
  machineAccess?: MachineType[] // Which machines the user can access
  testPermissions?: TestPermissions // Specific tests the user can perform
  active: boolean
  createdAt?: any
  updatedAt?: any
}

const COLLECTION = 'users'

// Default test permissions for each machine
export const DEFAULT_TEST_PERMISSIONS: TestPermissions = {
  g1Tests: ['hardness', 'density'],
  g2Tests: ['ts1', 'ts2', 'ts3', 'ts4', 'elongation1', 'elongation2', 'elongation3', 'elongation4', 'tearStrength'],
  g3Tests: ['mooneyViscosity', 'rheoTS2Min', 'rheoTS2Sec', 'rheoTC90Min', 'rheoTC90Sec']
}

// Generate default permissions based on role
export const generateRolePermissions = (role: User['role']): UserPermissions => {
  const basePagePermissions: PagePermissions = {
    canView: false,
    canEdit: false,
    canCreate: false,
    canDelete: false,
    canApprove: false
  }

  switch (role) {
    case 'L1': // All permissions
      return {
        canApprove: true,
        canEdit: true,
        canView: true,
        canDelete: true,
        canModifyReferenceNo: true,
        dashboard: { ...basePagePermissions, canView: true },
        analytics: { ...basePagePermissions, canView: true, canEdit: true },
        testEntry: { ...basePagePermissions, canView: true, canEdit: true, canCreate: true, canDelete: true },
        batchSelection: { ...basePagePermissions, canView: true, canEdit: true, canCreate: true, canDelete: true },
        certificates: { ...basePagePermissions, canView: true, canEdit: true, canCreate: true, canDelete: true, canApprove: true },
        pendingTests: { ...basePagePermissions, canView: true, canEdit: true, canApprove: true },
        holdManagement: { ...basePagePermissions, canView: true, canEdit: true, canCreate: true, canDelete: true },
        products: { ...basePagePermissions, canView: true, canEdit: true, canCreate: true, canDelete: true },
        users: { ...basePagePermissions, canView: true, canEdit: true, canCreate: true, canDelete: true },
        settings: { ...basePagePermissions, canView: true, canEdit: true }
      }

    case 'L2': // Batch selection, Hold Management, Pending Tests (View, edit, save, changes)
      return {
        canApprove: false,
        canEdit: true,
        canView: true,
        canDelete: false,
        canModifyReferenceNo: false,
        dashboard: { ...basePagePermissions, canView: true },
        analytics: { ...basePagePermissions, canView: true },
        testEntry: { ...basePagePermissions, canView: true },
        batchSelection: { ...basePagePermissions, canView: true, canEdit: true, canCreate: true },
        certificates: { ...basePagePermissions, canView: true },
        pendingTests: { ...basePagePermissions, canView: true, canEdit: true },
        holdManagement: { ...basePagePermissions, canView: true, canEdit: true, canCreate: true },
        products: { ...basePagePermissions, canView: true },
        users: { ...basePagePermissions, canView: false },
        settings: { ...basePagePermissions, canView: false }
      }

    case 'L3': // Certificate access (View, edit, save, changes) - New L3 Certificate role
      return {
        canApprove: false,
        canEdit: true,
        canView: true,
        canDelete: false,
        canModifyReferenceNo: false,
        dashboard: { ...basePagePermissions, canView: true },
        analytics: { ...basePagePermissions, canView: true },
        testEntry: { ...basePagePermissions, canView: true },
        batchSelection: { ...basePagePermissions, canView: true }, // View only
        certificates: { ...basePagePermissions, canView: true, canEdit: true, canCreate: true }, // Full access
        pendingTests: { ...basePagePermissions, canView: true }, // View only
        holdManagement: { ...basePagePermissions, canView: true }, // View only
        products: { ...basePagePermissions, canView: true },
        users: { ...basePagePermissions, canView: false },
        settings: { ...basePagePermissions, canView: false }
      }

    case 'MachineUser': // Machine operators with basic test entry access
      return {
        canApprove: false,
        canEdit: true,
        canView: true,
        canDelete: false,
        canModifyReferenceNo: false,
        dashboard: { ...basePagePermissions, canView: true },
        analytics: { ...basePagePermissions, canView: false },
        testEntry: { ...basePagePermissions, canView: true, canEdit: true, canCreate: true }, // Primary function
        batchSelection: { ...basePagePermissions, canView: false },
        certificates: { ...basePagePermissions, canView: false },
        pendingTests: { ...basePagePermissions, canView: false },
        holdManagement: { ...basePagePermissions, canView: false },
        products: { ...basePagePermissions, canView: false },
        users: { ...basePagePermissions, canView: false },
        settings: { ...basePagePermissions, canView: false }
      }

    case 'ViewOnly': // Can view only certificates page
    default:
      return {
        canApprove: false,
        canEdit: false,
        canView: true,
        canDelete: false,
        canModifyReferenceNo: false,
        dashboard: { ...basePagePermissions, canView: false },
        analytics: { ...basePagePermissions, canView: false },
        testEntry: { ...basePagePermissions, canView: false },
        batchSelection: { ...basePagePermissions, canView: false },
        certificates: { ...basePagePermissions, canView: true }, // Only certificates
        pendingTests: { ...basePagePermissions, canView: false },
        holdManagement: { ...basePagePermissions, canView: false },
        products: { ...basePagePermissions, canView: false },
        users: { ...basePagePermissions, canView: false },
        settings: { ...basePagePermissions, canView: false }
      }
  }
}

export const usersService = {
  // Get all users
  async getAll() {
    const q = query(collection(db, COLLECTION), orderBy('displayName'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[]
  },

  // Get single user
  async getById(id: string) {
    const docRef = doc(db, COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User
    }
    return null
  },

  // Get user by UID
  async getByUid(uid: string) {
    const users = await this.getAll()
    return users.find(user => user.uid === uid) || null
  },

  // Update user
  async update(id: string, userData: Partial<User>) {
    const docRef = doc(db, COLLECTION, id)
    
    // Update permissions based on role if role changed
    if (userData.role) {
      userData.permissions = generateRolePermissions(userData.role)
    }
    
    await updateDoc(docRef, {
      ...userData,
      updatedAt: serverTimestamp()
    })
  },

  // Update machine access
  async updateMachineAccess(id: string, machineAccess: MachineType[]) {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      machineAccess,
      updatedAt: serverTimestamp()
    })
  },

  // Update test permissions
  async updateTestPermissions(id: string, testPermissions: TestPermissions) {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      testPermissions,
      updatedAt: serverTimestamp()
    })
  },

  // Activate/Deactivate user
  async toggleActive(id: string, active: boolean) {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      active,
      updatedAt: serverTimestamp()
    })
  },

  // Delete user (soft delete - just marks as inactive)
  async delete(id: string) {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      active: false,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  },

  // Permanently delete user (hard delete - removes from Firestore)
  async permanentDelete(id: string) {
    const docRef = doc(db, COLLECTION, id)
    await deleteDoc(docRef)
  },

  // Migrate existing users to new permission structure
  async migrateUsersToNewPermissions() {
    const users = await this.getAll()
    const migrationsNeeded = users.filter(user => !user.permissions || typeof user.permissions !== 'object')
    
    console.log(`Found ${migrationsNeeded.length} users needing permission migration`)
    
    for (const user of migrationsNeeded) {
      if (user.id) {
        try {
          const newPermissions = generateRolePermissions(user.role)
          await this.update(user.id, { permissions: newPermissions })
          console.log(`Migrated permissions for user: ${user.displayName || user.email}`)
        } catch (error) {
          console.error(`Failed to migrate user ${user.displayName || user.email}:`, error)
        }
      }
    }
    
    return migrationsNeeded.length
  },

  // Subscribe to users changes
  subscribe(callback: (users: User[]) => void) {
    const q = query(collection(db, COLLECTION), orderBy('displayName'))
    return onSnapshot(q, 
      (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[]
        callback(users)
      },
      (error) => {
        console.error('Error in users subscription:', error)
        // If permission denied, user might be logging out
        if (error.code === 'permission-denied') {
          console.warn('Permission denied in users subscription - user may be logging out')
          return
        }
        // Fall back to a single fetch if subscription fails
        this.getAll().then(callback).catch(err => {
          console.error('Error fetching users after subscription failure:', err)
        })
      }
    )
  },

  // Check if user has access to a specific machine
  hasMachineAccess(user: User, machine: MachineType): boolean {
    return user.machineAccess?.includes(machine) || false
  },

  // Check if user can perform a specific test
  canPerformTest(user: User, machine: MachineType, testName: string): boolean {
    if (!this.hasMachineAccess(user, machine)) return false
    
    const machineKey = `${machine.toLowerCase()}Tests` as keyof TestPermissions
    const allowedTests = user.testPermissions?.[machineKey] || []
    
    return allowedTests.includes(testName)
  }
} 