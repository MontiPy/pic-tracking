'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/ui/Modal'
import ProjectForm from '@/components/forms/ProjectForm'
import { Building2, Plus, Calendar, Users, CheckSquare, Edit, Trash2, AlertTriangle } from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  supplierProjects: Array<{
    supplier: {
      name: string
    }
  }>
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        // Handle both new API format with .projects and old direct array format
        const projectsData = data.projects || data
        setProjects(projectsData)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching projects:', err)
        setLoading(false)
      })
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Part Approval': return 'bg-blue-100 text-blue-800'
      case 'Production Readiness': return 'bg-green-100 text-green-800'
      case 'New Model Builds': return 'bg-purple-100 text-purple-800'
      case 'General': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
  }

  const handleSaveProject = async (data: { name: string; description: string }) => {
    setSaving(true)
    try {
      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects'
      const method = editingProject ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const updatedProject = await response.json()
        
        if (editingProject) {
          setProjects(prev => prev.map(p => p.id === editingProject.id ? updatedProject : p))
        } else {
          setProjects(prev => [...prev, updatedProject])
        }
        
        setEditingProject(null)
        setShowAddModal(false)
      } else {
        console.error('Failed to save project')
      }
    } catch (error) {
      console.error('Error saving project:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingProject(null)
    setShowAddModal(false)
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Projects & Assignments
              </h1>
              <p className="text-xs text-gray-600">
                Manage projects and supplier assignments
              </p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Projects</p>
                <p className="text-xl font-bold text-gray-900">{(projects || []).length}</p>
              </div>
              <Building2 className="h-6 w-6 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Supplier Assignments</p>
                <p className="text-xl font-bold text-green-600">
                  {(projects || []).reduce((acc, p) => acc + (p.supplierProjects?.length || 0), 0)}
                </p>
              </div>
              <Users className="h-6 w-6 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Task Templates</p>
                <p className="text-xl font-bold text-purple-600">
                  {(projects || []).reduce((acc, p) => acc + (p.taskTemplates?.length || 0), 0)}
                </p>
              </div>
              <CheckSquare className="h-6 w-6 text-purple-500" />
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Unassigned</p>
                <p className="text-xl font-bold text-orange-600">
                  {(projects || []).filter(p => (p.supplierProjects?.length || 0) === 0).length}
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading projects...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(projects || []).map((project) => (
              <div key={project.id} className="bg-white rounded border">
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {project.supplierProjects?.length || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckSquare className="h-3 w-3" />
                            {project.taskTemplates?.length || 0}
                          </span>
                        </div>
                      </div>
                      {project.description && (
                        <p className="text-xs text-gray-600 truncate">{project.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button 
                        onClick={() => handleEditProject(project)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Supplier Assignments - Primary Focus */}
                  {(project.supplierProjects?.length || 0) > 0 ? (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-medium text-gray-700">Assigned Suppliers:</h4>
                        <span className="text-xs text-green-600 font-medium">
                          {project.supplierProjects?.length || 0} active
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(project.supplierProjects || []).slice(0, 4).map((sp, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            {sp.supplier.name}
                          </span>
                        ))}
                        {(project.supplierProjects?.length || 0) > 4 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                            +{(project.supplierProjects?.length || 0) - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span className="text-xs text-orange-800 font-medium">No suppliers assigned</span>
                      </div>
                    </div>
                  )}

                  {/* Task Templates - Secondary */}
                  {(project.taskTemplates?.length || 0) > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-700 mb-1">
                        Tasks ({project.taskTemplates?.length || 0}):
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set((project.taskTemplates || []).map(t => t.taskType.category))].map(category => {
                          const count = (project.taskTemplates || []).filter(t => t.taskType.category === category).length
                          return (
                            <span
                              key={category}
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getCategoryColor(category)}`}
                            >
                              {category} ({count})
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-3 py-2 bg-gray-50 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <button className="text-blue-600 hover:text-blue-800 font-medium">
                      Manage Suppliers
                    </button>
                    <div className="flex items-center gap-3">
                      <button className="text-gray-600 hover:text-gray-800">
                        Tasks
                      </button>
                      <span className="text-gray-500">
                        Created {formatDate(project.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (projects || []).length === 0 && (
          <div className="text-center py-8 bg-white rounded border">
            <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No projects found</h3>
            <p className="text-xs text-gray-600 mb-4">Get started by creating your first manufacturing project.</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="h-4 w-4" />
              Create Project
            </button>
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      <Modal
        isOpen={!!editingProject}
        onClose={handleCancelEdit}
        title="Edit Project"
      >
        <ProjectForm
          project={editingProject}
          onSave={handleSaveProject}
          onCancel={handleCancelEdit}
          isLoading={saving}
        />
      </Modal>

      {/* Add Project Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCancelEdit}
        title="Create New Project"
      >
        <ProjectForm
          onSave={handleSaveProject}
          onCancel={handleCancelEdit}
          isLoading={saving}
        />
      </Modal>
    </Layout>
  )
}