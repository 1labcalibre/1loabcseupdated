"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, ArrowUp, ArrowDown, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { testParametersService, type TestParameter } from "@/lib/firebase/services/test-parameters"

export default function TestParametersPage() {
  const { userData } = useAuth()
  const [parameters, setParameters] = useState<TestParameter[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<TestParameter>>({
    name: '',
    unit: '',
    method: '',
    order: 1,
    active: true
  })

  useEffect(() => {
    loadParameters()
  }, [])

  const loadParameters = async () => {
    try {
      setLoading(true)
      const data = await testParametersService.getAll()
      setParameters(data)
    } catch (error) {
      console.error('Error loading parameters:', error)
      alert('Failed to load test parameters')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (param: TestParameter) => {
    setEditingId(param.id!)
    setFormData({
      name: param.name,
      unit: param.unit,
      method: param.method,
      order: param.order,
      isCalculated: param.isCalculated,
      calculationFormula: param.calculationFormula,
      active: param.active
    })
  }

  const handleSave = async () => {
    if (!formData.name || !formData.unit) {
      alert('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const paramToSave: TestParameter = {
        id: editingId || undefined,
        name: formData.name,
        unit: formData.unit,
        method: formData.method || '',
        order: formData.order || parameters.length + 1,
        isCalculated: formData.isCalculated || false,
        calculationFormula: formData.calculationFormula,
        active: formData.active !== false
      }

      await testParametersService.save(paramToSave)
      await loadParameters()
      
      // Reset form
      setEditingId(null)
      setFormData({
        name: '',
        unit: '',
        method: '',
        order: parameters.length + 1,
        active: true
      })
    } catch (error) {
      console.error('Error saving parameter:', error)
      alert('Failed to save parameter')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this parameter?')) return

    try {
      await testParametersService.delete(id)
      await loadParameters()
    } catch (error) {
      console.error('Error deleting parameter:', error)
      alert('Failed to delete parameter')
    }
  }

  const handleMoveUp = async (param: TestParameter, index: number) => {
    if (index === 0) return
    
    const newParams = [...parameters]
    const prevParam = newParams[index - 1]
    
    if (!prevParam) return
    
    // Swap orders
    const tempOrder = param.order
    param.order = prevParam.order
    prevParam.order = tempOrder
    
    // Save both
    await testParametersService.save(param)
    await testParametersService.save(prevParam)
    await loadParameters()
  }

  const handleMoveDown = async (param: TestParameter, index: number) => {
    if (index === parameters.length - 1) return
    
    const newParams = [...parameters]
    const nextParam = newParams[index + 1]
    
    if (!nextParam) return
    
    // Swap orders
    const tempOrder = param.order
    param.order = nextParam.order
    nextParam.order = tempOrder
    
    // Save both
    await testParametersService.save(param)
    await testParametersService.save(nextParam)
    await loadParameters()
  }

  const initializeDefaults = async () => {
    if (!confirm('This will reset all test parameters to defaults. Continue?')) return
    
    setLoading(true)
    try {
      await testParametersService.initializeDefaults()
      await loadParameters()
      alert('Test parameters initialized successfully!')
    } catch (error) {
      console.error('Error initializing defaults:', error)
      alert('Failed to initialize defaults')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute requiredPermission="canEdit">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/settings">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Test Parameters</h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-8">
          <div className="space-y-6">
            {/* Page header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Test Parameters Management</h2>
                <p className="text-gray-600">
                  Configure the input fields for test data entry
                </p>
              </div>
              {parameters.length === 0 && (
                <Button onClick={initializeDefaults} variant="outline">
                  Initialize Default Parameters
                </Button>
              )}
            </div>

            {/* Add/Edit Form */}
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? 'Edit Parameter' : 'Add New Parameter'}</CardTitle>
                <CardDescription>Define test input parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Parameter Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Hardness"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit *</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="e.g., ShA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="method">Test Method</Label>
                    <Input
                      id="method"
                      value={formData.method}
                      onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                      placeholder="e.g., ASTM D2240"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order">Display Order</Label>
                    <Input
                      id="order"
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isCalculated || false}
                      onChange={(e) => setFormData({ ...formData, isCalculated: e.target.checked })}
                    />
                    <span className="text-sm">Calculated Field</span>
                  </label>
                  
                  {formData.isCalculated && (
                    <div className="flex-1 max-w-md">
                      <Input
                        placeholder="Calculation formula (e.g., Rheo (TS2) * 60)"
                        value={formData.calculationFormula || ''}
                        onChange={(e) => setFormData({ ...formData, calculationFormula: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {editingId ? 'Update' : 'Add'} Parameter
                      </>
                    )}
                  </Button>
                  {editingId && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingId(null)
                        setFormData({
                          name: '',
                          unit: '',
                          method: '',
                          order: parameters.length + 1,
                          active: true
                        })
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Parameters List */}
            <Card>
              <CardHeader>
                <CardTitle>Test Parameters</CardTitle>
                <CardDescription>Manage test input fields</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="mt-2 text-gray-600">Loading parameters...</p>
                  </div>
                ) : parameters.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No parameters defined. Click "Initialize Default Parameters" to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Parameter Name</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parameters.map((param, index) => (
                        <TableRow key={param.id}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMoveUp(param, index)}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMoveDown(param, index)}
                                disabled={index === parameters.length - 1}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              <span className="ml-2">{param.order}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{param.name}</TableCell>
                          <TableCell>{param.unit}</TableCell>
                          <TableCell>{param.method || '-'}</TableCell>
                          <TableCell>
                            {param.isCalculated ? (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                Calculated
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                Input
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded ${
                              param.active 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {param.active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(param)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDelete(param.id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
} 

