import { collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore'
import { db } from '../config'
import { TestData, generateReferenceNo } from '../services/test-data'

// Migration script to update existing test data to new schema
export async function migrateTestData() {
  console.log('Starting test data migration...')
  
  try {
    const testDataCollection = collection(db, 'testData')
    const snapshot = await getDocs(testDataCollection)
    
    if (snapshot.empty) {
      console.log('No test data to migrate')
      return
    }
    
    const batch = writeBatch(db)
    let updateCount = 0
    
    snapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data() as any
      const docRef = doc(db, 'testData', docSnapshot.id)
      
      // Check if already migrated
      if (data.referenceNo && data.currentStage) {
        console.log(`Document ${docSnapshot.id} already migrated, skipping...`)
        return
      }
      
      // Generate reference number if missing
      let referenceNo = data.referenceNo
      if (!referenceNo && data.productCode && data.shift && data.batchNo) {
        referenceNo = generateReferenceNo(
          data.productCode,
          data.shift || 'A',
          data.batchNo
        )
      }
      
      // Migrate values to machine-specific tests
      const updates: any = {
        referenceNo: referenceNo || `LEGACY-${docSnapshot.id}`,
        shift: data.shift || 'A',
        status: 'completed', // Assume legacy data is completed
        currentStage: 'COMPLETED'
      }
      
      // If values exist, distribute them to appropriate machine tests
      if (data.values) {
        // G1 Tests
        if (data.values.hardness || data.values.density) {
          updates.g1Tests = {
            hardness: data.values.hardness,
            density: data.values.density,
            completedBy: data.createdBy || 'legacy',
            completedAt: data.createdAt
          }
        }
        
        // G2 Tests
        const g2TestKeys = ['ts1', 'ts2', 'ts3', 'ts4', 'elongation1', 'elongation2', 'elongation3', 'elongation4', 'tearStrength']
        const hasG2Tests = g2TestKeys.some(key => data.values[key] !== undefined)
        
        if (hasG2Tests) {
          updates.g2Tests = {
            completedBy: data.createdBy || 'legacy',
            completedAt: data.createdAt
          }
          
          g2TestKeys.forEach(key => {
            if (data.values[key] !== undefined) {
              updates.g2Tests[key] = data.values[key]
            }
          })
        }
        
        // G3 Tests
        const g3TestKeys = ['mooneyViscosity', 'rheoTS2Min', 'rheoTS2Sec', 'rheoTC90Min', 'rheoTC90Sec']
        const hasG3Tests = g3TestKeys.some(key => data.values[key] !== undefined)
        
        if (hasG3Tests) {
          updates.g3Tests = {
            completedBy: data.createdBy || 'legacy',
            completedAt: data.createdAt
          }
          
          g3TestKeys.forEach(key => {
            if (data.values[key] !== undefined) {
              updates.g3Tests[key] = data.values[key]
            }
          })
        }
      }
      
      batch.update(docRef, updates)
      updateCount++
    })
    
    if (updateCount > 0) {
      await batch.commit()
      console.log(`Successfully migrated ${updateCount} test data records`)
    } else {
      console.log('No records needed migration')
    }
    
  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  }
}

// Helper function to check if a document needs migration
export async function checkMigrationStatus() {
  const testDataCollection = collection(db, 'testData')
  const snapshot = await getDocs(testDataCollection)
  
  let migrated = 0
  let needsMigration = 0
  
  snapshot.docs.forEach((doc) => {
    const data = doc.data()
    if (data.referenceNo && data.currentStage) {
      migrated++
    } else {
      needsMigration++
    }
  })
  
  return {
    total: snapshot.size,
    migrated,
    needsMigration
  }
} 