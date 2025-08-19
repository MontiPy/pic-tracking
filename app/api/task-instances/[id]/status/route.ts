import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { CacheInvalidation } from '@/lib/cache'

const prisma = new PrismaClient()

const VALID = new Set(['not_started','in_progress','completed','blocked','cancelled'])

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, notes } = body as { status?: string, notes?: string }
    
    if (!status || !VALID.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Check if task exists
    const existingTask = await prisma.taskInstance.findUnique({
      where: { id: params.id },
      select: { id: true, status: true }
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = { status }
    if (notes !== undefined) updateData.notes = notes
    
    // Set completion timestamp if marking as completed
    if (status === 'completed' && existingTask.status !== 'completed') {
      updateData.completedAt = new Date()
    }
    // Clear completion timestamp if moving away from completed
    else if (status !== 'completed' && existingTask.status === 'completed') {
      updateData.completedAt = null
    }

    const updated = await prisma.taskInstance.update({
      where: { id: params.id },
      data: updateData,
      include: {
        supplierProject: {
          include: {
            supplier: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } }
          }
        },
        taskTemplate: {
          include: {
            taskType: { select: { id: true, name: true, category: true } }
          }
        }
      }
    })

    // Invalidate relevant caches
    CacheInvalidation.invalidateTask(
      params.id,
      updated.supplierProject.supplier.id,
      updated.supplierProject.project.id
    )

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating task status:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}

