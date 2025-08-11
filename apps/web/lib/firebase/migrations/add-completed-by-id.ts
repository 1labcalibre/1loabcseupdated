import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '../config'

/**
 * Migration to add completedById field to existing test data
 * This will copy the completedBy field to completedById for existing records
 */
export async function addCompletedByIdMigration() {
  console.log('Starting migration: Adding completedById to test data...')
  
  try {
    const testDataRef = collection(db, 'test-data')
    const snapshot = await getDocs(testDataRef)
    
    let updated = 0
    
    for (const testDoc of snapshot.docs) {
      const data = testDoc.data()
      let needsUpdate = false
      const updates: any = {}
      
      // Check G1 tests
      if (data.g1Tests && data.g1Tests.completedBy && !data.g1Tests.completedById) {
        updates['g1Tests.completedById'] = data.g1Tests.completedBy
        needsUpdate = true
      }
      
      // Check G2 tests
      if (data.g2Tests && data.g2Tests.completedBy && !data.g2Tests.completedById) {
        updates['g2Tests.completedById'] = data.g2Tests.completedBy
        needsUpdate = true
      }
      
      // Check G3 tests
      if (data.g3Tests && data.g3Tests.completedBy && !data.g3Tests.completedById) {
        updates['g3Tests.completedById'] = data.g3Tests.completedBy
        needsUpdate = true
      }
      
      if (needsUpdate) {
        await updateDoc(doc(db, 'test-data', testDoc.id), updates)
        updated++
        console.log(`Updated test ${testDoc.id}`)
      }
    }
    
    console.log(`Migration complete. Updated ${updated} test records.`)
    return { success: true, updated }
  } catch (error) {
    console.error('Migration failed:', error)
    return { success: false, error }
  }
} 

