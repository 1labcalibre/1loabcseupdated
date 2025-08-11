"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { Plus, Save, Trash2, ArrowLeft, Copy, QrCode, Camera, Filter, FileText, Loader2, Factory, AlertCircle, CheckCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { productsService, type Product } from "@/lib/firebase/services/products"
import { testDataService, type TestData, generateReferenceNo } from "@/lib/firebase/services/test-data"
import { testParametersService, type TestParameter } from "@/lib/firebase/services/test-parameters"
import { notificationsService } from "@/lib/firebase/services/notifications"
import { MACHINE_TESTS, getMachineTests, SHIFT_OPTIONS } from "@/lib/firebase/utils/test-helpers"
import { validateTestValue, getRangeDisplay, hasOutOfRangeValues } from "@/lib/firebase/utils/range-validation"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { serverTimestamp } from "firebase/firestore"

export default function TestEntryPage() {
  const { user, userData, getRedirectPath } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const referenceNo = searchParams.get('referenceNo') || searchParams.get('ref')
  
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [testParameters, setTestParameters] = useState<TestParameter[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [existingTestData, setExistingTestData] = useState<TestData | null>(null)
  // Removed currentMachine state - now showing all accessible machines
  const [allowedTests, setAllowedTests] = useState<any[]>([])
  const [userMachines, setUserMachines] = useState<string[]>([])
  
  // Form data
  const [formData, setFormData] = useState({
    recordNo: "",
    date: new Date().toISOString().split('T')[0],
    shift: "",
    productId: "",
    shiftIncharge: "",
    testedBy: "", // Initialize as empty string, will be set in useEffect
    line: "",
    batchNo: "",
    referenceNo: "",
    weight: "" // Added for certificate generation
  })
  
  // Test values for current machine
  const [testValues, setTestValues] = useState<Record<string, string>>({})
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmChecked, setConfirmChecked] = useState(false)
  
  // Range validation state
  const [validationResults, setValidationResults] = useState<Record<string, { isValid: boolean, message?: string, range?: string }>>({})
  const [hasInvalidValues, setHasInvalidValues] = useState(false)
  
  // Effect to recalculate hasInvalidValues whenever validation results or test values change
  useEffect(() => {
    const hasInvalid = Object.entries(validationResults).some(([key, v]) => {
      const fieldHasValue = (testValues as any)[key];
      const isInvalid = fieldHasValue && !(v as any).isValid;
      if (isInvalid) {
        console.log(`Invalid validation found for ${key}:`, { value: (testValues as any)[key], validation: v });
      }
      return isInvalid;
    });
    console.log('Recalculating hasInvalidValues:', { hasInvalid, validationResults, testValues });
    setHasInvalidValues(hasInvalid);
  }, [validationResults, testValues])

  // Check user's machine access - exactly like dashboard
  useEffect(() => {
    if (userData) {
      // Set machines exactly like dashboard does
      const machines = userData.machineAccess || []
      setUserMachines(machines)
      
      // Update testedBy when userData changes
      setFormData(prev => ({
        ...prev,
        testedBy: userData.displayName || userData.email || ""
      }))
      
      // Check if user is admin (only L1 and L2 are admins)
      const isAdmin = ['L1', 'L2'].includes(userData.role)
      
      if (isAdmin) {
        // Admins can access all machines
        setUserMachines(['G1', 'G2', 'G3'])
        
        // Get all tests for all machines
        const tests: any[] = []
        const allMachines = ['G1', 'G2', 'G3'] as const
        
        allMachines.forEach(machine => {
          const machineTests = getMachineTests(machine)
          machineTests.forEach(test => {
            tests.push({
              ...test,
              machine
            })
          })
        })
        
        setAllowedTests(tests)
      } else {
        // Regular users - use their machine access
        const tests: any[] = []
        
        // For each machine the user has access to, add ALL tests for that machine
        machines.forEach(machine => {
          const machineTests = getMachineTests(machine as any)
          machineTests.forEach(test => {
            tests.push({
              ...test,
              machine
            })
          })
        })
        
        setAllowedTests(tests)
      }
    } else {
      // Clear when no user data
      setAllowedTests([])
      setUserMachines([])
    }
  }, [userData])

  // Load reference number data if provided
  useEffect(() => {
    if (referenceNo && products.length > 0) {
      loadExistingTest(referenceNo)
    }
  }, [referenceNo, products])

  useEffect(() => {
    loadProducts()
    if (userData?.role === 'L1' || userData?.role === 'L2') {
      loadTestParameters()
    }
  }, [userData])

  // Auto-generate reference number when product, shift, or batch changes
  useEffect(() => {
    if (selectedProduct && formData.shift && formData.batchNo && !existingTestData && !referenceNo) {
      const refNo = generateReferenceNo(
        selectedProduct.internalCode || selectedProduct.name.substring(0, 4).toUpperCase(),
        formData.shift,
        formData.batchNo
      )
      setFormData(prev => ({ ...prev, referenceNo: refNo }))
    }
  }, [selectedProduct, formData.shift, formData.batchNo, existingTestData, referenceNo])

  const loadExistingTest = async (refNo: string) => {
    try {
      setLoading(true)
      const testData = await testDataService.getByReferenceNo(refNo)
      
      if (testData) {
        setExistingTestData(testData)
        
        // Set form data
        setFormData({
          recordNo: testData.recordNo || "",
          date: testData.testDate || "",
          shift: testData.shift || "",
          productId: testData.productId || "",
          shiftIncharge: testData.shiftIncharge || "",
          testedBy: userData?.displayName || userData?.email || "",
          line: testData.line || "",
          batchNo: testData.batchNo || "",
          referenceNo: testData.referenceNo || "",
          weight: testData.weight || ""
        })
        
        // Find and set the product
        const product = products.find(p => p.id === testData.productId)
        if (product) {
          setSelectedProduct(product)
        }
        
        // Load existing test values
        const existingTestValues: Record<string, string> = {}
        
        // Load G1, G2, G3 test values if they exist
        if (testData.g1Tests) {
          Object.entries(testData.g1Tests).forEach(([key, value]) => {
            existingTestValues[key] = String(value)
          })
        }
        if (testData.g2Tests) {
          Object.entries(testData.g2Tests).forEach(([key, value]) => {
            existingTestValues[key] = String(value)
          })
        }
        if (testData.g3Tests) {
          Object.entries(testData.g3Tests).forEach(([key, value]) => {
            existingTestValues[key] = String(value)
          })
        }
        
        setTestValues(existingTestValues)
        
        // Determine which machine stage we're at
        const isAdmin = ['L1', 'L2'].includes(userData?.role || '')
        
        // No need to set current machine anymore - all accessible machines are shown
      }
    } catch (error) {
      console.error('Error loading test data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const data = await productsService.getActive()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const loadTestParameters = async () => {
    try {
      const data = await testParametersService.getAll()
      setTestParameters(data)
    } catch (error) {
      console.error('Error loading test parameters:', error)
    }
  }

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId)
    setSelectedProduct(product || null)
    setFormData({ ...formData, productId })
  }

  const generateNewReferenceNo = () => {
    if (selectedProduct && formData.shift && formData.batchNo) {
      const refNo = generateReferenceNo(
        selectedProduct.internalCode || selectedProduct.name.substring(0, 4).toUpperCase(),
        formData.shift,
        formData.batchNo
      )
      setFormData({ ...formData, referenceNo: refNo })
    }
  }

  const handleSave = async () => {
    if (!selectedProduct || !formData.batchNo || !formData.shift) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      
      // Check for out-of-range values
      const outOfRangeValues: Record<string, { value: number, expected: string, actual: string }> = {}
      let isHoldRequired = false
      
      Object.entries(testValues).forEach(([key, value]) => {
        if (value && selectedProduct?.specifications) {
          const numValue = parseFloat(value)
          if (!isNaN(numValue)) {
            let validationKey = key;
            let validationValue = numValue;
            
            // Special handling for Rheo tests - validate the converted seconds value
            if (key === 'rheoTS2Min') {
              validationKey = 'rheoTS2Sec';
              validationValue = numValue * 60; // Convert to seconds for validation
            } else if (key === 'rheoTC90Min') {
              validationKey = 'rheoTC90Sec';
              validationValue = numValue * 60; // Convert to seconds for validation
            }
            
            const validation = validateTestValue(validationKey, validationValue, selectedProduct.specifications)
            if (!validation.isValid) {
              isHoldRequired = true
              outOfRangeValues[key] = {
                value: validationValue, // Store the validated value (converted if applicable)
                expected: validation.range || 'Unknown range',
                actual: `${validationValue}`
              }
            }
          }
        }
      })
      
      if (existingTestData) {
        // Update existing test with data for all accessible machines
        
        // Save data for each machine the user has access to
        for (const machine of userMachines) {
          const machineKey = `${machine.toLowerCase()}Tests` as 'g1Tests' | 'g2Tests' | 'g3Tests';
          
          // Skip if this machine's tests are already completed
          if (existingTestData[machineKey]) continue;
          
          // Prepare test values for this machine
          const machineTestData: any = {
            completedBy: userData?.uid || '',
            completedById: userData?.uid || '',
            completedAt: serverTimestamp()
          }
          
          // Get test values for this machine
          const machineTests = allowedTests.filter(test => test.machine === machine);
          let hasValues = false;
          
          machineTests.forEach(test => {
            const value = testValues[test.key]
            if (value) {
              machineTestData[test.key] = parseFloat(value)
              hasValues = true;
            }
          })
          
          // Only save if there are values for this machine
          if (hasValues) {
            if (machine === 'G1') {
              await testDataService.updateG1Tests(existingTestData.id!, machineTestData, userData?.uid || '')
            } else if (machine === 'G2') {
              await testDataService.updateG2Tests(existingTestData.id!, machineTestData, userData?.uid || '')
            } else if (machine === 'G3') {
              await testDataService.updateG3Tests(existingTestData.id!, machineTestData, userData?.uid || '')
            }
          }
        }
        
        // Remove notification for this user since they completed their test
        await notificationsService.removeTestNotificationForUser(userData?.uid || '', existingTestData.referenceNo)
        
        // If hold is required, mark the test as hold
        if (isHoldRequired) {
          console.log('Marking test as hold:', existingTestData.id, outOfRangeValues)
          await testDataService.markAsHold(
            existingTestData.id!,
            'Out of specification range values detected',
            userData?.uid || '',
            outOfRangeValues
          )
          console.log('Test marked as hold successfully')
          alert('Test data saved but marked as HOLD due to out-of-range values. Admin review required.')
        } else {
          alert('Test data saved successfully!')
        }
        router.push(getRedirectPath())
      } else {
        // Create new test - any machine operator can create
        // Generate reference number if not set
        if (!formData.referenceNo) {
          const refNo = generateReferenceNo(
            selectedProduct.internalCode || selectedProduct.name.substring(0, 4).toUpperCase(),
            formData.shift,
            formData.batchNo
          )
          setFormData({ ...formData, referenceNo: refNo })
        }
        
        const testData: Omit<TestData, 'id'> = {
          referenceNo: formData.referenceNo || generateReferenceNo(
            selectedProduct.internalCode || selectedProduct.name.substring(0, 4).toUpperCase(),
            formData.shift,
            formData.batchNo
          ),
          productId: selectedProduct.id!,
          productName: selectedProduct.name,
          productCode: selectedProduct.internalCode || selectedProduct.name.substring(0, 4).toUpperCase(),
          batchNo: formData.batchNo,
          shift: formData.shift as 'A' | 'B' | 'C',
          testDate: formData.date!,
          testTime: new Date().toTimeString().split(' ')[0] || '00:00:00',
          recordNo: formData.recordNo,
          shiftIncharge: formData.shiftIncharge,
          operator: formData.testedBy,
          line: formData.line,
          weight: formData.weight, // Added for certificate generation
          status: 'pending_g1',  // Will be updated based on which tests are completed
          currentStage: 'G1'     // Will be updated based on which tests are completed
        }
        
        // Add test data for all accessible machines
        
        // Prepare test data for each accessible machine
        userMachines.forEach(machine => {
          const machineTests = allowedTests.filter(test => test.machine === machine);
          const machineTestData: any = {
            completedBy: userData?.uid || '',
            completedById: userData?.uid || '',
            completedAt: serverTimestamp()
          }
          
          let hasValues = false;
          machineTests.forEach(test => {
            const value = testValues[test.key]
            if (value) {
              machineTestData[test.key] = parseFloat(value)
              hasValues = true;
            }
          })
          
          // Only add if there are values for this machine
          if (hasValues) {
            if (machine === 'G1') {
              testData.g1Tests = machineTestData
            } else if (machine === 'G2') {
              testData.g2Tests = machineTestData
            } else if (machine === 'G3') {
              testData.g3Tests = machineTestData
            }
          }
        })
        
        // Update status based on which tests have been completed
        if (testData.g1Tests && testData.g2Tests && testData.g3Tests) {
          testData.status = 'completed'
          testData.currentStage = 'COMPLETED'
        } else if (testData.g1Tests && testData.g2Tests) {
          testData.status = 'pending_g3'
          testData.currentStage = 'G3'
        } else if (testData.g1Tests) {
          testData.status = 'pending_g2'
          testData.currentStage = 'G2'
        } else if (testData.g2Tests || testData.g3Tests) {
          testData.status = 'pending_g1'
          testData.currentStage = 'G1'
        }
        
        const testId = await testDataService.create(testData, userData?.uid || '')
        
        // If hold is required, mark the test as hold
        if (isHoldRequired) {
          console.log('Marking new test as hold:', testId, outOfRangeValues)
          await testDataService.markAsHold(
            testId,
            'Out of specification range values detected',
            userData?.uid || '',
            outOfRangeValues
          )
          console.log('New test marked as hold successfully')
          alert('Test created but marked as HOLD due to out-of-range values. Admin review required.')
        } else {
          // Notify machine operators who haven't completed their tests (only if not on hold)
          const allMachines: ('G1' | 'G2' | 'G3')[] = ['G1', 'G2', 'G3']
          const pendingMachines = allMachines.filter(m => {
            const machineKey = `${m.toLowerCase()}Tests` as 'g1Tests' | 'g2Tests' | 'g3Tests'
            return !testData[machineKey]
          })
          
          for (const machine of pendingMachines) {
            await notificationsService.notifyMachineOperators(
              machine,
              testData.referenceNo,
              testId,
              userMachines.join(', '), // Show all machines that completed
              userData?.uid
            )
          }
          
          alert('Test created successfully!')
        }
        router.push(getRedirectPath())
      }
    } catch (error) {
      console.error('Error saving test:', error)
      alert('Failed to save test data')
    } finally {
      setSaving(false)
    }
  }

  // Check if user has permission to access this page
  const hasAccess = userData && (
    // Admins always have access
    ['L1', 'L2'].includes(userData.role) ||
    // Users with edit permissions have access
    userData.permissions.canEdit || 
    // Users with machine access have access
    (userData.machineAccess && userData.machineAccess.length > 0)
  )

  if (!hasAccess) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl text-red-600">Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                You don't have permission to access the test entry page. 
                Please contact your administrator to assign machine access.
              </p>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
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
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">Test Entry</h1>
                  <p className="text-sm text-gray-600">
                    Enter test values for all assigned machines
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {existingTestData && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Reference:</span> {existingTestData.referenceNo}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 sm:px-6 py-8">
          <div className="grid gap-6">
            {/* Test Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Test Information</CardTitle>
                <CardDescription>
                  {existingTestData 
                    ? 'Continue entering test data'
                    : 'Enter basic test information'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. Product * */}
                  <div className="space-y-2">
                    <Label htmlFor="product">Product *</Label>
                    <Select 
                      value={formData.productId} 
                      onValueChange={handleProductChange}
                      disabled={!!existingTestData}
                    >
                      <SelectTrigger id="product">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id!}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Line */}
                  <div className="space-y-2">
                    <Label htmlFor="line">Line *</Label>
                    <Select 
                      value={formData.line} 
                      onValueChange={(value) => setFormData({ ...formData, line: value })}
                      disabled={!!existingTestData}
                    >
                      <SelectTrigger id="line">
                        <SelectValue placeholder="Select Line" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lineA">Line A</SelectItem>
                        <SelectItem value="lineB">Line B</SelectItem>
                        <SelectItem value="lineC">Line C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3. Shift * */}
                  <div className="space-y-2">
                    <Label htmlFor="shift">Shift *</Label>
                    <Select 
                      value={formData.shift} 
                      onValueChange={(value) => setFormData({ ...formData, shift: value })}
                      disabled={!!existingTestData}
                    >
                      <SelectTrigger id="shift">
                        <SelectValue placeholder="Select Shift" />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIFT_OPTIONS.map((shift) => (
                          <SelectItem key={shift.value} value={shift.value}>
                            {shift.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 4. Batch No * */}
                  <div className="space-y-2">
                    <Label htmlFor="batchNo">Batch No *</Label>
                    <Input
                      id="batchNo"
                      value={formData.batchNo}
                      onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                      placeholder="Enter batch number"
                      disabled={!!existingTestData}
                      onBlur={generateNewReferenceNo}
                    />
                  </div>

                  {/* 5. Test Date */}
                  <div className="space-y-2">
                    <Label htmlFor="date">Test Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      disabled={!!existingTestData}
                    />
                  </div>

                  {/* 6. Record No */}
                  <div className="space-y-2">
                    <Label htmlFor="recordNo">Record No</Label>
                    <Input
                      id="recordNo"
                      value={formData.recordNo}
                      onChange={(e) => setFormData({ ...formData, recordNo: e.target.value })}
                      placeholder="Optional"
                      disabled={!!existingTestData}
                    />
                  </div>

                  {/* 7. Reference No */}
                  <div className="space-y-2">
                    <Label htmlFor="referenceNo">Reference No</Label>
                    <Input
                      id="referenceNo"
                      value={formData.referenceNo}
                      disabled
                      placeholder="Auto-generated"
                      className="bg-gray-50"
                    />
                  </div>

                  {/* 8. Shift Incharge */}
                  <div className="space-y-2">
                    <Label htmlFor="shiftIncharge">Shift Incharge</Label>
                    <Input
                      id="shiftIncharge"
                      value={formData.shiftIncharge}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Only allow alphabetic characters, spaces, and common name characters
                        const nameRegex = /^[a-zA-Z\s'.-]*$/;
                        if (nameRegex.test(value)) {
                          setFormData({ ...formData, shiftIncharge: value });
                        }
                      }}
                      placeholder="Enter name (letters only)"
                      disabled={!!existingTestData}
                    />
                  </div>

                  {/* 9. Tested By */}
                  <div className="space-y-2">
                    <Label htmlFor="testedBy">Tested By</Label>
                    <Input
                      id="testedBy"
                      value={formData.testedBy}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  {/* 10. Weight (New field for certificate generation) */}
                  <div className="space-y-2">
                    <Label htmlFor="weight">Batch Size (Weight)</Label>
                    <Input
                      id="weight"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      placeholder="Enter batch size/weight (for certificate)"
                      disabled={!!existingTestData}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Machine Test Values Cards - Show all accessible machines */}
            <div key={`machines-${userMachines.join('-')}`}>
              {userMachines.length > 0 && userMachines.map((machine) => {
                const machineKey = `${machine.toLowerCase()}Tests` as 'g1Tests' | 'g2Tests' | 'g3Tests';
                const isCompleted = existingTestData && existingTestData[machineKey];
                const machineTests = allowedTests.filter(test => test.machine === machine);
                
                // Skip if no tests available for this machine
                if (machineTests.length === 0) {
                  return null;
                }
                
                return (
                  <Card key={machine}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Factory className="h-5 w-5" />
                            {MACHINE_TESTS[machine as keyof typeof MACHINE_TESTS]?.name} Tests
                          </CardTitle>
                          <CardDescription>
                            {isCompleted ? 'Tests completed' : `Enter test values for ${machine} machine`}
                          </CardDescription>
                        </div>
                        {isCompleted && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isCompleted ? (
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <p className="text-sm text-green-800">
                              Tests for {machine} have been completed and cannot be modified.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {machineTests.map((test) => (
                            <div key={test.key} className="space-y-2">
                              <Label htmlFor={`${machine}-${test.key}`}>
                                {test.label} ({test.unit})
                                {selectedProduct?.specifications && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    {getRangeDisplay(test.key, selectedProduct.specifications)}
                                  </span>
                                )}
                              </Label>
                              <div className="relative">
                                <Input
                                  id={`${machine}-${test.key}`}
                                  type="number"
                                  step="0.01"
                                  value={testValues[test.key] || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const newValues = { ...testValues, [test.key]: value };
                                    
                                                                      // G3 automatic calculations
                                  if (machine === 'G3') {
                                    if (test.key === 'rheoTS2Min' && value) {
                                      // Convert minutes to seconds
                                      (newValues as any)['rheoTS2Sec'] = (parseFloat(value) * 60).toString();
                                    } else if (test.key === 'rheoTC90Min' && value) {
                                      // Convert minutes to seconds
                                      (newValues as any)['rheoTC90Sec'] = (parseFloat(value) * 60).toString();
                                    }
                                  }
                                  
                                  setTestValues(newValues);
                                  
                                  // Validate the input value against product ranges
                                  if (value && selectedProduct?.specifications) {
                                    const numValue = parseFloat(value);
                                    if (!isNaN(numValue)) {
                                      let validationKey = test.key;
                                      let validationValue = numValue;
                                      
                                      // Special handling for Rheo tests - validate the converted seconds value
                                      if (test.key === 'rheoTS2Min') {
                                        validationKey = 'rheoTS2Sec';
                                        validationValue = numValue * 60; // Convert to seconds for validation
                                      } else if (test.key === 'rheoTC90Min') {
                                        validationKey = 'rheoTC90Sec';
                                        validationValue = numValue * 60; // Convert to seconds for validation
                                      }
                                      
                                      const validation = validateTestValue(validationKey, validationValue, selectedProduct.specifications);
                                      setValidationResults(prev => ({
                                        ...prev,
                                        [test.key]: validation // Store validation result under the input field key
                                      }));
                                      
                                      // Also validate the converted seconds field if it exists
                                      if (test.key === 'rheoTS2Min' && (newValues as any)['rheoTS2Sec']) {
                                        setValidationResults(prev => ({
                                          ...prev,
                                          'rheoTS2Sec': validation
                                        }));
                                      } else if (test.key === 'rheoTC90Min' && (newValues as any)['rheoTC90Sec']) {
                                        setValidationResults(prev => ({
                                          ...prev,
                                          'rheoTC90Sec': validation
                                        }));
                                      }
                                      
                                      // Check if there are any invalid values across all current test inputs
                                      // Update validation results first, then check
                                      const updatedValidations = { ...validationResults, [test.key]: validation };
                                      
                                      // Also update converted seconds validation if applicable
                                      if (test.key === 'rheoTS2Min' && (newValues as any)['rheoTS2Sec']) {
                                        (updatedValidations as any)['rheoTS2Sec'] = validation;
                                      } else if (test.key === 'rheoTC90Min' && (newValues as any)['rheoTC90Sec']) {
                                        (updatedValidations as any)['rheoTC90Sec'] = validation;
                                      }
                                      
                                      // Check only the validations for fields that currently have values
                                      const hasInvalid = Object.entries(updatedValidations).some(([key, v]) => {
                                        // Only check validation if the field has a value
                                        const fieldHasValue = (newValues as any)[key] || (testValues as any)[key];
                                        return fieldHasValue && !(v as any).isValid;
                                      });
                                      setHasInvalidValues(hasInvalid);
                                    }
                                  } else {
                                    // Clear validation when value is empty
                                    setValidationResults(prev => {
                                      const newValidations = { ...prev };
                                      delete newValidations[test.key];
                                      
                                      // Also clear validation for converted seconds fields
                                      if (test.key === 'rheoTS2Min') {
                                        delete newValidations['rheoTS2Sec'];
                                      } else if (test.key === 'rheoTC90Min') {
                                        delete newValidations['rheoTC90Sec'];
                                      }
                                      
                                      // Recheck hasInvalidValues after clearing
                                      const hasInvalid = Object.entries(newValidations).some(([key, v]) => {
                                        const fieldHasValue = (newValues as any)[key] || (testValues as any)[key];
                                        return fieldHasValue && !(v as any).isValid;
                                      });
                                      setHasInvalidValues(hasInvalid);
                                      
                                      return newValidations;
                                    });
                                  }
                                  }}
                                  placeholder={`Enter ${test.label}`}
                                  disabled={test.key === 'rheoTS2Sec' || test.key === 'rheoTC90Sec'}
                                  className={`
                                    ${test.key === 'rheoTS2Sec' || test.key === 'rheoTC90Sec' ? 'bg-gray-100' : ''}
                                    ${validationResults[test.key] && !(validationResults[test.key] as any)?.isValid ? 'border-red-500 bg-red-50' : ''}
                                  `}
                                />
                                {validationResults[test.key] && !(validationResults[test.key] as any)?.isValid && (
                                  <div className="absolute right-2 top-2">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  </div>
                                )}
                                {validationResults[test.key] && (validationResults[test.key] as any)?.isValid && testValues[test.key] && (
                                  <div className="absolute right-2 top-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  </div>
                                )}
                              </div>
                              {validationResults[test.key] && !(validationResults[test.key] as any)?.isValid && (
                                <p className="text-xs text-red-600">
                                  {(validationResults[test.key] as any)?.message}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Previous Test Data (if exists) */}
            {existingTestData && (
              <Card>
                <CardHeader>
                  <CardTitle>Test Progress</CardTitle>
                  <CardDescription>
                    Overview of all tests for this reference number
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* G1 Tests */}
                    <div className={`border-2 rounded-lg p-4 transition-all ${
                      existingTestData.g1Tests?.completedAt 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">G1 Machine Tests</h4>
                        {existingTestData.g1Tests?.completedAt && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      {existingTestData.g1Tests ? (
                        <div className="space-y-1 text-sm">
                          {Object.entries(existingTestData.g1Tests)
                            .filter(([key]) => !['completed', 'completedBy', 'completedById', 'completedAt'].includes(key))
                            .map(([key, value]) => {
                              const test = MACHINE_TESTS.G1.tests.find(t => t.key === key)
                              return (
                                <div key={key} className="flex justify-between">
                                  <span className="text-gray-600">{test?.label || key}:</span>
                                  <span className="font-medium">{value} {test?.unit}</span>
                                </div>
                              )
                            })}
                          {existingTestData.g1Tests.completedBy && (
                            <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                              By: {existingTestData.g1Tests.completedBy}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Not started</p>
                      )}
                    </div>

                    {/* G2 Tests */}
                    <div className={`border-2 rounded-lg p-4 transition-all ${
                      existingTestData.g2Tests?.completedAt 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">G2 Machine Tests</h4>
                        {existingTestData.g2Tests?.completedAt && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      {existingTestData.g2Tests ? (
                        <div className="space-y-1 text-sm">
                          {Object.entries(existingTestData.g2Tests)
                            .filter(([key]) => !['completed', 'completedBy', 'completedById', 'completedAt'].includes(key))
                            .map(([key, value]) => {
                              const test = MACHINE_TESTS.G2.tests.find(t => t.key === key)
                              return (
                                <div key={key} className="flex justify-between">
                                  <span className="text-gray-600">{test?.label || key}:</span>
                                  <span className="font-medium">{value} {test?.unit}</span>
                                </div>
                              )
                            })}
                          {existingTestData.g2Tests.completedBy && (
                            <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                              By: {existingTestData.g2Tests.completedBy}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Not started</p>
                      )}
                    </div>

                    {/* G3 Tests */}
                    <div className={`border-2 rounded-lg p-4 transition-all ${
                      existingTestData.g3Tests?.completedAt 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">G3 Machine Tests</h4>
                        {existingTestData.g3Tests?.completedAt && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      {existingTestData.g3Tests ? (
                        <div className="space-y-1 text-sm">
                          {Object.entries(existingTestData.g3Tests)
                            .filter(([key]) => !['completed', 'completedBy', 'completedById', 'completedAt'].includes(key))
                            .map(([key, value]) => {
                              const test = MACHINE_TESTS.G3.tests.find(t => t.key === key)
                              return (
                                <div key={key} className="flex justify-between">
                                  <span className="text-gray-600">{test?.label || key}:</span>
                                  <span className="font-medium">{value} {test?.unit}</span>
                                </div>
                              )
                            })}
                          {existingTestData.g3Tests.completedBy && (
                            <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                              By: {existingTestData.g3Tests.completedBy}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Not started</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Link href="/">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button 
                onClick={() => setShowConfirmModal(true)} 
                disabled={saving || !selectedProduct || !formData.batchNo}
                variant={hasInvalidValues ? "destructive" : "default"}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : hasInvalidValues ? (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Hold It
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Test Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle>
                  {hasInvalidValues ? 'Hold Test Data' : 'Confirm Test Data'}
                </CardTitle>
                <CardDescription>
                  {hasInvalidValues 
                    ? 'Some values are out of specification range. This test will be marked as HOLD and sent for admin review.'
                    : 'Please review and confirm the test data before saving'
                  }
                </CardDescription>
                {hasInvalidValues && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center text-red-700">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">Out of Range Values Detected</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      This batch will be held for quality review and cannot be used for certificate generation.
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4 overflow-y-auto flex-1">
                <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Product:</span>
                    <span className="font-medium">{selectedProduct?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Batch No:</span>
                    <span className="font-medium">{formData.batchNo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Reference No:</span>
                    <span className="font-medium">{formData.referenceNo}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Test Values:</h4>
                  {/* Group test values by machine in a grid layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {['G1', 'G2', 'G3'].map(machine => {
                      const machineTests = allowedTests.filter(t => t.machine === machine);
                      const hasValues = machineTests.some(test => testValues[test.key]);
                      
                      if (!hasValues) return null;
                      
                      return (
                        <div key={machine} className="space-y-2">
                          <h5 className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">{machine} Machine Tests</h5>
                          <div className="rounded-lg border p-3 space-y-2 bg-white">
                            {machineTests.map(test => {
                              const value = testValues[test.key];
                              if (!value) return null;
                              
                              const validation = validationResults[test.key];
                              const isInvalid = validation && !validation.isValid;
                              
                              return (
                                <div key={test.key} className={`flex justify-between items-center text-sm border-b border-gray-100 pb-1 ${isInvalid ? 'bg-red-50' : ''}`}>
                                  <span className="text-gray-600 font-medium">{test.label}:</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold ${isInvalid ? 'text-red-600' : 'text-blue-600'}`}>
                                      {value} {test.unit}
                                    </span>
                                    {isInvalid && <AlertCircle className="h-3 w-3 text-red-500" />}
                                    {validation && validation.isValid && <CheckCircle className="h-3 w-3 text-green-500" />}
                                  </div>
                                  {isInvalid && validation.range && (
                                    <div className="text-xs text-red-500 mt-1">
                                      Expected: {validation.range}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </CardContent>
              
              {/* Fixed footer with checkbox and buttons */}
              <div className="flex-shrink-0 border-t bg-white p-4 space-y-4">
                <div className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="confirmData"
                    checked={confirmChecked}
                    onChange={(e) => setConfirmChecked(e.target.checked)}
                    className="mt-1"
                  />
                  <label htmlFor="confirmData" className="text-sm text-gray-700">
                    I confirm that all test data entered above is accurate and has been properly verified.
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowConfirmModal(false);
                      setConfirmChecked(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setShowConfirmModal(false);
                      setConfirmChecked(false);
                      handleSave();
                    }}
                    disabled={!confirmChecked}
                    variant={hasInvalidValues ? "destructive" : "default"}
                  >
                    {hasInvalidValues ? 'Confirm & Hold' : 'Confirm & Save'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* QR Scanner Modal */}
        {/* This section is no longer relevant for existing tests */}
        {/* {showQRScanner && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Scan Batch QR Code</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowQRScanner(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <Camera className="h-16 w-16 text-gray-400" />
                  </div>
                  <p className="text-sm text-center text-gray-600">
                    QR Scanner feature coming soon. Enter batch manually for now.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="manualBatch">Enter batch manually:</Label>
                    <div className="flex gap-2">
                      <Input
                        id="manualBatch"
                        placeholder="Enter batch number"
                      />
                      <Button onClick={() => {
                        const input = document.getElementById('manualBatch') as HTMLInputElement
                        if (input?.value) {
                          const emptyRow = testRows.find(row => !row.batchNo)
                          if (emptyRow) {
                            updateCell(emptyRow.id, 'batchNo', input.value)
                          }
                          setShowQRScanner(false)
                        }
                      }}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )} */}

        {/* Load Previous Data Modal */}
        {/* This section is no longer relevant for existing tests */}
        {/* {showLoadDataModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Load Previous Test Data</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowLoadDataModal(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previousTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell>{test.testDate}</TableCell>
                        <TableCell>{test.productName}</TableCell>
                        <TableCell>{test.batchNo}</TableCell>
                        <TableCell>{test.operator}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            test.status === 'approved' 
                              ? "bg-green-100 text-green-700" 
                              : test.status === 'rejected'
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {test.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadTestData(test)}
                          >
                            Load
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )} */}
      </div>
    </ProtectedRoute>
  )
} 