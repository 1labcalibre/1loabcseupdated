"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Edit, Plus, Shield, Trash2, X, Save, Loader2, Factory, CheckSquare, Mail, AlertTriangle, Settings } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/contexts/auth-context"
import { usersService, type User, type MachineType, type UserPermissions, type PagePermissions, DEFAULT_TEST_PERMISSIONS, generateRolePermissions } from "@/lib/firebase/services/users"
import { auth } from "@/lib/firebase/config"
import { createUserWithEmailAndPassword, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from "firebase/auth"
import { doc, setDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { MACHINE_TESTS } from "@/lib/firebase/utils/test-helpers"

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const router = useRouter()
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    role: "ViewOnly" as User['role'],
    password: "",
    active: true,
    machineAccess: [] as MachineType[],
    testPermissions: {} as any
  })

  const [editPermissions, setEditPermissions] = useState({
    machineAccess: [] as MachineType[],
    testPermissions: {} as any
  })

  const [credentialChanges, setCredentialChanges] = useState({
    newEmail: "",
    newPassword: "",
    confirmPassword: "",
    adminPassword: ""
  })

  const [deleteConfirmation, setDeleteConfirmation] = useState({
    adminPassword: "",
    confirmationText: "",
    agreeToDelete: false
  })

  const [permissionsUser, setPermissionsUser] = useState<User | null>(null)
  const [customPermissions, setCustomPermissions] = useState<UserPermissions | null>(null)
  const [showMachinePermissionsModal, setShowMachinePermissionsModal] = useState(false)
  const [migrating, setMigrating] = useState(false)

  // Load users on mount
  useEffect(() => {
    loadUsers()
    
    // Subscribe to real-time updates with error handling
    try {
      const unsubscribe = usersService.subscribe((updatedUsers) => {
        setUsers(updatedUsers)
      })
      
      return () => {
        try {
          unsubscribe()
        } catch (error) {
          console.warn('Error unsubscribing from users:', error)
        }
      }
    } catch (error) {
      console.error('Error subscribing to users updates:', error)
      // If real-time subscription fails, just load users once
      loadUsers()
    }
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const usersList = await usersService.getAll()
      setUsers(usersList)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeColor = (role: User['role']) => {
    switch (role) {
      case "L1":
        return "bg-purple-100 text-purple-700"
      case "L2":
        return "bg-blue-100 text-blue-700"
      case "L3":
        return "bg-green-100 text-green-700"
      case "MachineUser":
        return "bg-orange-100 text-orange-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getRoleDisplayName = (role: User['role']) => {
    switch (role) {
      case "L1":
        return "L1 - MD/RND"
      case "L2":
        return "L2 - Lab In-charge"
      case "L3":
        return "L3 - Certificate"
      case "MachineUser":
        return "Machine User"
      default:
        return "View Only"
    }
  }

  const handleAddUser = async () => {
    if (!formData.email || !formData.password || !formData.displayName) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      
      // Update display name
      await updateProfile(userCredential.user, {
        displayName: formData.displayName
      })
      
      // Create user document in Firestore
      const permissions = generateRolePermissions(formData.role)
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        permissions,
        machineAccess: formData.machineAccess,
        testPermissions: formData.testPermissions,
        active: formData.active,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      alert('User created successfully!')
      setShowAddModal(false)
      setFormData({
        displayName: "",
        email: "",
        role: "ViewOnly",
        password: "",
        active: true,
        machineAccess: [],
        testPermissions: {}
      })
      
      // Reload users
      loadUsers()
    } catch (error: any) {
      console.error('Error creating user:', error)
      alert(error.message || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const handleEditUser = async () => {
    if (!editingUser || !editingUser.id) return

    try {
      setSaving(true)
      
      // Update basic user info
      await usersService.update(editingUser.id, {
        displayName: editingUser.displayName,
        role: editingUser.role,
        active: editingUser.active
      })
      
      alert('User updated successfully!')
      setShowEditModal(false)
      setEditingUser(null)
      resetCredentialChanges()
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleCredentialChanges = async () => {
    if (!editingUser || !currentUser) return
    
    // Validation
    if (credentialChanges.newPassword && credentialChanges.newPassword !== credentialChanges.confirmPassword) {
      alert('Passwords do not match')
      return
    }
    
    if (credentialChanges.newPassword && credentialChanges.newPassword.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }
    
    if (!credentialChanges.adminPassword) {
      alert('Please enter your admin password to confirm changes')
      return
    }

    try {
      setSaving(true)
      
      // Re-authenticate current admin user first
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        credentialChanges.adminPassword
      )
      await reauthenticateWithCredential(currentUser, credential)

      // Current Implementation Limitation Notice
      const limitationMessage = `
🚨 IMPORTANT LIMITATION NOTICE:

The current changes have been made to the system database (Firestore) but NOT to Firebase Authentication.

❌ ISSUE: User won't be able to login with new credentials because:
- Firebase Auth still has the old email/password
- Only the system database was updated

✅ WORKAROUND OPTIONS:

1. RECOMMENDED: Send Password Reset Email
   - User should use "Forgot Password" on login page
   - This will update Firebase Auth properly
   
2. TEMPORARY: Use Original Credentials
   - User can still login with original email/password
   - System will show updated info after login

🔧 TECHNICAL SOLUTION NEEDED:
To fully implement this feature, you need:
- Firebase Admin SDK on backend server
- Server-side API to update Firebase Auth records
- Enhanced security protocols

Would you like me to:
A) Send a password reset email to the user now
B) Revert the changes
C) Continue with current implementation understanding limitations
      `

      // For now, just update Firestore and show detailed explanation
      let hasChanges = false
      const updates: any = {}

      // Handle email change (update Firestore only - requires backend for Auth)
      if (credentialChanges.newEmail && credentialChanges.newEmail !== editingUser.email) {
        updates.email = credentialChanges.newEmail
        hasChanges = true
      }

      // Store intended password change for reference
      if (credentialChanges.newPassword) {
        updates.pendingPasswordChange = true
        updates.passwordChangeRequested = new Date()
        updates.passwordChangeRequestedBy = currentUser.uid
        hasChanges = true
      }

      // Update Firestore with new information
      if (hasChanges) {
        await updateDoc(doc(db, 'users', editingUser.id!), {
          ...updates,
          updatedAt: new Date()
        })
      }

      // Show detailed explanation
      if (hasChanges) {
        if (confirm(limitationMessage + '\n\nClick OK to send password reset email, Cancel to continue without it')) {
          // Send password reset email
          try {
            const targetEmail = credentialChanges.newEmail || editingUser.email
            await sendPasswordResetEmail(auth, targetEmail!)
            alert(`✅ Password reset email sent to ${targetEmail}!\n\nThe user should:\n1. Check their email\n2. Click the reset link\n3. Set their new password\n4. Login with ${targetEmail}`)
          } catch (resetError) {
            console.error('Error sending password reset:', resetError)
            alert('❌ Failed to send password reset email. User should use "Forgot Password" on login page.')
          }
        }
        
        setShowEditModal(false)
        setEditingUser(null)
        resetCredentialChanges()
        loadUsers() // Refresh the user list
      }
      
    } catch (error: any) {
      console.error('Error updating credentials:', error)
      if (error.code === 'auth/wrong-password') {
        alert('Incorrect admin password')
      } else {
        alert('Failed to update credentials: ' + error.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const resetCredentialChanges = () => {
    setCredentialChanges({
      newEmail: "",
      newPassword: "",
      confirmPassword: "",
      adminPassword: ""
    })
  }

  const handleSendPasswordReset = async (userEmail: string) => {
    try {
      setSaving(true)
      await sendPasswordResetEmail(auth, userEmail)
      alert(`✅ Password reset email sent to ${userEmail}!\n\nThe user should:\n1. Check their email\n2. Click the reset link\n3. Set a new password\n4. Login with the new password`)
    } catch (error: any) {
      console.error('Error sending password reset:', error)
      if (error.code === 'auth/user-not-found') {
        alert('❌ No user found with this email in Firebase Auth.\n\nThis might be because:\n1. Email was changed in database only\n2. User was created outside Firebase Auth\n3. User account was deleted')
      } else {
        alert('❌ Failed to send password reset email: ' + error.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const openDeleteModal = (user: User) => {
    setUserToDelete(user)
    setDeleteConfirmation({
      adminPassword: "",
      confirmationText: "",
      agreeToDelete: false
    })
    setShowDeleteModal(true)
  }

  const handlePermanentDelete = async () => {
    if (!userToDelete || !currentUser) return

    // Validation
    if (!deleteConfirmation.adminPassword) {
      alert('Please enter your admin password to confirm deletion')
      return
    }

    if (deleteConfirmation.confirmationText.toLowerCase() !== 'delete') {
      alert('Please type "DELETE" to confirm permanent deletion')
      return
    }

    if (!deleteConfirmation.agreeToDelete) {
      alert('Please check the confirmation box to proceed')
      return
    }

    // Additional safety check
    if (userToDelete.uid === currentUser.uid) {
      alert('❌ You cannot delete your own account')
      return
    }

    try {
      setSaving(true)

      // Re-authenticate current admin user first
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        deleteConfirmation.adminPassword
      )
      await reauthenticateWithCredential(currentUser, credential)

      // Show final confirmation
      const finalConfirm = confirm(`🚨 FINAL WARNING 🚨

Are you absolutely sure you want to PERMANENTLY DELETE this user?

User: ${userToDelete.displayName || 'N/A'} (${userToDelete.email})
Role: ${userToDelete.role}

⚠️ THIS ACTION CANNOT BE UNDONE! ⚠️

The user will be:
❌ Removed from Firestore database
❌ Unable to login (if still in Firebase Auth)
❌ Lose all permissions and access
❌ All related data may become orphaned

Click OK to proceed with permanent deletion, or Cancel to abort.`)

      if (!finalConfirm) {
        setSaving(false)
        return
      }

      // Perform the permanent deletion
      await usersService.permanentDelete(userToDelete.id!)

      // Note: Firebase Auth deletion requires backend implementation
      // For now, we'll show a note about this
      const authDeletionNote = `✅ User removed from system database!

⚠️ IMPORTANT: The user's Firebase Authentication record may still exist. 

To completely remove the user:
1. Go to Firebase Console
2. Navigate to Authentication > Users
3. Manually delete the user: ${userToDelete.email}

OR implement Firebase Admin SDK on backend for automatic auth deletion.`

      alert(authDeletionNote)

      // Close modal and refresh
      setShowDeleteModal(false)
      setUserToDelete(null)
      loadUsers()

    } catch (error: any) {
      console.error('Error deleting user:', error)
      if (error.code === 'auth/wrong-password') {
        alert('❌ Incorrect admin password')
      } else {
        alert('❌ Failed to delete user: ' + error.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const resetDeleteConfirmation = () => {
    setDeleteConfirmation({
      adminPassword: "",
      confirmationText: "",
      agreeToDelete: false
    })
  }

  const openPermissionsModal = (user: User) => {
    setPermissionsUser(user)
    setCustomPermissions(user.permissions || generateRolePermissions(user.role))
    setShowPermissionsModal(true)
  }

  const handleUpdatePermissions = async () => {
    if (!permissionsUser || !customPermissions) return

    try {
      setSaving(true)
      
      await usersService.update(permissionsUser.id!, {
        permissions: customPermissions
      })
      
      alert('Permissions updated successfully!')
      setShowPermissionsModal(false)
      setPermissionsUser(null)
      setCustomPermissions(null)
      loadUsers()
    } catch (error) {
      console.error('Error updating permissions:', error)
      alert('Failed to update permissions')
    } finally {
      setSaving(false)
    }
  }

  const updatePagePermission = (page: keyof UserPermissions, permission: keyof PagePermissions, value: boolean) => {
    if (!customPermissions) return

    setCustomPermissions({
      ...customPermissions,
      [page]: {
        ...(customPermissions[page] as PagePermissions),
        [permission]: value
      }
    })
  }

  const resetToRoleDefaults = () => {
    if (!permissionsUser) return
    setCustomPermissions(generateRolePermissions(permissionsUser.role))
  }

  const handleMigratePermissions = async () => {
    try {
      setMigrating(true)
      const migratedCount = await usersService.migrateUsersToNewPermissions()
      alert(`Successfully migrated ${migratedCount} users to new permission structure!`)
      loadUsers() // Reload users to see updated permissions
    } catch (error) {
      console.error('Migration failed:', error)
      alert('Migration failed. Please check console for details.')
    } finally {
      setMigrating(false)
    }
  }

  const handleUpdateMachinePermissions = async () => {
    if (!editingUser || !editingUser.id) return

    try {
      setSaving(true)
      
      await usersService.updateMachineAccess(editingUser.id, editPermissions.machineAccess)
      await usersService.updateTestPermissions(editingUser.id, editPermissions.testPermissions)
      
      alert('Machine permissions updated successfully!')
      setShowMachinePermissionsModal(false)
      setEditingUser(null)
    } catch (error) {
      console.error('Error updating machine permissions:', error)
      alert('Failed to update machine permissions')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleUserStatus = async (user: User) => {
    if (!user.id) return
    
    try {
      await usersService.toggleActive(user.id, !user.active)
      alert(`User ${user.active ? 'deactivated' : 'activated'} successfully!`)
    } catch (error) {
      console.error('Error toggling user status:', error)
      alert('Failed to update user status')
    }
  }

  const openEditModal = (user: User) => {
    setEditingUser({ ...user })
    resetCredentialChanges()
    setShowEditModal(true)
  }

  const openMachinePermissionsModal = (user: User) => {
    setEditingUser({ ...user })
    setEditPermissions({
      machineAccess: user.machineAccess || [],
      testPermissions: user.testPermissions || {}
    })
    setShowMachinePermissionsModal(true)
  }

  const toggleMachineAccess = (machine: MachineType, isForEdit: boolean = false) => {
    if (isForEdit) {
      const current = editPermissions.machineAccess
      const updated = current.includes(machine)
        ? current.filter(m => m !== machine)
        : [...current, machine]
      
      // Update test permissions when machine access changes
      const newTestPermissions = { ...editPermissions.testPermissions }
      if (!updated.includes(machine)) {
        // Remove test permissions for this machine
        delete newTestPermissions[`${machine.toLowerCase()}Tests`]
      } else {
        // Add default test permissions for this machine
        newTestPermissions[`${machine.toLowerCase()}Tests`] = MACHINE_TESTS[machine].tests.map(t => t.key)
      }
      
      setEditPermissions({
        machineAccess: updated,
        testPermissions: newTestPermissions
      })
    } else {
      const current = formData.machineAccess
      const updated = current.includes(machine)
        ? current.filter(m => m !== machine)
        : [...current, machine]
      
      // Update test permissions when machine access changes
      const newTestPermissions = { ...formData.testPermissions }
      if (!updated.includes(machine)) {
        // Remove test permissions for this machine
        delete newTestPermissions[`${machine.toLowerCase()}Tests`]
      } else {
        // Add default test permissions for this machine
        newTestPermissions[`${machine.toLowerCase()}Tests`] = MACHINE_TESTS[machine].tests.map(t => t.key)
      }
      
      setFormData({
        ...formData,
        machineAccess: updated,
        testPermissions: newTestPermissions
      })
    }
  }

  const toggleTestPermission = (machine: MachineType, testKey: string, isForEdit: boolean = false) => {
    const machineKey = `${machine.toLowerCase()}Tests`
    
    if (isForEdit) {
      const currentTests = editPermissions.testPermissions[machineKey] || []
      const updatedTests = currentTests.includes(testKey)
        ? currentTests.filter((t: string) => t !== testKey)
        : [...currentTests, testKey]
      
      setEditPermissions({
        ...editPermissions,
        testPermissions: {
          ...editPermissions.testPermissions,
          [machineKey]: updatedTests
        }
      })
    } else {
      const currentTests = formData.testPermissions[machineKey] || []
      const updatedTests = currentTests.includes(testKey)
        ? currentTests.filter((t: string) => t !== testKey)
        : [...currentTests, testKey]
      
      setFormData({
        ...formData,
        testPermissions: {
          ...formData.testPermissions,
          [machineKey]: updatedTests
        }
      })
    }
  }

  const getMachineAccessDisplay = (user: User) => {
    if (!user.machineAccess || user.machineAccess.length === 0) {
      return <span className="text-gray-400 text-xs">No machine access</span>
    }
    return (
      <div className="flex gap-1">
        {user.machineAccess.map(machine => (
          <span key={machine} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
            {machine}
          </span>
        ))}
      </div>
    )
  }

  return (
    <ProtectedRoute page="users" pagePermission="canView">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold">User Management</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleMigratePermissions}
                  disabled={migrating}
                  variant="outline"
                  className="hidden sm:flex text-sm"
                >
                  {migrating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Migrating...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Migrate Permissions
                    </>
                  )}
                </Button>
                <Button onClick={() => setShowAddModal(true)} className="hidden sm:flex">
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
                <Button onClick={() => setShowAddModal(true)} size="icon" className="sm:hidden">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 sm:px-6 py-8">
          {/* Access Level Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  Level 1 (L1)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">MD/RND - Full system access</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Level 2 (L2)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">Lab In-charge - Batch & Hold Management</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  Level 3 (L3)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">Certificate Management</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-orange-600" />
                  Machine User
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">Test Entry & Data Input</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-600" />
                  View Only
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">Read-only access</p>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users List</CardTitle>
              <CardDescription>Manage users and their access levels</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading users...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead>Access Level</TableHead>
                        <TableHead>Machine Access</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            No users found. Add a user to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {user.displayName || 'N/A'}
                                {(user as any).pendingPasswordChange && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 border border-orange-200">
                                    <Mail className="h-3 w-3 mr-1" />
                                    Reset Needed
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleBadgeColor(user.role)}`}>
                                {user.role}
                              </span>
                            </TableCell>
                            <TableCell>{getMachineAccessDisplay(user)}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                user.active 
                                  ? "bg-green-100 text-green-700" 
                                  : "bg-gray-100 text-gray-700"
                              }`}>
                                {user.active ? 'Active' : 'Inactive'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => openEditModal(user)}
                                  disabled={user.uid === currentUser?.uid}
                                  title="Edit User"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => openPermissionsModal(user)}
                                  disabled={user.uid === currentUser?.uid}
                                  title="Manage Page Permissions"
                                  className="text-purple-600 hover:text-purple-700"
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => openMachinePermissionsModal(user)}
                                  disabled={user.uid === currentUser?.uid}
                                  title="Manage Machine Access"
                                  className="text-orange-600 hover:text-orange-700"
                                >
                                  <Factory className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleSendPasswordReset(user.email!)}
                                  disabled={!user.email || saving}
                                  title="Send Password Reset Email"
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleToggleUserStatus(user)}
                                  disabled={user.uid === currentUser?.uid}
                                  title={user.active ? "Deactivate User" : "Activate User"}
                                >
                                  {user.active ? (
                                    <X className="h-4 w-4 text-red-600" />
                                  ) : (
                                    <Shield className="h-4 w-4 text-green-600" />
                                  )}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => openDeleteModal(user)}
                                  disabled={user.uid === currentUser?.uid || saving}
                                  title="Permanently Delete User"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Add New User</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAddModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.displayName}
                        onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                        placeholder="Enter full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="user@calibre.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Enter password (min 6 characters)"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Access Level</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value: User['role']) => setFormData({...formData, role: value})}
                      >
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L1">L1 - MD/RND (Full Access)</SelectItem>
                          <SelectItem value="L2">L2 - Lab In-charge</SelectItem>
                          <SelectItem value="L3">L3 - Certificate</SelectItem>
                          <SelectItem value="MachineUser">Machine User</SelectItem>
                          <SelectItem value="ViewOnly">View Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Machine Access</Label>
                      <div className="space-y-2 border rounded-lg p-3">
                        {(['G1', 'G2', 'G3'] as MachineType[]).map(machine => (
                          <label key={machine} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.machineAccess.includes(machine)}
                              onChange={() => toggleMachineAccess(machine)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm">{MACHINE_TESTS[machine].name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {formData.machineAccess.length > 0 && (
                      <div className="space-y-2">
                        <Label>Test Permissions</Label>
                        <div className="space-y-3 border rounded-lg p-3 max-h-48 overflow-y-auto">
                          {formData.machineAccess.map(machine => (
                            <div key={machine} className="space-y-2">
                              <h4 className="text-sm font-medium">{MACHINE_TESTS[machine].name}</h4>
                              <div className="pl-4 space-y-1">
                                {MACHINE_TESTS[machine].tests.map(test => (
                                  <label key={test.key} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={formData.testPermissions[`${machine.toLowerCase()}Tests`]?.includes(test.key) || false}
                                      onChange={() => toggleTestPermission(machine, test.key)}
                                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-xs">{test.label} ({test.unit})</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-blue-50 p-3 rounded-lg text-sm">
                      <p className="font-medium mb-1">Permissions for selected role:</p>
                      <div className="space-y-1 text-xs">
                        {formData.role === 'L1' && (
                          <>
                            <div>✓ Full system access</div>
                            <div>✓ Approve changes</div>
                            <div>✓ Modify reference numbers</div>
                            <div>✓ Receive email notifications</div>
                          </>
                        )}
                        {formData.role === 'L2' && (
                          <>
                            <div>✓ Input data</div>
                            <div>✓ Request edits (requires L1 approval)</div>
                          </>
                        )}
                        {formData.role === 'L3' && (
                          <div>✓ Basic data entry</div>
                        )}
                        {formData.role === 'ViewOnly' && (
                          <div>✓ Read-only access</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <Button variant="outline" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddUser} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create User'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit User - {editingUser.displayName || editingUser.email}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowEditModal(false)
                      resetCredentialChanges()
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Basic Information</h3>
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Full Name</Label>
                      <Input
                        id="edit-name"
                        value={editingUser.displayName || ''}
                        onChange={(e) => setEditingUser({...editingUser, displayName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="current-email">Current Email</Label>
                      <Input
                        id="current-email"
                        type="email"
                        value={editingUser.email || ''}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-role">Access Level</Label>
                      <Select
                        value={editingUser.role}
                        onValueChange={(value: User['role']) => setEditingUser({...editingUser, role: value})}
                      >
                        <SelectTrigger id="edit-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L1">L1 - MD/RND (Full Access)</SelectItem>
                          <SelectItem value="L2">L2 - Lab In-charge</SelectItem>
                          <SelectItem value="L3">L3 - Certificate</SelectItem>
                          <SelectItem value="MachineUser">Machine User</SelectItem>
                          <SelectItem value="ViewOnly">View Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-status">Status</Label>
                      <Select
                        value={editingUser.active ? "active" : "inactive"}
                        onValueChange={(value) => setEditingUser({...editingUser, active: value === "active"})}
                      >
                        <SelectTrigger id="edit-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Credential Changes */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Change Credentials</h3>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                      <p className="font-medium text-orange-800">🚨 Important Limitation:</p>
                      <p className="text-orange-700 mt-1 text-xs">
                        <strong>Current Implementation:</strong> Changes update system database only, NOT Firebase Authentication.
                      </p>
                      <p className="text-orange-700 mt-1 text-xs">
                        <strong>User Login:</strong> Will need to use password reset email to login with new credentials.
                      </p>
                      <p className="text-orange-700 mt-1 text-xs">
                        <strong>Workaround:</strong> System will offer to send password reset email automatically.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-email">New Email (Optional)</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={credentialChanges.newEmail}
                        onChange={(e) => setCredentialChanges({...credentialChanges, newEmail: e.target.value})}
                        placeholder="Enter new email address"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password (Optional)</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={credentialChanges.newPassword}
                        onChange={(e) => setCredentialChanges({...credentialChanges, newPassword: e.target.value})}
                        placeholder="Enter new password (min 6 characters)"
                      />
                    </div>
                    
                    {credentialChanges.newPassword && (
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={credentialChanges.confirmPassword}
                          onChange={(e) => setCredentialChanges({...credentialChanges, confirmPassword: e.target.value})}
                          placeholder="Confirm new password"
                        />
                        {credentialChanges.newPassword !== credentialChanges.confirmPassword && credentialChanges.confirmPassword && (
                          <p className="text-red-600 text-sm">Passwords do not match</p>
                        )}
                      </div>
                    )}
                    
                    {(credentialChanges.newEmail || credentialChanges.newPassword) && (
                      <div className="space-y-2">
                        <Label htmlFor="admin-password">Your Admin Password *</Label>
                        <Input
                          id="admin-password"
                          type="password"
                          value={credentialChanges.adminPassword}
                          onChange={(e) => setCredentialChanges({...credentialChanges, adminPassword: e.target.value})}
                          placeholder="Enter your admin password to confirm"
                        />
                        <p className="text-xs text-gray-600">
                          Required to authenticate credential changes
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => {
                    setShowEditModal(false)
                    resetCredentialChanges()
                  }}>
                    Cancel
                  </Button>
                  
                  {(credentialChanges.newEmail || credentialChanges.newPassword) && (
                    <Button 
                      onClick={handleCredentialChanges} 
                      disabled={saving}
                      variant="secondary"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating Credentials...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Update Credentials
                        </>
                      )}
                    </Button>
                  )}
                  
                  <Button onClick={handleEditUser} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Basic Info
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Page Permissions Modal */}
        {showPermissionsModal && permissionsUser && customPermissions && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-purple-600" />
                    Manage Page Permissions - {permissionsUser.displayName || permissionsUser.email}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowPermissionsModal(false)
                      setPermissionsUser(null)
                      setCustomPermissions(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Role Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Current Role: {permissionsUser.role}</h3>
                    <p className="text-blue-700 text-sm mb-3">
                      You can customize permissions below or reset to role defaults.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={resetToRoleDefaults}
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      Reset to Role Defaults
                    </Button>
                  </div>

                  {/* Permissions Grid */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Page-Specific Permissions</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Page</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">View</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Edit</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Create</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Delete</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Approve</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Object.entries(customPermissions).map(([page, permissions]) => {
                            if (typeof permissions === 'object' && permissions !== null && 'canView' in permissions) {
                              const pagePerms = permissions as PagePermissions
                              return (
                                <tr key={page} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                                    {page.replace(/([A-Z])/g, ' $1').trim()}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={pagePerms.canView}
                                      onChange={(e) => updatePagePermission(page as keyof UserPermissions, 'canView', e.target.checked)}
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={pagePerms.canEdit}
                                      onChange={(e) => updatePagePermission(page as keyof UserPermissions, 'canEdit', e.target.checked)}
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={pagePerms.canCreate}
                                      onChange={(e) => updatePagePermission(page as keyof UserPermissions, 'canCreate', e.target.checked)}
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={pagePerms.canDelete}
                                      onChange={(e) => updatePagePermission(page as keyof UserPermissions, 'canDelete', e.target.checked)}
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={pagePerms.canApprove || false}
                                      onChange={(e) => updatePagePermission(page as keyof UserPermissions, 'canApprove', e.target.checked)}
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                  </td>
                                </tr>
                              )
                            }
                            return null
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowPermissionsModal(false)
                        setPermissionsUser(null)
                        setCustomPermissions(null)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdatePermissions} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Permissions
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Machine Permissions Modal */}
        {showMachinePermissionsModal && editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit Permissions for {editingUser.displayName || editingUser.email}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMachinePermissionsModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Machine Access</Label>
                    <div className="space-y-2 border rounded-lg p-3">
                      {(['G1', 'G2', 'G3'] as MachineType[]).map(machine => (
                        <label key={machine} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editPermissions.machineAccess.includes(machine)}
                            onChange={() => toggleMachineAccess(machine, true)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm font-medium">{MACHINE_TESTS[machine].name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {editPermissions.machineAccess.length > 0 && (
                    <div className="space-y-2">
                      <Label>Test Permissions</Label>
                      <div className="space-y-3 border rounded-lg p-3 max-h-64 overflow-y-auto">
                        {editPermissions.machineAccess.map(machine => (
                          <div key={machine} className="space-y-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Factory className="h-4 w-4 text-blue-600" />
                              {MACHINE_TESTS[machine].name}
                            </h4>
                            <div className="pl-6 space-y-1">
                              {MACHINE_TESTS[machine].tests.map(test => (
                                <label key={test.key} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editPermissions.testPermissions[`${machine.toLowerCase()}Tests`]?.includes(test.key) || false}
                                    onChange={() => toggleTestPermission(machine, test.key, true)}
                                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="text-xs">{test.label} ({test.unit})</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium mb-2">Permission Summary</p>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-medium">Role:</span> {getRoleDisplayName(editingUser.role)}
                      </div>
                      <div>
                        <span className="font-medium">Machine Access:</span> {editPermissions.machineAccess.length > 0 ? editPermissions.machineAccess.join(', ') : 'None'}
                      </div>
                      {editPermissions.machineAccess.length > 0 && (
                        <div>
                          <span className="font-medium">Test Count:</span>
                          {editPermissions.machineAccess.map(machine => {
                            const testCount = editPermissions.testPermissions[`${machine.toLowerCase()}Tests`]?.length || 0
                            return (
                              <div key={machine} className="pl-4">
                                {machine}: {testCount} tests
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <Button variant="outline" onClick={() => setShowMachinePermissionsModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateMachinePermissions} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Permissions
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete User Confirmation Modal */}
        {showDeleteModal && userToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Permanently Delete User
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowDeleteModal(false)
                      setUserToDelete(null)
                      resetDeleteConfirmation()
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Warning Section */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <h3 className="font-semibold text-red-800">⚠️ DANGER ZONE ⚠️</h3>
                    </div>
                    <p className="text-red-700 text-sm mb-3">
                      You are about to <strong>permanently delete</strong> this user account. This action:
                    </p>
                    <ul className="text-red-700 text-sm space-y-1 ml-4">
                      <li>• <strong>Cannot be undone</strong></li>
                      <li>• Removes user from system database</li>
                      <li>• Revokes all permissions and access</li>
                      <li>• May leave orphaned data in the system</li>
                      <li>• Requires manual Firebase Auth cleanup</li>
                    </ul>
                  </div>

                  {/* User Information */}
                  <div className="bg-gray-50 border rounded-lg p-3">
                    <h4 className="font-medium text-gray-800 mb-2">User to be deleted:</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>Name:</strong> {userToDelete.displayName || 'N/A'}</div>
                      <div><strong>Email:</strong> {userToDelete.email}</div>
                      <div><strong>Role:</strong> {userToDelete.role}</div>
                      <div><strong>Status:</strong> {userToDelete.active ? 'Active' : 'Inactive'}</div>
                    </div>
                  </div>

                  {/* Confirmation Fields */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-password-delete">Your Admin Password *</Label>
                      <Input
                        id="admin-password-delete"
                        type="password"
                        value={deleteConfirmation.adminPassword}
                        onChange={(e) => setDeleteConfirmation({...deleteConfirmation, adminPassword: e.target.value})}
                        placeholder="Enter your admin password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmation-text">Type "DELETE" to confirm *</Label>
                      <Input
                        id="confirmation-text"
                        value={deleteConfirmation.confirmationText}
                        onChange={(e) => setDeleteConfirmation({...deleteConfirmation, confirmationText: e.target.value})}
                        placeholder="Type DELETE (in capitals)"
                        className={deleteConfirmation.confirmationText.toLowerCase() === 'delete' ? 'border-green-500' : ''}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="agree-delete"
                        checked={deleteConfirmation.agreeToDelete}
                        onChange={(e) => setDeleteConfirmation({...deleteConfirmation, agreeToDelete: e.target.checked})}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <Label htmlFor="agree-delete" className="text-sm text-gray-700">
                        I understand this action is permanent and cannot be undone *
                      </Label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowDeleteModal(false)
                        setUserToDelete(null)
                        resetDeleteConfirmation()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handlePermanentDelete}
                      disabled={
                        saving || 
                        !deleteConfirmation.adminPassword || 
                        deleteConfirmation.confirmationText.toLowerCase() !== 'delete' || 
                        !deleteConfirmation.agreeToDelete
                      }
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Permanently Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
} 

