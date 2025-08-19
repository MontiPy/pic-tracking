import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const BulkAttachSchema = z.object({
  items: z.array(z.object({
    milestoneId: z.string().min(1),
    taskId: z.string().min(1),
    dueDate: z.string().min(1),
    isActive: z.boolean().optional().default(true),
    notes: z.string().optional(),
    responsibleParties: z.any().optional()
  })).min(1)
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id
    const json = await request.json()
    const parsed = BulkAttachSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
    }

    // Ensure project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const spis = await prisma.supplierProjectInstance.findMany({ where: { projectId } })

    let createdTemplates = 0
    let createdInstances = 0

    for (const item of parsed.data.items) {
      // upsert template (unique: projectId, milestoneId, taskId)
      const template = await prisma.projectMilestoneTask.upsert({
        where: {
          projectId_milestoneId_taskId: {
            projectId,
            milestoneId: item.milestoneId,
            taskId: item.taskId
          }
        },
        update: {
          dueDate: new Date(item.dueDate),
          isActive: item.isActive,
          notes: item.notes,
          responsibleParties: item.responsibleParties ? JSON.stringify(item.responsibleParties) : undefined
        },
        create: {
          projectId,
          milestoneId: item.milestoneId,
          taskId: item.taskId,
          dueDate: new Date(item.dueDate),
          isActive: item.isActive,
          notes: item.notes,
          responsibleParties: item.responsibleParties ? JSON.stringify(item.responsibleParties) : undefined
        }
      })
      if (template.createdAt.getTime() === template.updatedAt.getTime()) {
        createdTemplates++
      }

      // backfill instances for each supplier-project instance
      for (const spi of spis) {
        try {
          await prisma.supplierTaskInstance.create({
            data: {
              supplierProjectInstanceId: spi.id,
              projectMilestoneTaskId: template.id,
              dueDate: template.dueDate,
              status: 'not_started',
              isApplied: true
            }
          })
          createdInstances++
        } catch (e: any) {
          if (e.code !== 'P2002') throw e
        }
      }
    }

    return NextResponse.json({ createdTemplates, createdInstances })
  } catch (error) {
    console.error('Error bulk attaching templates:', error)
    return NextResponse.json({ error: 'Failed to attach templates' }, { status: 500 })
  }
}

