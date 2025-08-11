"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase/config'
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { getRoleBasedRedirect } from '@/lib/utils/role-redirect'

interface LegacyPermissions {
  canApprove: boolean
  canEdit: boolean
  canView: boolean
  canDelete: boolean
  canModifyReferenceNo?: boolean
  holdManagement?: PagePermissions
}

interface PagePermissions {
  canView: boolean
  canEdit: boolean
  canCreate: boolean
  canDelete: boolean
  canApprove?: boolean
}

interface UserPermissions {
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

interface UserData {
  id?: string  // Firestore document ID
  uid: string
  email: string | null
  displayName: string | null
  role: 'L1' | 'L2' | 'L3' | 'MachineUser' | 'ViewOnly'
  permissions: UserPermissions | LegacyPermissions // Support both old and new
  machineAccess?: ('G1' | 'G2' | 'G3')[]
  testPermissions?: any
  active?: boolean
  createdAt: any
  updatedAt: any
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, role: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  getRedirectPath: () => string
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user data from Firestore
  const fetchUserData = async (uid: string) => {
    try {
      // Only fetch if user is still authenticated
      if (!auth.currentUser || auth.currentUser.uid !== uid) {
        console.warn('User not authenticated, skipping fetch');
        return;
      }
      
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData
        // Include the document ID
        setUserData({
          ...data,
          id: uid  // In this case, document ID is same as uid
        })
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      // If it's a permission error and user is not authenticated, ignore it
      if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied' && !auth.currentUser) {
        console.warn('Permission denied during logout - ignoring');
        return;
      }
    }
  }

  // Listen to auth state changes
  useEffect(() => {
    let userDataUnsubscribe: (() => void) | null = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user)
        
        // Clean up previous user data subscription
        if (userDataUnsubscribe) {
          userDataUnsubscribe();
          userDataUnsubscribe = null;
        }
        
        if (user) {
          // Subscribe to real-time updates of user data
          const userDocRef = doc(db, 'users', user.uid);
          userDataUnsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              const data = doc.data() as UserData;
              setUserData({
                ...data,
                id: user.uid
              });
            } else {
              setUserData(null);
            }
          }, (error) => {
            console.error('Error listening to user data:', error);
            // Only try fallback fetch if user is still authenticated
            if (auth.currentUser && auth.currentUser.uid === user.uid) {
              // Check if it's a permission error during logout
              if (error.code === 'permission-denied') {
                console.warn('Permission denied - user may be logging out');
                setUserData(null);
              } else {
                // Try fallback fetch for other errors
                fetchUserData(user.uid);
              }
            } else {
              // User is no longer authenticated, clear data
              setUserData(null);
            }
          });
        } else {
          setUserData(null)
        }
        setLoading(false)
      } catch (error) {
        console.error('Error in auth state change handler:', error);
        setLoading(false);
        // Ensure clean state on error
        if (!user) {
          setUserData(null);
        }
      }
    })

    return () => {
      authUnsubscribe();
      if (userDataUnsubscribe) {
        userDataUnsubscribe();
      }
    };
  }, [])

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      await fetchUserData(result.user.uid)
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  // Sign up
  const signUp = async (email: string, password: string, name: string, role: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      
      // Update profile
      await updateProfile(result.user, { displayName: name })
      
      // Create user document in Firestore
      const permissions = {
        canApprove: role === 'L1',
        canEdit: role === 'L1' || role === 'L2',
        canView: true,
        canDelete: role === 'L1'
      }
      
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        email: result.user.email,
        displayName: name,
        role: role as UserData['role'],
        permissions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      await fetchUserData(result.user.uid)
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  // Logout
  const logout = async () => {
    try {
      // Clear user data first to prevent subscription errors
      setUserData(null)
      setUser(null)
      
      // Then sign out from Firebase Auth
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
      // Even if signOut fails, ensure local state is cleared
      setUser(null)
      setUserData(null)
      throw error
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  }

  // Get appropriate redirect path for current user
  const getRedirectPath = () => {
    if (!userData) return '/'
    return getRoleBasedRedirect(userData.role, userData.permissions)
  }

  const value = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    logout,
    resetPassword,
    getRedirectPath
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 