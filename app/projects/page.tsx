'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import Modal from '@/components/ui/Modal'
import ProjectForm from '@/components/forms/ProjectForm'
import { Building2, Plus, Calendar, Users, CheckSquare, Edit, Trash2 } from 'lucide-react'

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
        setProjects(data)
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
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                Projects
              </h1>
              <p className="mt-2 text-gray-600">
                Manage manufacturing projects and their task templates
              </p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading projects...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-1 ml-2">
                      <button 
                        onClick={() => handleEditProject(project)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{project.supplierProjects.length} suppliers assigned</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckSquare className="h-4 w-4" />
                      <span>{project.taskTemplates.length} task templates</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Created {formatDate(project.createdAt)}</span>
                    </div>
                  </div>

                  {project.taskTemplates.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Task Templates:</h4>
                      <div className="space-y-2">
                        {project.taskTemplates.slice(0, 3).map((template) => (
                          <div key={template.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full font-medium ${getCategoryColor(template.taskType.category)}`}>
                                {template.taskType.category}
                              </span>
                              <span className="text-gray-600 truncate">
                                {template.taskType.name}
                              </span>
                            </div>
                            <span className="text-gray-500 text-xs">
                              {formatDate(template.canonicalDue)}
                            </span>
                          </div>
                        ))}
                        {project.taskTemplates.length > 3 && (
                          <p className="text-xs text-gray-500 italic">
                            +{project.taskTemplates.length - 3} more templates
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {project.supplierProjects.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Assigned Suppliers:</h4>
                      <div className="flex flex-wrap gap-2">
                        {project.supplierProjects.slice(0, 3).map((sp, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {sp.supplier.name}
                          </span>
                        ))}
                        {project.supplierProjects.length > 3 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            +{project.supplierProjects.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t">
                  <div className="flex items-center justify-between">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View Details
                    </button>
                    <button className="text-sm text-gray-600 hover:text-gray-800">
                      Manage Tasks
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first manufacturing project.</p>
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mx-auto">
              <Plus className="h-4 w-4" />
              Create Project
            </button>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{projects.length}</div>
              <div className="text-sm text-gray-600">Total Projects</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {projects.reduce((acc, p) => acc + p.supplierProjects.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Supplier Assignments</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {projects.reduce((acc, p) => acc + p.taskTemplates.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Task Templates</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {projects.filter(p => p.supplierProjects.length === 0).length}
              </div>
              <div className="text-sm text-gray-600">Unassigned Projects</div>
            </div>
          </div>
        </div>
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