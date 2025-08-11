import { db } from './config'
import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp,
  writeBatch,
  Timestamp,
  getDocs
} from 'firebase/firestore'

// Helper function to generate random values within range
const randomInRange = (min: number, max: number, decimals: number = 2) => {
  const value = Math.random() * (max - min) + min
  return parseFloat(value.toFixed(decimals))
}

// Helper function to generate dates
const generateDate = (daysAgo: number) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().split('T')[0]
}

export async function seedDatabase() {
  console.log('Starting database seeding...')
  
  // Initialize test parameters first (separate from batch)
  try {
    const { testParametersService } = await import('./services/test-parameters')
    await testParametersService.initializeDefaults()
    console.log('Test parameters initialized')
  } catch (error) {
    console.error('Error initializing test parameters:', error)
  }
  
  const batch = writeBatch(db)

  // 1. SEED PRODUCTS (Based on the provided image)
  const products = [
    {
      id: 'TD300-H-421',
      name: 'Teksil® TD 300-H-421',
      category: 'Insulating Rubber Silicone',
      specifications: [
        { property: 'Hardness', unit: 'Shore A', standard: 'ASTM D 2240', specification: '68±7', typicalValue: 68 },
        { property: 'Specific Gravity', unit: 'g/cm³', standard: 'ASTM D 792', specification: '1.5-1.6', typicalValue: 1.535 },
        { property: 'Tensile Strength', unit: 'N/mm²', standard: 'ISO 37', specification: '>4', typicalValue: 4.5 },
        { property: 'Elongation', unit: '%', standard: 'ISO 37', specification: '>150', typicalValue: 320 },
        { property: 'Tear Strength', unit: 'N/mm', standard: 'ASTM D 624 B', specification: '>15', typicalValue: 18 },
        { property: 'Dielectric Strength', unit: 'kV/mm', standard: 'IEC 60243', specification: '>18', typicalValue: 24 },
        { property: 'Tracking Resistance', unit: '1A4.5', standard: 'IEC 60587', specification: '1A4.5', typicalValue: '1A4.5' },
        { property: 'Flammability', unit: 'V', standard: 'IEC 60695-1', specification: 'V0', typicalValue: 'V0' },
        { property: 'Volume Resistivity', unit: 'Ω.cm', standard: 'IEC 62631', specification: '10¹³', typicalValue: '1.6Ex10¹³' },
        { property: 'Polymer Content', unit: '%', standard: 'ASTM E 1131', specification: '>30%', typicalValue: '33.4%' }
      ],
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: 'TD250-RI-421',
      name: 'Teksil® TD 250-RI-421',
      category: 'Insulating Rubber Silicone',
      specifications: [
        { property: 'Hardness', unit: 'Shore A', standard: 'ASTM D 2240', specification: '68±7', typicalValue: 68 },
        { property: 'Specific Gravity', unit: 'g/cm³', standard: 'ASTM D 792', specification: '1.5-1.6', typicalValue: 1.53 },
        { property: 'Tensile Strength', unit: 'N/mm²', standard: 'ISO 37', specification: '>4', typicalValue: 4.9 },
        { property: 'Elongation', unit: '%', standard: 'ISO 37', specification: '>150', typicalValue: 300 },
        { property: 'Tear Strength', unit: 'N/mm', standard: 'ASTM D 624 B', specification: '>15', typicalValue: 21 },
        { property: 'Dielectric Strength', unit: 'kV/mm', standard: 'IEC 60243', specification: '>18', typicalValue: 24 },
        { property: 'Tracking Resistance', unit: '1A4.5', standard: 'IEC 60587', specification: '1A4.5', typicalValue: '1A4.5' },
        { property: 'Flammability', unit: 'V', standard: 'IEC 60695-1', specification: 'V0', typicalValue: 'V0' },
        { property: 'Volume Resistivity', unit: 'Ω.cm', standard: 'IEC 62631', specification: '10¹³', typicalValue: '1.6Ex10¹³' },
        { property: 'Polymer Content', unit: '%', standard: 'ASTM E 1131', specification: '>30%', typicalValue: '33.4%' }
      ],
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: 'TD1133',
      name: 'Teksil® TD 1133',
      category: 'Insulating Rubber Silicone',
      specifications: [
        { property: 'Hardness', unit: 'Shore A', standard: 'ASTM D 2240', specification: '68±7', typicalValue: 68 },
        { property: 'Specific Gravity', unit: 'g/cm³', standard: 'ASTM D 792', specification: '1.65±0.05', typicalValue: 1.65 },
        { property: 'Tensile Strength', unit: 'N/mm²', standard: 'ISO 37', specification: '>4', typicalValue: 4.25 },
        { property: 'Elongation', unit: '%', standard: 'ISO 37', specification: '>125', typicalValue: 200 },
        { property: 'Tear Strength', unit: 'N/mm', standard: 'ASTM D 624 B', specification: '>8', typicalValue: 14 },
        { property: 'Dielectric Strength', unit: 'kV/mm', standard: 'IEC 60243', specification: '>17', typicalValue: 18 },
        { property: 'Tracking Resistance', unit: '1A3.5', standard: 'IEC 60587', specification: '1A3.5', typicalValue: '1A3.5' }
      ],
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: 'TD300-RI-421',
      name: 'Teksil® TD 300-RI-421',
      category: 'Insulating Rubber Silicone',
      specifications: [
        { property: 'Hardness', unit: 'Shore A', standard: 'ASTM D 2240', specification: '68±7', typicalValue: 68 },
        { property: 'Specific Gravity', unit: 'g/cm³', standard: 'ASTM D 792', specification: '1.5-1.6', typicalValue: 1.535 },
        { property: 'Tensile Strength', unit: 'N/mm²', standard: 'ISO 37', specification: '>4', typicalValue: 5.2 },
        { property: 'Elongation', unit: '%', standard: 'ISO 37', specification: '>150', typicalValue: 350 },
        { property: 'Tear Strength', unit: 'N/mm', standard: 'ASTM D 624 B', specification: '>15', typicalValue: 22 },
        { property: 'Dielectric Strength', unit: 'kV/mm', standard: 'IEC 60243', specification: '>18', typicalValue: 24 },
        { property: 'Tracking Resistance', unit: '1A4.5', standard: 'IEC 60587', specification: '1A4.5', typicalValue: '1A4.5' },
        { property: 'Flammability', unit: 'V', standard: 'IEC 60695-1', specification: 'V0', typicalValue: 'V0' },
        { property: 'Volume Resistivity', unit: 'Ω.cm', standard: 'IEC 62631', specification: '10¹³', typicalValue: '1.6Ex10¹³' },
        { property: 'Polymer Content', unit: '%', standard: 'ASTM E 1131', specification: '>30%', typicalValue: '33.4%' }
      ],
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: 'TD200-RI-421',
      name: 'Teksil® TD 200-RI-421',
      category: 'Insulating Rubber Silicone',
      specifications: [
        { property: 'Hardness', unit: 'Shore A', standard: 'ASTM D 2240', specification: '68±7', typicalValue: 68 },
        { property: 'Specific Gravity', unit: 'g/cm³', standard: 'ASTM D 792', specification: '1.55±0.03', typicalValue: 1.53 },
        { property: 'Tensile Strength', unit: 'N/mm²', standard: 'ISO 37', specification: '>4', typicalValue: 4.6 },
        { property: 'Elongation', unit: '%', standard: 'ISO 37', specification: '>150', typicalValue: 220 },
        { property: 'Tear Strength', unit: 'N/mm', standard: 'ASTM D 624 B', specification: '>13', typicalValue: 16 },
        { property: 'Dielectric Strength', unit: 'kV/mm', standard: 'IEC 60243', specification: '>17', typicalValue: 22 },
        { property: 'Tracking Resistance', unit: '1A4.5', standard: 'IEC 60587', specification: '1A4.5', typicalValue: '1A4.5' },
        { property: 'Flammability', unit: 'V', standard: 'IEC 60695-1', specification: 'V0', typicalValue: 'V0' },
        { property: 'Volume Resistivity', unit: 'Ω.cm', standard: 'IEC 62631', specification: '10¹³', typicalValue: '1x10¹³' },
        { property: 'Polymer Content', unit: '%', standard: 'ASTM E 1131', specification: '>20%', typicalValue: '33.3%' }
      ],
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  ]

  // Add products to batch
  products.forEach(product => {
    const productRef = doc(db, 'products', product.id)
    batch.set(productRef, product)
  })

  // 2. SEED TEST DATA
  const testDataEntries: any[] = []
  const batches = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']
  const operators = ['VIKRANT', 'AMIT', 'RAJESH', 'SURESH']
  const shifts = ['A', 'B', 'C']
  
  // Generate test data for each product
  products.forEach(product => {
    // Generate 3-5 batches per product
    const numBatches = Math.floor(Math.random() * 3) + 3
    
    for (let i = 0; i < numBatches; i++) {
      const batchNo = `${product.id}-${batches[i % batches.length]}-${Date.now().toString().slice(-4)}`
      const testDate = generateDate(Math.floor(Math.random() * 30)) // Random date within last 30 days
      
      // Generate 3-5 test entries per batch
      const numTests = Math.floor(Math.random() * 3) + 3
      
      for (let j = 0; j < numTests; j++) {
        const values: Record<string, number> = {}
        
        // Generate random values based on typical values from product specifications
        // For simplicity, we'll generate values around the typical values
        values['Hardness (ShA)'] = randomInRange(65, 71, 0)
        values['Density'] = randomInRange(1.50, 1.60, 2)
        values['TS-1'] = randomInRange(4.0, 5.0, 2)
        values['TS-2'] = randomInRange(4.0, 5.0, 2)
        values['TS-3'] = randomInRange(4.5, 5.5, 2)
        values['TS-4'] = randomInRange(5.0, 6.0, 2)
        values['Elongation %1'] = randomInRange(280, 320, 0)
        values['Elongation %2'] = randomInRange(270, 310, 0)
        values['Elongation %3'] = randomInRange(260, 300, 0)
        values['Elongation %4'] = randomInRange(250, 290, 0)
        values['Tear Strength'] = randomInRange(16, 22, 1)
        values['Mooney Viscosity'] = randomInRange(28, 32, 1)
        values['Rheo (TS2)'] = randomInRange(0.45, 0.55, 2)
        values['TS2'] = values['Rheo (TS2)'] * 60
        values['Rheo (TC90)'] = randomInRange(1.6, 1.9, 2)
        values['TC90'] = values['Rheo (TC90)'] * 60
        
        const testEntry = {
          productId: product.id,
          productName: product.name,
          batchNo,
          testDate,
          testTime: `${8 + Math.floor(Math.random() * 10)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`,
          operator: operators[Math.floor(Math.random() * operators.length)],
          shift: shifts[Math.floor(Math.random() * shifts.length)],
          line: ['lineA', 'lineB', 'line3'][Math.floor(Math.random() * 3)],
          recordNo: `${8000 + Math.floor(Math.random() * 1000)}`,
          shiftIncharge: 'S P Tiwari',
          values,
          status: Math.random() > 0.2 ? 'approved' : 'pending', // 80% approved
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: 'system-seed'
        }
        
        testDataEntries.push(testEntry)
      }
    }
  })

  // Add test data to batch
  testDataEntries.forEach((entry, index) => {
    const testRef = doc(collection(db, 'testData'))
    batch.set(testRef, entry)
  })

  // 3. SEED CERTIFICATES
  const customers = [
    { name: 'ABC Industries Ltd.', address: '123 Industrial Area, Mumbai, Maharashtra 400001' },
    { name: 'XYZ Manufacturing Co.', address: '456 Factory Road, Pune, Maharashtra 411001' },
    { name: 'PQR Enterprises', address: '789 Business Park, Bangalore, Karnataka 560001' },
    { name: 'LMN Corporation', address: '321 Tech City, Hyderabad, Telangana 500001' },
    { name: 'DEF Solutions Pvt. Ltd.', address: '654 Innovation Hub, Chennai, Tamil Nadu 600001' }
  ]

  // Generate certificates for some approved batches
  const certificatePromises = []
  let certificateCount = 0
  
  // Group test data by batch
  const batchGroups = testDataEntries.reduce((acc, test) => {
    if (test.status === 'approved') {
      if (!acc[test.batchNo]) {
        acc[test.batchNo] = []
      }
      acc[test.batchNo].push(test)
    }
    return acc
  }, {} as Record<string, typeof testDataEntries>)

  // Create certificates for some batches
  Object.entries(batchGroups).slice(0, 10).forEach(([batchNo, tests], index) => {
    const product = products.find(p => p.id === (tests as any)[0].productId)
    if (!product) return

    const customer = customers[index % customers.length]
    if (!customer) return
    const certificateNo = `COA-2025-${String(index + 1).padStart(4, '0')}`
    
    // Calculate mean values for the batch
    const meanValues: Record<string, number> = {}
    const testParameters = [
      'Hardness (ShA)', 'Density', 'TS-1', 'TS-2', 'TS-3', 'TS-4',
      'Elongation %1', 'Elongation %2', 'Elongation %3', 'Elongation %4',
      'Tear Strength', 'Mooney Viscosity', 'Rheo (TS2)', 'TS2', 'Rheo (TC90)', 'TC90'
    ]
    
    testParameters.forEach(param => {
      const values = (tests as any).map((t: any) => t.values[param]).filter((v: any) => v !== undefined)
      if (values.length > 0) {
        meanValues[param] = parseFloat((values.reduce((a: any, b: any) => a + b, 0) / values.length).toFixed(2))
      }
    })

    const certificate = {
      certificateNo,
      productId: product.id,
      productName: product.name,
      batchNo,
      customerName: customer.name,
      customerAddress: customer.address,
      invoiceNo: `INV-2025-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
      supplyQuantity: `${Math.floor(Math.random() * 900) + 100} kg`,
      lotNo: `LOT-${batchNo}`,
      testData: {
        parameters: testParameters.map(param => ({
          name: param,
          obtainedValue: meanValues[param]?.toString() || 'N/A'
        }))
      },
      issueDate: generateDate(Math.floor(Math.random() * 10)),
      status: 'issued',
      templateId: 'default',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'system-seed',
      approvedBy: 'system-seed',
      approvedAt: serverTimestamp()
    }

    const certRef = doc(collection(db, 'certificates'))
    batch.set(certRef, certificate)
    certificateCount++
  })

  // 4. SEED AUDIT TRAIL ENTRIES
  const auditEntries = [
    {
      userId: 'system-seed',
      userEmail: 'system@calibre.com',
      userName: 'System',
      action: 'Database seeded',
      entityType: 'system',
      details: `Seeded ${products.length} products, ${testDataEntries.length} test entries, and ${certificateCount} certificates`,
      timestamp: serverTimestamp()
    }
  ]

  auditEntries.forEach(entry => {
    const auditRef = doc(collection(db, 'auditTrail'))
    batch.set(auditRef, entry)
  })

  // Commit all changes
  try {
    await batch.commit()
    console.log('Database seeded successfully!')
    console.log(`Added:
      - ${products.length} products
      - ${testDataEntries.length} test data entries
      - ${certificateCount} certificates
      - ${auditEntries.length} audit entries
    `)
    return {
      products: products.length,
      testData: testDataEntries.length,
      certificates: certificateCount,
      auditTrail: auditEntries.length
    }
  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  }
}

// Function to clear all data (use with caution!)
export async function clearDatabase() {
  console.log('Clearing database...')
  
  const collections = ['products', 'testData', 'certificates', 'auditTrail', 'testParameters']
  
  for (const collectionName of collections) {
    const snapshot = await getDocs(collection(db, collectionName))
    const batch = writeBatch(db)
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })
    
    await batch.commit()
    console.log(`Cleared ${snapshot.size} documents from ${collectionName}`)
  }
  
  console.log('Database cleared!')
}

// Function to reseed with correct dates
export async function reseedDatabase() {
  console.log('Reseeding database with correct dates...')
  await clearDatabase()
  await seedDatabase()
  console.log('Database reseeded successfully!')
} 