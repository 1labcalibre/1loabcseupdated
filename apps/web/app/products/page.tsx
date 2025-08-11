"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Edit, Plus, Trash2, X, Save, FileText, Eye, Factory, Loader2, Check } from "lucide-react"
import { productsService, type Product, type ProductSpecification } from "@/lib/firebase/services/products"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function ProductsPage() {
  const { userData } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [checkedSpecifications, setCheckedSpecifications] = useState<boolean[]>([])
  const [editCheckedSpecifications, setEditCheckedSpecifications] = useState<boolean[]>([])
  
  // Default specifications structure for new products
  const defaultSpecifications: ProductSpecification[] = [
    { property: "Hardness", unit: "Shore A", standard: "ASTM D 2240", specification: "68±7", typicalValue: 68 },
    { property: "Specific Gravity", unit: "g/cm³", standard: "ASTM D 792", specification: "1.5-1.6", typicalValue: 1.55 },
    { property: "Tensile Strength", unit: "N/mm²", standard: "ISO 37", specification: ">4", typicalValue: 4.5 },
    { property: "Elongation", unit: "%", standard: "ISO 37", specification: ">150", typicalValue: 300 },
    { property: "Tear Strength", unit: "N/mm", standard: "ASTM D 624 B", specification: ">15", typicalValue: 20 },
    { property: "Mooney Viscosity", unit: "MU", standard: "ASTM D 1646", specification: "50±10", typicalValue: 50 },
    { property: "Rheo (TS2)", unit: "sec", standard: "ASTM D 5289", specification: "30±20", typicalValue: 30 },
    { property: "Rheo (TC90)", unit: "sec", standard: "ASTM D 5289", specification: "90±20", typicalValue: 90 }
  ]

  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: "",
    category: "Insulating Rubber Silicone",
    internalCode: "",
    color: "",
    remark: "",
    specifications: [...defaultSpecifications],
    active: true
  })

  // Initialize checkboxes when modal opens
  useEffect(() => {
    if (showAddModal) {
      setCheckedSpecifications(new Array(formData.specifications.length).fill(false))
    }
  }, [showAddModal, formData.specifications.length])

  useEffect(() => {
    if (showEditModal && editingProduct) {
      setEditCheckedSpecifications(new Array(editingProduct.specifications.length).fill(false))
    }
  }, [showEditModal, editingProduct])

  // Check if all specifications are checked
  const allSpecificationsChecked = () => {
    return checkedSpecifications.length > 0 && checkedSpecifications.every(checked => checked)
  }

  const allEditSpecificationsChecked = () => {
    return editCheckedSpecifications.length > 0 && editCheckedSpecifications.every(checked => checked)
  }

  // Load products on mount
  useEffect(() => {
    loadProducts()
    
    // Subscribe to real-time updates
    const unsubscribe = productsService.subscribe((updatedProducts) => {
      setProducts(updatedProducts)
    })

    return () => unsubscribe()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await productsService.getAll()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async () => {
    try {
      setSaving(true)
      await productsService.create(formData)
      setShowAddModal(false)
      setFormData({
        name: "",
        category: "Insulating Rubber Silicone",
        internalCode: "",
        color: "",
        remark: "",
        specifications: [...defaultSpecifications],
        active: true
      })
      setCheckedSpecifications([])
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Failed to add product')
    } finally {
      setSaving(false)
    }
  }

  const handleEditProduct = async () => {
    if (!editingProduct?.id) return
    
    try {
      setSaving(true)
      const { id, ...productData } = editingProduct
      await productsService.update(id, productData)
      setShowEditModal(false)
      setEditingProduct(null)
    } catch (error) {
      console.error('Error updating product:', error)
      alert('Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return
    
    try {
      await productsService.delete(id)
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    }
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(JSON.parse(JSON.stringify(product))) // Deep copy
    setShowEditModal(true)
  }

  const openViewModal = (product: Product) => {
    setViewingProduct(product)
    setShowViewModal(true)
  }

  const updateSpecification = (index: number, field: keyof ProductSpecification, value: string | number) => {
    if (editingProduct) {
      const updatedSpecs = [...editingProduct.specifications]
      const currentSpec = updatedSpecs[index]
      updatedSpecs[index] = { 
        property: currentSpec?.property || '',
        unit: currentSpec?.unit || '',
        standard: currentSpec?.standard || '',
        specification: currentSpec?.specification || '',
        typicalValue: currentSpec?.typicalValue || '',
        ...currentSpec,
        [field]: value 
      }
      setEditingProduct({ ...editingProduct, specifications: updatedSpecs })
    }
  }

  const updateFormSpecification = (index: number, field: keyof ProductSpecification, value: string | number) => {
    const updatedSpecs = [...formData.specifications]
    const currentSpec = updatedSpecs[index]
    updatedSpecs[index] = { 
      property: currentSpec?.property || '',
      unit: currentSpec?.unit || '',
      standard: currentSpec?.standard || '',
      specification: currentSpec?.specification || '',
      typicalValue: currentSpec?.typicalValue || '',
      ...currentSpec,
      [field]: value 
    }
    setFormData({ ...formData, specifications: updatedSpecs })
  }

  const addFormSpecification = () => {
    setFormData({
      ...formData,
      specifications: [...formData.specifications, { property: "", unit: "", standard: "", specification: "", typicalValue: "" }]
    })
    setCheckedSpecifications([...checkedSpecifications, false])
  }

  const removeSpecification = (index: number) => {
    if (editingProduct) {
      const updatedSpecs = editingProduct.specifications.filter((_, i) => i !== index)
      setEditingProduct({ ...editingProduct, specifications: updatedSpecs })
      const updatedChecks = editCheckedSpecifications.filter((_, i) => i !== index)
      setEditCheckedSpecifications(updatedChecks)
    }
  }

  const removeFormSpecification = (index: number) => {
    const updatedSpecs = formData.specifications.filter((_, i) => i !== index)
    setFormData({ ...formData, specifications: updatedSpecs })
    const updatedChecks = checkedSpecifications.filter((_, i) => i !== index)
    setCheckedSpecifications(updatedChecks)
  }

  const toggleSpecificationCheck = (index: number) => {
    const updated = [...checkedSpecifications]
    updated[index] = !updated[index]
    setCheckedSpecifications(updated)
  }

  const toggleEditSpecificationCheck = (index: number) => {
    const updated = [...editCheckedSpecifications]
    updated[index] = !updated[index]
    setEditCheckedSpecifications(updated)
  }

  const addSpecification = () => {
    if (editingProduct) {
      setEditingProduct({
        ...editingProduct,
        specifications: [...editingProduct.specifications, { property: "", unit: "", standard: "", specification: "", typicalValue: "" }]
      })
      setEditCheckedSpecifications([...editCheckedSpecifications, false])
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header - Mobile Optimized */}
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <Link href="/">
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </Link>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">Products Management</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Mobile Optimized */}
        <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Products List</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage products and their specifications</CardDescription>
                </div>
                {userData?.permissions.canEdit && (
                  <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto text-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No products found. Add your first product to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Internal Code</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="hidden sm:table-cell">Specifications</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.internalCode || '-'}</TableCell>
                          <TableCell>{product.color || '-'}</TableCell>
                          <TableCell>{product.category || 'N/A'}</TableCell>
                          <TableCell className="hidden sm:table-cell">{product.specifications?.length || 0} specifications</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              product.active 
                                ? "bg-green-100 text-green-700" 
                                : "bg-gray-100 text-gray-700"
                            }`}>
                              {product.active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => openViewModal(product)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {userData?.permissions.canEdit && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => openEditModal(product)}
                                    title="Edit Product"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {userData?.permissions.canDelete && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleDeleteProduct(product.id!)}
                                      title="Delete Product"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* View Product Modal */}
        {showViewModal && viewingProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Product Details: {viewingProduct.name}</CardTitle>
                    <CardDescription>Category: {viewingProduct.category || 'N/A'}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowViewModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  {/* Product Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Internal Code</p>
                      <p className="font-medium">{viewingProduct.internalCode || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Color</p>
                      <p className="font-medium">{viewingProduct.color || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-medium">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          viewingProduct.active 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {viewingProduct.active ? "Active" : "Inactive"}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  {viewingProduct.remark && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Remark</p>
                      <p className="font-medium">{viewingProduct.remark}</p>
                    </div>
                  )}

                  {/* Specifications Table */}
                  <div>
                    <h3 className="font-medium mb-2">Specifications</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Property</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Standard</TableHead>
                            <TableHead>Specification</TableHead>
                            <TableHead>Typical Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingProduct.specifications?.map((spec, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{spec.property}</TableCell>
                              <TableCell>{spec.unit}</TableCell>
                              <TableCell>{spec.standard}</TableCell>
                              <TableCell>{spec.specification}</TableCell>
                              <TableCell>{spec.typicalValue}</TableCell>
                            </TableRow>
                          )) || (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-500">
                                No specifications defined
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Product Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Add New Product</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAddModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Teksil® TD 300-H-421"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Insulating Rubber Silicone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="internalCode">Internal Code</Label>
                      <Input
                        id="internalCode"
                        value={formData.internalCode}
                        onChange={(e) => setFormData({ ...formData, internalCode: e.target.value })}
                        placeholder="e.g., PROD-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        placeholder="e.g., Black, Red, Blue"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="remark">Remark</Label>
                    <textarea
                      id="remark"
                      className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.remark}
                      onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                      placeholder="Any additional notes or remarks about this product"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Specifications</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFormSpecification}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Specification
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">Please verify each specification by checking the box before saving</p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {formData.specifications.map((spec, index) => (
                        <div key={index} className={`grid grid-cols-7 gap-2 p-2 border rounded ${checkedSpecifications[index] ? 'bg-green-50 border-green-300' : ''}`}>
                          <Input
                            placeholder="Property"
                            value={spec.property}
                            onChange={(e) => updateFormSpecification(index, 'property', e.target.value)}
                          />
                          <Input
                            placeholder="Unit"
                            value={spec.unit}
                            onChange={(e) => updateFormSpecification(index, 'unit', e.target.value)}
                          />
                          <Input
                            placeholder="Standard"
                            value={spec.standard}
                            onChange={(e) => updateFormSpecification(index, 'standard', e.target.value)}
                          />
                          <Input
                            placeholder="Specification"
                            value={spec.specification}
                            onChange={(e) => updateFormSpecification(index, 'specification', e.target.value)}
                          />
                          <Input
                            placeholder="Typical Value"
                            value={spec.typicalValue}
                            onChange={(e) => updateFormSpecification(index, 'typicalValue', e.target.value)}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                checkedSpecifications[index] 
                                  ? 'bg-green-500 border-green-500' 
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                              onClick={() => toggleSpecificationCheck(index)}
                              title="Verify this specification"
                            >
                              {checkedSpecifications[index] && <Check className="h-4 w-4 text-white" />}
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFormSpecification(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddProduct} 
                      disabled={saving || !formData.name || !allSpecificationsChecked()}
                      title={!allSpecificationsChecked() ? "Please verify all specifications before saving" : ""}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Product
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Product Modal */}
        {showEditModal && editingProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit Product</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowEditModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Product Name</Label>
                      <Input
                        id="edit-name"
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-category">Category</Label>
                      <Input
                        id="edit-category"
                        value={editingProduct.category || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-internalCode">Internal Code</Label>
                      <Input
                        id="edit-internalCode"
                        value={editingProduct.internalCode || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, internalCode: e.target.value })}
                        placeholder="e.g., PROD-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-color">Color</Label>
                      <Input
                        id="edit-color"
                        value={editingProduct.color || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, color: e.target.value })}
                        placeholder="e.g., Black, Red, Blue"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-remark">Remark</Label>
                    <textarea
                      id="edit-remark"
                      className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingProduct.remark || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, remark: e.target.value })}
                      placeholder="Any additional notes or remarks about this product"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingProduct.active}
                        onChange={(e) => setEditingProduct({ ...editingProduct, active: e.target.checked })}
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Specifications</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSpecification}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Specification
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">Please verify each specification by checking the box before saving</p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {editingProduct.specifications?.map((spec, index) => (
                        <div key={index} className={`grid grid-cols-7 gap-2 p-2 border rounded ${editCheckedSpecifications[index] ? 'bg-green-50 border-green-300' : ''}`}>
                          <Input
                            placeholder="Property"
                            value={spec.property}
                            onChange={(e) => updateSpecification(index, 'property', e.target.value)}
                          />
                          <Input
                            placeholder="Unit"
                            value={spec.unit}
                            onChange={(e) => updateSpecification(index, 'unit', e.target.value)}
                          />
                          <Input
                            placeholder="Standard"
                            value={spec.standard}
                            onChange={(e) => updateSpecification(index, 'standard', e.target.value)}
                          />
                          <Input
                            placeholder="Specification"
                            value={spec.specification}
                            onChange={(e) => updateSpecification(index, 'specification', e.target.value)}
                          />
                          <Input
                            placeholder="Typical Value"
                            value={spec.typicalValue}
                            onChange={(e) => updateSpecification(index, 'typicalValue', e.target.value)}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                editCheckedSpecifications[index] 
                                  ? 'bg-green-500 border-green-500' 
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                              onClick={() => toggleEditSpecificationCheck(index)}
                              title="Verify this specification"
                            >
                              {editCheckedSpecifications[index] && <Check className="h-4 w-4 text-white" />}
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSpecification(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center text-gray-500 py-4">
                          No specifications defined. Click "Add Specification" to start.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowEditModal(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleEditProduct} 
                      disabled={saving || !allEditSpecificationsChecked()}
                      title={!allEditSpecificationsChecked() ? "Please verify all specifications before saving" : ""}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
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

