import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: { projectId: string; templateId: string } }
) {
  try {
    const body = await request.json()
    const { canonicalDue } = body as { canonicalDue?: string }

    if (!canonicalDue) {
      return NextResponse.json(
        { error: 'canonicalDue is required' },
        { status: 400 }
      )
    }

    // Ensure the template belongs to the provided project
    const template = await prisma.taskTemplate.findFirst({
      where: { id: params.templateId, projectId: params.projectId },
      select: { id: true }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Task template not found for project' },
        { status: 404 }
      )
    }

    // Update canonical due on the template
    const updatedTemplate = await prisma.taskTemplate.update({
      where: { id: params.templateId },
      data: { canonicalDue: new Date(canonicalDue) },
      select: { id: true, canonicalDue: true }
    })

    // Propagate to all task instances for this template
    await prisma.taskInstance.updateMany({
      where: { taskTemplateId: params.templateId },
      data: { actualDue: updatedTemplate.canonicalDue }
    })

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error('Error updating task template due date:', error)
    return NextResponse.json(
      { error: 'Failed to update due date' },
      { status: 500 }
    )
  }
}

