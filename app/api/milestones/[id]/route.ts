import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET endpoint for individual milestone with full details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const milestone = await prisma.milestone.findUnique({
      where: { id: params.id },
      include: {
        taskType: {
          select: {
            id: true,
            name: true,
            category: true,
            description: true
          }
        },
        tasks: {
          include: {
            projectMilestoneTasks: {
              select: {
                id: true,
                projectId: true,
                dueDate: true,
                isActive: true,
                notes: true,
                project: {
                  select: {
                    name: true,
                    description: true
                  }
                }
              }
            }
          },
          orderBy: { sequence: 'asc' }
        },
        projectMilestoneTasks: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true
              }
            },
            task: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        _count: {
          select: {
            tasks: true,
            projectMilestoneTasks: true
          }
        }
      }
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    return NextResponse.json(milestone)
  } catch (error) {
    console.error('Error fetching milestone:', error)
    return NextResponse.json({ error: 'Failed to fetch milestone' }, { status: 500 })
  }
}

// PUT endpoint for updating milestones
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { code, name, description, sequence, isRequired } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Code and name are required' },
        { status: 400 }
      )
    }

    // Check if milestone exists
    const existingMilestone = await prisma.milestone.findUnique({
      where: { id: params.id }
    })

    if (!existingMilestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    const milestone = await prisma.milestone.update({
      where: { id: params.id },
      data: {
        code,
        name,
        description,
        sequence,
        isRequired
      },
      include: {
        taskType: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        tasks: {
          select: {
            id: true,
            name: true,
            description: true,
            sequence: true,
            isRequired: true
          },
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: {
            tasks: true,
            projectMilestoneTasks: true
          }
        }
      }
    })

    return NextResponse.json(milestone)
  } catch (error) {
    console.error('Error updating milestone:', error)
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('code')) {
        return NextResponse.json(
          { error: 'Milestone code must be unique within the task type' },
          { status: 409 }
        )
      }
    }
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 })
  }
}

// DELETE endpoint for milestones
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if milestone exists and has dependencies
    const milestone = await prisma.milestone.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            tasks: true,
            projectMilestoneTasks: true
          }
        }
      }
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Check for dependencies
    if (milestone._count.tasks > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete milestone with existing tasks',
          details: `This milestone has ${milestone._count.tasks} task(s). Delete tasks first.`
        },
        { status: 409 }
      )
    }

    if (milestone._count.projectMilestoneTasks > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete milestone used in projects',
          details: `This milestone is used in ${milestone._count.projectMilestoneTasks} project template(s).`
        },
        { status: 409 }
      )
    }

    await prisma.milestone.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting milestone:', error)
    return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 })
  }
}