import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Update status for legacy TaskInstance
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()
    const { status } = body as { status?: string }
    if (!status) return NextResponse.json({ error: 'status is required' }, { status: 400 })

    const data: any = { status }
    if (status === 'completed') data.completedAt = new Date()

    const updated = await prisma.taskInstance.update({
      where: { id },
      data,
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating legacy task instance status:', error)
    return NextResponse.json({ error: 'Failed to update task status' }, { status: 500 })
  }
}
