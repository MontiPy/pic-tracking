'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/ui/Modal'
import SupplierForm from '@/components/forms/SupplierForm'
import { Users, Plus, Search, Phone, Mail, ChevronDown, ChevronRight, Building2, CheckSquare, Clock, AlertCircle } from 'lucide-react'

interface TaskInstance {
  id: string
  status: string
  actualDue: string
  taskTemplate: {
    taskType: {
      name: string
      category: string
    }
    canonicalDue: string
  }
}

interface Supplier {
  id: string
  name: string
  contactInfo: string
  createdAt: string
  supplierProjects: Array<{
    id: string
    project: {
      id: string
      name: string
      description: string
      taskTemplates: Array<{
        id: string
        taskType: {
          name: string
          category: string
        }
        canonicalDue: string
        description: string
      }>
    }
    taskInstances?: TaskInstance[]
  }>
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/suppliers')
      .then(res => res.json())
      .then(data => {
        setSuppliers(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching suppliers:', err)
        setLoading(false)
      })
  }, [])

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier)
  }

  const handleSaveSupplier = async (data: { name: string; contactInfo: string }) => {
    setSaving(true)
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers'
      const method = editingSupplier ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const updatedSupplier = await response.json()
        
        if (editingSupplier) {
          setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? updatedSupplier : s))
        } else {
          setSuppliers(prev => [...prev, updatedSupplier])
        }
        
        setEditingSupplier(null)
        setShowAddModal(false)
      } else {
        console.error('Failed to save supplier')
      }
    } catch (error) {
      console.error('Error saving supplier:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingSupplier(null)
    setShowAddModal(false)
  }

  const toggleSupplierExpanded = (supplierId: string) => {
    setExpandedSuppliers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(supplierId)) {
        newSet.delete(supplierId)
      } else {
        newSet.add(supplierId)
      }
      return newSet
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'in_progress': return 'text-blue-600 bg-blue-50'
      case 'blocked': return 'text-red-600 bg-red-50'
      case 'not_started': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckSquare className="h-3 w-3" />
      case 'in_progress': return <Clock className="h-3 w-3" />
      case 'blocked': return <AlertCircle className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactInfo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Suppliers
            </h1>
            <p className="text-sm text-gray-600">Manage suppliers, projects, and tasks</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </button>
        </div>

        <div className="relative max-w-md mb-4">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading suppliers...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-8 px-4 bg-white rounded border">
                <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No suppliers found</p>
                {searchTerm && (
                  <p className="text-gray-400 text-xs mt-1">
                    Try adjusting your search terms
                  </p>
                )}
              </div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <div key={supplier.id} className="bg-white border rounded overflow-hidden">
                  {/* Supplier Header */}
                  <div className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => toggleSupplierExpanded(supplier.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button className="text-gray-400 hover:text-gray-600">
                          {expandedSuppliers.has(supplier.id) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-1">
                            <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                            <span className="text-xs text-gray-500">{supplier.supplierProjects?.length || 0} projects</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {supplier.contactInfo.split(' | ')[0]}
                            </span>
                            {supplier.contactInfo.includes(' | ') && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {supplier.contactInfo.split(' | ')[1]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {e.stopPropagation(); handleEditSupplier(supplier)}}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedSuppliers.has(supplier.id) && (
                    <div className="border-t bg-gray-50">
                      {supplier.supplierProjects?.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No projects assigned
                        </div>
                      ) : (
                        <div className="divide-y">
                          {supplier.supplierProjects?.map((sp) => (
                            <div key={sp.id} className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Building2 className="h-4 w-4 text-blue-600" />
                                <h4 className="font-medium text-gray-900">{sp.project.name}</h4>
                              </div>
                              
                              {sp.project.description && (
                                <p className="text-xs text-gray-600 mb-3">{sp.project.description}</p>
                              )}
                              
                              {/* Task Templates */}
                              <div className="space-y-2">
                                <h5 className="text-xs font-medium text-gray-700">Tasks:</h5>
                                {sp.project.taskTemplates?.length === 0 ? (
                                  <p className="text-xs text-gray-500 italic">No tasks defined</p>
                                ) : (
                                  <div className="grid gap-1">
                                    {sp.project.taskTemplates?.map((template) => (
                                      <div key={template.id} className="flex items-center justify-between py-1 px-2 bg-white rounded text-xs">
                                        <div className="flex items-center gap-2">
                                          {getStatusIcon('not_started')}
                                          <span className="font-medium">{template.taskType.name}</span>
                                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                            {template.taskType.category}
                                          </span>
                                        </div>
                                        <div className="text-gray-500">
                                          Due: {new Date(template.canonicalDue).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="bg-white p-4 rounded border">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Summary</h2>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="font-bold text-blue-600">{suppliers.length}</div>
                <div className="text-xs text-gray-600">Suppliers</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-green-600">
                  {suppliers.reduce((acc, s) => acc + (s.supplierProjects?.length || 0), 0)}
                </div>
                <div className="text-xs text-gray-600">Assignments</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-orange-600">
                  {suppliers.filter(s => (s.supplierProjects?.length || 0) === 0).length}
                </div>
                <div className="text-xs text-gray-600">Unassigned</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Supplier Modal */}
      <Modal
        isOpen={!!editingSupplier}
        onClose={handleCancelEdit}
        title="Edit Supplier"
      >
        <SupplierForm
          supplier={editingSupplier}
          onSave={handleSaveSupplier}
          onCancel={handleCancelEdit}
          isLoading={saving}
        />
      </Modal>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCancelEdit}
        title="Add New Supplier"
      >
        <SupplierForm
          onSave={handleSaveSupplier}
          onCancel={handleCancelEdit}
          isLoading={saving}
        />
      </Modal>
    </Layout>
  )
}