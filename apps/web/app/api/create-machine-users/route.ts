import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { auth } from '@/lib/firebase/config'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { MACHINE_TESTS } from '@/lib/firebase/utils/test-helpers'

export async function POST(request: NextRequest) {
  try {
    // Define machine users
    const machineUsers = [
      {
        email: 'g1operator@calibre.com',
        password: 'calibre123',
        displayName: 'G1 Machine Operator',
        role: 'L3',
        machineAccess: ['G1'],
        testPermissions: {
          g1Tests: MACHINE_TESTS.G1.tests.map(t => t.key)
        }
      },
      {
        email: 'g2operator@calibre.com',
        password: 'calibre123',
        displayName: 'G2 Machine Operator',
        role: 'L3',
        machineAccess: ['G2'],
        testPermissions: {
          g2Tests: MACHINE_TESTS.G2.tests.map(t => t.key)
        }
      },
      {
        email: 'g3operator@calibre.com',
        password: 'calibre123',
        displayName: 'G3 Machine Operator',
        role: 'L3',
        machineAccess: ['G3'],
        testPermissions: {
          g3Tests: MACHINE_TESTS.G3.tests.map(t => t.key)
        }
      },
      {
        email: 'labincharge@calibre.com',
        password: 'calibre123',
        displayName: 'Lab In-charge',
        role: 'L2',
        machineAccess: ['G1', 'G2', 'G3'],
        testPermissions: {
          g1Tests: MACHINE_TESTS.G1.tests.map(t => t.key),
          g2Tests: MACHINE_TESTS.G2.tests.map(t => t.key),
          g3Tests: MACHINE_TESTS.G3.tests.map(t => t.key)
        }
      }
    ]

    const createdUsers = []

    for (const userData of machineUsers) {
      try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          userData.email,
          userData.password
        )

        // Update display name
        await updateProfile(userCredential.user, {
          displayName: userData.displayName
        })

        // Create user document in Firestore
        const permissions = {
          canApprove: userData.role === 'L1',
          canEdit: userData.role === 'L1' || userData.role === 'L2',
          canView: true,
          canDelete: userData.role === 'L1',
          canModifyReferenceNo: userData.role === 'L1'
        }

        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          permissions,
          machineAccess: userData.machineAccess,
          testPermissions: userData.testPermissions,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })

        createdUsers.push({
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          machineAccess: userData.machineAccess
        })
      } catch (error: any) {
        // If user already exists, skip
        if (error.code === 'auth/email-already-in-use') {
          console.log(`User ${userData.email} already exists, skipping...`)
        } else {
          console.error(`Error creating user ${userData.email}:`, error)
        }
      }
    }

    return NextResponse.json({
      message: 'Machine users created successfully',
      users: createdUsers
    })
  } catch (error) {
    console.error('Error creating machine users:', error)
    return NextResponse.json(
      { error: 'Failed to create machine users' },
      { status: 500 }
    )
  }
} 

