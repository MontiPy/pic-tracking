import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supplierTaskInstance = await prisma.supplierTaskInstance.findUnique({
      where: { id },
      include: {
        supplierProjectInstance: {
          include: {
            supplier: { 
              select: { 
                id: true, 
                name: true, 
                supplierNumber: true,
                location: true 
              } 
            },
            project: { 
              select: { 
                id: true, 
                name: true, 
                description: true 
              } 
            }
          }
        },
        projectMilestoneTask: {
          include: {
            milestone: {
              include: {
                taskType: { 
                  select: { 
                    id: true, 
                    name: true, 
                    category: true 
                  } 
                }
              }
            },
            task: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    })

    if (!supplierTaskInstance) {
      return NextResponse.json({ error: 'Supplier task instance not found' }, { status: 404 })
    }

    return NextResponse.json(supplierTaskInstance)
  } catch (error) {
    console.error('Error fetching supplier task instance:', error)
    return NextResponse.json({ error: 'Failed to fetch supplier task instance' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { 
      status, 
      actualDueDate, 
      notes, 
      customFields,
      completedAt 
    } = body

    // Build the update object with only provided fields
    const updateData: any = {}
    
    if (status !== undefined) updateData.status = status
    if (actualDueDate !== undefined) updateData.actualDueDate = actualDueDate ? new Date(actualDueDate) : null
    if (notes !== undefined) updateData.notes = notes
    // Skip customFields for now as it's not in the schema
    // if (customFields !== undefined) updateData.customFields = customFields
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null

    // Auto-set completedAt when status changes to completed
    if (status === 'completed' && !updateData.completedAt) {
      updateData.completedAt = new Date()
    }

    // Clear completedAt when status changes away from completed
    if (status && status !== 'completed') {
      updateData.completedAt = null
    }

    const updatedSupplierTaskInstance = await prisma.supplierTaskInstance.update({
      where: { id },
      data: updateData,
      include: {
        supplierProjectInstance: {
          include: {
            supplier: { 
              select: { 
                id: true, 
                name: true, 
                supplierNumber: true,
                location: true 
              } 
            },
            project: { 
              select: { 
                id: true, 
                name: true, 
                description: true 
              } 
            }
          }
        },
        projectMilestoneTask: {
          include: {
            milestone: {
              include: {
                taskType: { 
                  select: { 
                    id: true, 
                    name: true, 
                    category: true 
                  } 
                }
              }
            },
            task: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedSupplierTaskInstance)
  } catch (error) {
    console.error('Error updating supplier task instance:', error)
    return NextResponse.json({ error: 'Failed to update supplier task instance' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.supplierTaskInstance.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting supplier task instance:', error)
    return NextResponse.json({ error: 'Failed to delete supplier task instance' }, { status: 500 })
  }
}