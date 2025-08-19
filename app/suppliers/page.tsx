'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/ui/Modal'
import SupplierForm from '@/components/forms/SupplierForm'
import TaskInstanceForm from '@/components/forms/TaskInstanceForm'
import TaskCustomizationForm from '@/components/forms/TaskCustomizationForm'
import { Users, Plus, Search, Phone, Mail, ChevronDown, ChevronRight, Building2, CheckSquare, Clock, AlertCircle, MapPin, User, Settings } from 'lucide-react'

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

interface Contact {
  name: string
  role: string
  email: string
  phone: string
}

interface Supplier {
  id: string
  name: string
  contactInfo: string
  supplierNumber?: string
  location?: string
  contacts?: string
  parsedContacts?: Contact[]
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
  supplierProjectInstances?: Array<{
    id: string
    project: {
      id: string
      name: string
      description: string
    }
    supplierTaskInstances: Array<{
      id: string
      status: string
      dueDate: string
      actualDueDate?: string
      completedAt?: string
      isApplied: boolean
      projectMilestoneTask: {
        milestone: {
          code: string
          name: string
          taskType: {
            name: string
            category: string
          }
        }
        task: {
          name: string
          description: string
        }
      }
    }>
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
  const [showAddTaskFor, setShowAddTaskFor] = useState<string>('') // supplierProjectId
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [customizingTask, setCustomizingTask] = useState<any>(null) // task instance for customization
  const [customizationLoading, setCustomizationLoading] = useState(false)

  useEffect(() => {
    fetch('/api/suppliers?includeStats=true')
      .then(res => res.json())
      .then(data => {
        // Handle both new API format with .suppliers and old direct array format
        const suppliersData = data.suppliers || data
        setSuppliers(suppliersData)
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

  const handleSaveSupplier = async (data: { 
    name: string; 
    contactInfo: string;
    supplierNumber?: string;
    location?: string;
    contacts?: Contact[];
  }) => {
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
          setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? {
            ...updatedSupplier,
            parsedContacts: data.contacts
          } : s))
        } else {
          setSuppliers(prev => [...prev, {
            ...updatedSupplier,
            parsedContacts: data.contacts
          }])
        }
        
        setEditingSupplier(null)
        setShowAddModal(false)
      } else {
        console.error('Failed to save supplier')
        alert('Failed to save supplier. Please try again.')
      }
    } catch (error) {
      console.error('Error saving supplier:', error)
      alert('Error saving supplier. Please try again.')
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

  const updateInstanceStatus = async (instanceId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/task-instances/${instanceId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')
      const updated = await res.json()
      setSuppliers(prev => prev.map(s => ({
        ...s,
        supplierProjects: (s.supplierProjects || []).map(sp => ({
          ...sp,
          taskInstances: sp.taskInstances?.map(ti => ti.id === instanceId ? { ...ti, status: updated.status } : ti)
        }))
      })))
    } catch (e) {
      console.error(e)
      alert('Could not update status')
    }
  }

  const toggleSupplierSelection = (supplierId: string) => {
    setSelectedSuppliers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(supplierId)) {
        newSet.delete(supplierId)
      } else {
        newSet.add(supplierId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedSuppliers.size === filteredSuppliers.length) {
      setSelectedSuppliers(new Set())
    } else {
      setSelectedSuppliers(new Set(filteredSuppliers.map(s => s.id)))
    }
  }

  const handleBulkAction = async (action: string) => {
    setBulkActionLoading(true)
    try {
      // Handle different bulk actions
      if (action === 'export') {
        // Simple CSV export of selected suppliers
        const selectedData = suppliers.filter(s => selectedSuppliers.has(s.id))
        const csvContent = [
          'Name,Contact Info,Projects,Tasks',
          ...selectedData.map(s => 
            `"${s.name}","${s.contactInfo}",${(s.supplierProjects || []).length},${(s.supplierProjects || []).reduce((acc, sp) => acc + (sp.taskInstances?.length || 0), 0)}`
          )
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'suppliers.csv'
        a.click()
        window.URL.revokeObjectURL(url)
      }
      // Add more bulk actions here as needed
      setSelectedSuppliers(new Set())
      setShowBulkActions(false)
    } catch (error) {
      console.error('Bulk action failed:', error)
      alert('Bulk action failed')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return '-'
    }
  }

  const handleTaskCustomization = (taskInstance: any) => {
    setCustomizingTask(taskInstance)
  }

  const handleSaveTaskCustomization = async (data: {
    actualDueDate?: string
    notes?: string
    customFields?: any
    status?: string
  }) => {
    if (!customizingTask) return
    
    setCustomizationLoading(true)
    try {
      // Determine if this is a new model task instance or old model
      const isNewModel = customizingTask.projectMilestoneTask !== undefined
      const apiEndpoint = isNewModel 
        ? `/api/supplier-task-instances/${customizingTask.id}`
        : `/api/task-instances/${customizingTask.id}`
      
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualDueDate: data.actualDueDate,
          notes: data.notes,
          customFields: data.customFields ? JSON.stringify(data.customFields) : undefined,
          status: data.status
        })
      })

      if (!response.ok) throw new Error('Failed to update task')
      
      const updatedTask = await response.json()
      
      // Update the suppliers state with the new task data
      setSuppliers(prev => prev.map(supplier => ({
        ...supplier,
        // Update new model
        supplierProjectInstances: supplier.supplierProjectInstances?.map(spi => ({
          ...spi,
          supplierTaskInstances: spi.supplierTaskInstances.map(sti => 
            sti.id === customizingTask.id ? { ...sti, ...updatedTask } : sti
          )
        })),
        // Update old model
        supplierProjects: supplier.supplierProjects?.map(sp => ({
          ...sp,
          taskInstances: sp.taskInstances?.map(ti => 
            ti.id === customizingTask.id ? { ...ti, ...updatedTask } : ti
          )
        }))
      })))
      
      setCustomizingTask(null)
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Failed to update task customization')
    } finally {
      setCustomizationLoading(false)
    }
  }

  const filteredSuppliers = (suppliers || []).filter(supplier =>
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactInfo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Suppliers
            </h1>
            <p className="text-xs text-gray-600">Manage suppliers, projects, and tasks</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedSuppliers.size > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded">
                <span className="text-sm text-blue-900">{selectedSuppliers.size} selected</span>
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Actions
                </button>
                <button
                  onClick={() => setSelectedSuppliers(new Set())}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear
                </button>
              </div>
            )}
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Supplier
            </button>
          </div>
        </div>

        {/* Bulk Actions Dropdown */}
        {showBulkActions && selectedSuppliers.size > 0 && (
          <div className="bg-white border rounded p-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Bulk Actions:</span>
              <button
                onClick={() => handleBulkAction('export')}
                disabled={bulkActionLoading}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                {bulkActionLoading ? 'Exporting...' : 'Export CSV'}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Remove ${selectedSuppliers.size} suppliers? This cannot be undone.`)) {
                    // Add removal logic here
                    console.log('Bulk remove not implemented yet')
                  }
                }}
                className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {filteredSuppliers.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedSuppliers.size === filteredSuppliers.length && filteredSuppliers.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
                Select All
              </label>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading suppliers...</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-6 px-4 bg-white rounded border">
                <Users className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No suppliers found</p>
                {searchTerm && (
                  <p className="text-gray-400 text-xs mt-1">
                    Try adjusting your search terms
                  </p>
                )}
              </div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <div key={supplier.id} className={`bg-white border rounded overflow-hidden ${selectedSuppliers.has(supplier.id) ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}>
                  {/* Supplier Header */}
                  <div className="p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedSuppliers.has(supplier.id)}
                          onChange={() => toggleSupplierSelection(supplier.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300"
                        />
                        <button 
                          onClick={() => toggleSupplierExpanded(supplier.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {expandedSuppliers.has(supplier.id) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium text-gray-900 truncate">{supplier.name}</h3>
                            {supplier.supplierNumber && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono">
                                {supplier.supplierNumber}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {(supplier.supplierProjectInstances?.length || supplier.supplierProjects?.length || 0)} projects
                            </span>
                            {/* Task Status Indicators */}
                            {(() => {
                              // Use new model if available, otherwise fall back to old model
                              const newModelTasks = supplier.supplierProjectInstances?.flatMap(spi => 
                                spi.supplierTaskInstances.filter(sti => sti.isApplied)
                              ) || []
                              
                              const oldModelTasks = supplier.supplierProjects?.flatMap(sp => 
                                sp.taskInstances || []
                              ) || []
                              
                              const allTasks = newModelTasks.length > 0 ? newModelTasks : oldModelTasks
                              
                              const overdueTasks = allTasks.filter(t => {
                                const dueDate = new Date(t.actualDueDate || t.dueDate || t.actualDue || t.taskTemplate?.canonicalDue)
                                return dueDate < new Date() && t.status !== 'completed'
                              }).length
                              
                              const completedTasks = allTasks.filter(t => t.status === 'completed').length
                              
                              return (
                                <div className="flex items-center gap-1">
                                  {overdueTasks > 0 && (
                                    <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                                      {overdueTasks} overdue
                                    </span>
                                  )}
                                  {allTasks.length > 0 && (
                                    <span className="text-xs text-gray-500">
                                      {completedTasks}/{allTasks.length}
                                    </span>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            {supplier.location && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{supplier.location}</span>
                              </span>
                            )}
                            {supplier.parsedContacts && supplier.parsedContacts.length > 0 ? (
                              <span className="flex items-center gap-1 truncate">
                                <User className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{supplier.parsedContacts.length} contact{supplier.parsedContacts.length !== 1 ? 's' : ''}</span>
                              </span>
                            ) : (
                              <>
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{supplier.contactInfo.split(' | ')[0]}</span>
                                </span>
                                {supplier.contactInfo.includes(' | ') && (
                                  <span className="flex items-center gap-1 whitespace-nowrap">
                                    <Phone className="h-3 w-3" />
                                    {supplier.contactInfo.split(' | ')[1]}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
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
                      {/* Use new model if available, otherwise fall back to old model */}
                      {supplier.supplierProjectInstances && supplier.supplierProjectInstances.length > 0 ? (
                        <div className="divide-y">
                          {supplier.supplierProjectInstances.map((spi) => (
                            <div key={spi.id} className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-blue-600" />
                                  <h4 className="font-medium text-gray-900 text-sm">{spi.project.name}</h4>
                                </div>
                              </div>
                              
                              {/* New Model Task Instances */}
                              <div className="space-y-1">
                                {spi.supplierTaskInstances.filter(sti => sti.isApplied).length === 0 ? (
                                  <p className="text-xs text-gray-500 italic py-2">No tasks applied to this supplier</p>
                                ) : (
                                  <div className="space-y-1">
                                    {spi.supplierTaskInstances.filter(sti => sti.isApplied).map((sti) => (
                                      <div key={sti.id} className="flex items-center justify-between py-1.5 px-2 bg-white rounded text-xs border">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(sti.status).split(' ')[1]}`}></div>
                                          <span className="font-medium truncate">{sti.projectMilestoneTask.task.name}</span>
                                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-1.5 py-0.5 rounded">
                                            {sti.projectMilestoneTask.milestone.code}
                                          </span>
                                          <span className="px-1 py-0.5 bg-gray-100 text-gray-600 rounded text-xs flex-shrink-0">
                                            {sti.projectMilestoneTask.milestone.taskType.category}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className="text-gray-500 text-xs">Due: {formatShortDate(sti.actualDueDate || sti.dueDate)}</span>
                                          <select
                                            value={sti.status}
                                            onChange={(e) => updateInstanceStatus(sti.id, e.target.value)}
                                            className="border border-gray-300 rounded px-1 py-0.5 text-xs"
                                          >
                                            <option value="not_started">Not started</option>
                                            <option value="in_progress">In progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="blocked">Blocked</option>
                                            <option value="cancelled">Cancelled</option>
                                          </select>
                                          <button
                                            onClick={() => handleTaskCustomization(sti)}
                                            className="text-xs text-blue-600 hover:text-blue-800 px-1 py-0.5 rounded hover:bg-blue-50"
                                            title="Customize task"
                                          >
                                            <Settings className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : supplier.supplierProjects && supplier.supplierProjects.length > 0 ? (
                        <div className="divide-y">
                          {supplier.supplierProjects.map((sp) => (
                            <div key={sp.id} className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-blue-600" />
                                  <h4 className="font-medium text-gray-900 text-sm">{sp.project.name}</h4>
                                </div>
                                <button
                                  onClick={() => setShowAddTaskFor(sp.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                                >
                                  Add Task
                                </button>
                              </div>
                              
                              {/* Task Instances & Templates */}
                              <div className="space-y-1">
                                {/* Show task instances if any; else fall back to templates */}
                                {sp.taskInstances && sp.taskInstances.length > 0 ? (
                                  <div className="space-y-1">
                                    {sp.taskInstances.map((ti) => (
                                      <div key={ti.id} className="flex items-center justify-between py-1.5 px-2 bg-white rounded text-xs border">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(ti.status).split(' ')[1]}`}></div>
                                          <span className="font-medium truncate">{ti.taskTemplate.taskType.name}</span>
                                          <span className="px-1 py-0.5 bg-gray-100 text-gray-600 rounded text-xs flex-shrink-0">
                                            {ti.taskTemplate.taskType.category}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className="text-gray-500 text-xs">Due: {formatShortDate(ti.actualDue || ti.taskTemplate.canonicalDue)}</span>
                                          <select
                                            value={ti.status}
                                            onChange={(e) => updateInstanceStatus(ti.id, e.target.value)}
                                            className="border border-gray-300 rounded px-1 py-0.5 text-xs"
                                          >
                                            <option value="not_started">Not started</option>
                                            <option value="in_progress">In progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="blocked">Blocked</option>
                                            <option value="cancelled">Cancelled</option>
                                          </select>
                                          <button
                                            onClick={() => handleTaskCustomization(ti)}
                                            className="text-xs text-blue-600 hover:text-blue-800 px-1 py-0.5 rounded hover:bg-blue-50"
                                            title="Customize task"
                                          >
                                            <Settings className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  sp.project.taskTemplates?.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic py-2">No tasks defined for this project</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {sp.project.taskTemplates?.map((template) => (
                                        <div key={template.id} className="flex items-center justify-between py-1.5 px-2 bg-white rounded text-xs border-dashed border">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0"></div>
                                            <span className="font-medium truncate">{template.taskType.name}</span>
                                            <span className="px-1 py-0.5 bg-gray-100 text-gray-600 rounded text-xs flex-shrink-0">
                                              {template.taskType.category}
                                            </span>
                                          </div>
                                          <div className="text-gray-500 text-xs flex-shrink-0">
                                            Due: {formatShortDate(template.canonicalDue)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-gray-500 text-sm">
                          No projects assigned
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="bg-white p-3 rounded border">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Summary</h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-blue-600">{(suppliers || []).length}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-green-600">
                  {(suppliers || []).reduce((acc, s) => acc + (s.supplierProjects?.length || 0), 0)}
                </div>
                <div className="text-xs text-gray-600">Assignments</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-orange-600">
                  {(suppliers || []).filter(s => (s.supplierProjects?.length || 0) === 0).length}
                </div>
                <div className="text-xs text-gray-600">Unassigned</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-red-600">
                  {(suppliers || []).reduce((acc, s) => acc + (s.supplierProjects || []).reduce((projAcc, sp) => 
                    projAcc + (sp.taskInstances?.filter(t => {
                      const dueDate = new Date(t.actualDue || t.taskTemplate.canonicalDue)
                      return dueDate < new Date() && t.status !== 'completed'
                    }).length || 0), 0), 0)}
                </div>
                <div className="text-xs text-gray-600">Overdue</div>
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

      {/* Add Task Instance Modal */}
      <Modal
        isOpen={!!showAddTaskFor}
        onClose={() => setShowAddTaskFor('')}
        title="Add Task Instance"
      >
        {showAddTaskFor && (() => {
          const sp = suppliers.flatMap(s => s.supplierProjects).find(p => p.id === showAddTaskFor)
          if (!sp) return null
          const existingIds = (sp.taskInstances || []).map(ti => ti.taskTemplate.id)
          return (
            <TaskInstanceForm
              supplierProjectId={sp.id}
              templates={sp.project.taskTemplates}
              existingInstanceTemplateIds={existingIds}
              onCreated={(instance) => {
                // Update state with new instance
                setSuppliers(prev => prev.map(s => ({
                  ...s,
                  supplierProjects: s.supplierProjects.map(p => p.id !== sp.id ? p : ({
                    ...p,
                    taskInstances: [instance, ...(p.taskInstances || [])]
                  }))
                })))
                setShowAddTaskFor('')
              }}
              onCancel={() => setShowAddTaskFor('')}
            />
          )
        })()}
      </Modal>

      {/* Task Customization Modal */}
      <Modal
        isOpen={!!customizingTask}
        onClose={() => setCustomizingTask(null)}
        title="Customize Task"
        size="large"
      >
        {customizingTask && (
          <TaskCustomizationForm
            taskInstance={customizingTask}
            onSave={handleSaveTaskCustomization}
            onCancel={() => setCustomizingTask(null)}
            isLoading={customizationLoading}
          />
        )}
      </Modal>
    </Layout>
  )
}
