import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateProjectMilestoneTaskSchema } from '@/lib/validation'

// Update a ProjectMilestoneTask; sync due dates to instances when applicable
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()
    const parsed = updateProjectMilestoneTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
    }
    const { dueDate, isActive, notes, responsibleParties } = parsed.data

    // Fetch current template for comparison
    const existing = await prisma.projectMilestoneTask.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const updateData: any = {}
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate)
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (notes !== undefined) updateData.notes = notes
    if (responsibleParties !== undefined) {
      updateData.responsibleParties = typeof responsibleParties === 'string'
        ? responsibleParties
        : JSON.stringify(responsibleParties)
    }

    const updated = await prisma.projectMilestoneTask.update({
      where: { id },
      data: updateData
    })

    // If due date changed, sync to SupplierTaskInstances where not overridden and not completed
    let synced = 0
    if (dueDate !== undefined && existing.dueDate.getTime() !== new Date(dueDate).getTime()) {
      const res = await prisma.supplierTaskInstance.updateMany({
        where: {
          projectMilestoneTaskId: id,
          status: { not: 'completed' },
          actualDueDate: null
        },
        data: { dueDate: new Date(dueDate) }
      })
      synced = res.count
    }

    return NextResponse.json({ updated, synced })
  } catch (error) {
    console.error('Error updating project template:', error)
    return NextResponse.json({ error: 'Failed to update project template' }, { status: 500 })
  }
}
