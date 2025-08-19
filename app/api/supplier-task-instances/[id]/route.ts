import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateSupplierTaskInstanceSchema } from '@/lib/validation'

// Update a SupplierTaskInstance (new model)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()
    const parsed = updateSupplierTaskInstanceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
    }
    const { status, actualDueDate, notes, isApplied, responsibleParties } = parsed.data

    // Build update data
    const data: any = {}
    if (status) data.status = status
    if (actualDueDate !== undefined) data.actualDueDate = actualDueDate ? new Date(actualDueDate) : null
    if (notes !== undefined) data.notes = notes
    if (typeof isApplied === 'boolean') data.isApplied = isApplied
    if (responsibleParties !== undefined) {
      data.responsibleParties = typeof responsibleParties === 'string'
        ? responsibleParties
        : JSON.stringify(responsibleParties)
    }
    if (status === 'completed' && !data.completedAt) {
      data.completedAt = new Date()
    }

    const updated = await prisma.supplierTaskInstance.update({
      where: { id },
      data,
      include: {
        supplierProjectInstance: {
          include: {
            supplier: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } }
          }
        },
        projectMilestoneTask: {
          include: {
            milestone: {
              include: {
                taskType: { select: { id: true, name: true, category: true } }
              }
            },
            task: { select: { id: true, name: true, description: true } }
          }
        }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating supplier task instance:', error)
    return NextResponse.json({ error: 'Failed to update supplier task instance' }, { status: 500 })
  }
}
