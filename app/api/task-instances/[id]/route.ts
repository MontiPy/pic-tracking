import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const taskInstance = await prisma.taskInstance.findUnique({
      where: { id },
      include: {
        supplierProject: {
          include: {
            supplier: { select: { id: true, name: true } },
            project: { select: { name: true, id: true } }
          }
        },
        taskTemplate: {
          include: {
            taskType: { select: { id: true, name: true, category: true } }
          }
        }
      }
    })

    if (!taskInstance) {
      return NextResponse.json({ error: 'Task instance not found' }, { status: 404 })
    }

    return NextResponse.json(taskInstance)
  } catch (error) {
    console.error('Error fetching task instance:', error)
    return NextResponse.json({ error: 'Failed to fetch task instance' }, { status: 500 })
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
    if (actualDueDate !== undefined) updateData.actualDue = actualDueDate ? new Date(actualDueDate) : null
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

    const updatedTaskInstance = await prisma.taskInstance.update({
      where: { id },
      data: updateData,
      include: {
        supplierProject: {
          include: {
            supplier: { select: { id: true, name: true } },
            project: { select: { name: true, id: true } }
          }
        },
        taskTemplate: {
          include: {
            taskType: { select: { id: true, name: true, category: true } }
          }
        }
      }
    })

    return NextResponse.json(updatedTaskInstance)
  } catch (error) {
    console.error('Error updating task instance:', error)
    return NextResponse.json({ error: 'Failed to update task instance' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.taskInstance.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task instance:', error)
    return NextResponse.json({ error: 'Failed to delete task instance' }, { status: 500 })
  }
}