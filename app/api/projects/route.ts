import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        supplierProjects: {
          include: {
            supplier: {
              select: {
                name: true
              }
            }
          }
        },
        taskTemplates: {
          include: {
            taskType: {
              select: {
                name: true,
                category: true
              }
            }
          },
          orderBy: {
            canonicalDue: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || ''
      },
      include: {
        supplierProjects: {
          include: {
            supplier: {
              select: {
                name: true
              }
            }
          }
        },
        taskTemplates: {
          include: {
            taskType: {
              select: {
                name: true,
                category: true
              }
            }
          },
          orderBy: {
            canonicalDue: 'asc'
          }
        }
      }
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}