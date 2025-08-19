import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { TaskSyncService } from '@/lib/task-sync'

const prisma = new PrismaClient()

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { taskTypeId, canonicalDue, description } = body as {
      taskTypeId?: string
      canonicalDue?: string
      description?: string
    }

    if (!taskTypeId || !canonicalDue) {
      return NextResponse.json({ error: 'taskTypeId and canonicalDue are required' }, { status: 400 })
    }

    // Validate project and task type
    const [project, taskType] = await Promise.all([
      prisma.project.findUnique({ where: { id: params.id }, select: { id: true } }),
      prisma.taskType.findUnique({ where: { id: taskTypeId }, select: { id: true, name: true, category: true } })
    ])

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!taskType) return NextResponse.json({ error: 'Task type not found' }, { status: 404 })

    // Create template in transaction with auto-generated task instances
    const result = await prisma.$transaction(async (tx) => {
      // Create the template
      const template = await tx.taskTemplate.create({
        data: {
          projectId: params.id,
          taskTypeId,
          canonicalDue: new Date(canonicalDue),
          description: description || ''
        },
        include: {
          taskType: { select: { name: true, category: true } }
        }
      })

      // Use the sync service to auto-generate task instances
      const syncResult = await TaskSyncService.generateTaskInstancesForTemplate(template.id)

      return {
        template,
        taskInstancesCreated: syncResult.created,
        taskInstancesFailed: syncResult.failed
      }
    })

    return NextResponse.json({
      ...result.template,
      meta: {
        taskInstancesCreated: result.taskInstancesCreated,
        taskInstancesFailed: result.taskInstancesFailed
      }
    })
  } catch (error: any) {
    console.error('Error creating task template:', error)
    return NextResponse.json({ error: 'Failed to create task template' }, { status: 500 })
  }
}

