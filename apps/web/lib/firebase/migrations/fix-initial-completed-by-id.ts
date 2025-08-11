import { collection, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config'

export async function fixInitialCompletedById() {
  console.log('Starting migration to fix initial completedById...')
  
  try {
    const testDataRef = collection(db, 'testData')
    const snapshot = await getDocs(testDataRef)
    
    let updatedCount = 0
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()
      let needsUpdate = false
      const updates: any = {}
      
      // Check G1 tests
      if (data.g1Tests && data.g1Tests.completedBy && !data.g1Tests.completedById) {
        updates['g1Tests.completedById'] = data.g1Tests.completedBy
        updates['g1Tests.completedAt'] = data.g1Tests.completedAt || serverTimestamp()
        needsUpdate = true
      }
      
      // Check G2 tests
      if (data.g2Tests && data.g2Tests.completedBy && !data.g2Tests.completedById) {
        updates['g2Tests.completedById'] = data.g2Tests.completedBy
        updates['g2Tests.completedAt'] = data.g2Tests.completedAt || serverTimestamp()
        needsUpdate = true
      }
      
      // Check G3 tests
      if (data.g3Tests && data.g3Tests.completedBy && !data.g3Tests.completedById) {
        updates['g3Tests.completedById'] = data.g3Tests.completedBy
        updates['g3Tests.completedAt'] = data.g3Tests.completedAt || serverTimestamp()
        needsUpdate = true
      }
      
      // Also check if the test was created by someone but doesn't have the initial machine test marked as completed
      if (data.createdBy && !data.g1Tests && !data.g2Tests && !data.g3Tests) {
        // This test was created but has no machine tests at all - this shouldn't happen
        console.log(`Test ${docSnap.id} has no machine tests but was created by ${data.createdBy}`)
      }
      
      if (needsUpdate) {
        await updateDoc(doc(db, 'testData', docSnap.id), updates)
        updatedCount++
        console.log(`Updated test ${docSnap.id}`)
      }
    }
    
    console.log(`Migration completed. Updated ${updatedCount} test records.`)
    return { success: true, updatedCount }
  } catch (error) {
    console.error('Migration failed:', error)
    return { success: false, error }
  }
}