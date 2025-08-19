import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createLegacyTaskInstanceSchema } from '@/lib/validation'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId') || undefined
    const supplierId = searchParams.get('supplierId') || undefined
    const status = searchParams.get('status') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined

    // Build where clause
    const whereClause: any = {}
    
    if (projectId || supplierId) {
      whereClause.supplierProject = {}
      if (projectId) whereClause.supplierProject.projectId = projectId
      if (supplierId) whereClause.supplierProject.supplierId = supplierId
    }
    
    if (status) {
      whereClause.status = status
    }

    const taskInstances = await prisma.taskInstance.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
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
      },
      orderBy: [
        { status: 'asc' }, // Active tasks first
        { actualDue: 'asc' }, // Then by due date
        { updatedAt: 'desc' } // Then by recent updates
      ],
      take: limit,
      skip: offset
    })

    // Add computed fields
    const now = new Date()
    const enhancedTasks = taskInstances.map(task => ({
      ...task,
      isOverdue: task.status !== 'completed' && task.actualDue && new Date(task.actualDue) < now,
      daysUntilDue: task.actualDue ? 
        Math.ceil((new Date(task.actualDue).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
    }))

    return NextResponse.json(enhancedTasks)
  } catch (error) {
    console.error('Error fetching task instances:', error)
    return NextResponse.json({ error: 'Failed to fetch task instances' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createLegacyTaskInstanceSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
    const { supplierProjectId, taskTemplateId, actualDue, status } = parsed.data

    // Default due date from template if not provided
    let due: Date | null = null
    if (actualDue) due = new Date(actualDue)
    else {
      const tmpl = await prisma.taskTemplate.findUnique({ where: { id: taskTemplateId }, select: { canonicalDue: true } })
      due = tmpl?.canonicalDue ?? null
    }

    const created = await prisma.taskInstance.create({
      data: {
        supplierProjectId,
        taskTemplateId,
        actualDue: due ?? undefined,
        status: status || 'not_started'
      },
      include: {
        supplierProject: {
          include: { supplier: { select: { name: true } }, project: { select: { id: true, name: true } } }
        },
        taskTemplate: { include: { taskType: { select: { name: true, category: true } } } }
      }
    })

    return NextResponse.json(created)
  } catch (error) {
    console.error('Error creating task instance:', error)
    return NextResponse.json({ error: 'Failed to create task instance' }, { status: 500 })
  }
}
