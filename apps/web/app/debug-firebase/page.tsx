'use client'

import { useState, useEffect } from 'react'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { productsService } from '@/lib/firebase/services/products'
import { db } from '@/lib/firebase/config'
import { collection, getDocs } from 'firebase/firestore'

export default function DebugFirebasePage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>({})

  const testFirebaseConnection = async () => {
    setLoading(true)
    const testResults: any = {}

    try {
      // Test 1: Basic Firestore connection
      testResults.firestoreConnection = 'Testing...'
      const testCollection = collection(db, 'test')
      testResults.firestoreConnection = '✅ Connected to Firestore'
    } catch (error) {
      testResults.firestoreConnection = `❌ Failed: ${error}`
    }

    try {
      // Test 2: Get all products (no query)
      testResults.rawProducts = 'Fetching...'
      const snapshot = await getDocs(collection(db, 'products'))
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      testResults.rawProducts = `✅ Found ${products.length} products: ${JSON.stringify(products, null, 2)}`
    } catch (error) {
      testResults.rawProducts = `❌ Failed: ${error}`
    }

    try {
      // Test 3: Get products using service (with orderBy)
      testResults.serviceGetAll = 'Testing...'
      const products = await productsService.getAll()
      testResults.serviceGetAll = `✅ Service returned ${products.length} products`
    } catch (error) {
      testResults.serviceGetAll = `❌ Failed: ${error}`
    }

    try {
      // Test 4: Get active products
      testResults.serviceGetActive = 'Testing...'
      const products = await productsService.getActive()
      testResults.serviceGetActive = `✅ Found ${products.length} active products`
    } catch (error) {
      testResults.serviceGetActive = `❌ Failed: ${error}`
    }

    try {
      // Test 5: Get all test data
      testResults.testDataAll = 'Fetching...'
      const snapshot = await getDocs(collection(db, 'testData'))
      const testData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      testResults.testDataAll = `✅ Found ${testData.length} test data entries: ${JSON.stringify(testData.slice(0, 2), null, 2)}`
    } catch (error) {
      testResults.testDataAll = `❌ Failed: ${error}`
    }

    setResults(testResults)
    setLoading(false)
  }

  useEffect(() => {
    testFirebaseConnection()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Firebase Debug Page</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={testFirebaseConnection} disabled={loading}>
              {loading ? 'Testing...' : 'Run Tests'}
            </Button>
            
            <div className="space-y-2">
              {Object.entries(results).map(([test, result]) => (
                <div key={test} className="p-3 bg-gray-50 rounded">
                  <div className="font-semibold">{test}:</div>
                  <pre className="text-sm whitespace-pre-wrap">{String(result)}</pre>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 