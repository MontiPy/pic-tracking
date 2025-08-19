import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { notes } = body as { notes?: string }
    const updated = await prisma.taskInstance.update({
      where: { id: params.id },
      data: { notes: notes ?? '' },
      include: {
        taskTemplate: { include: { taskType: { select: { name: true, category: true } } } }
      }
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating task notes:', error)
    return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 })
  }
}

