import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSupplierProjectInstanceSchema } from '@/lib/validation'

// Create a supplier-project assignment and backfill supplier task instances
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createSupplierProjectInstanceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
    }
    const { supplierId, projectId, status = 'active' } = parsed.data

    // Ensure supplier and project exist
    const [supplier, project] = await Promise.all([
      prisma.supplier.findUnique({ where: { id: supplierId } }),
      prisma.project.findUnique({ where: { id: projectId } })
    ])
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // Create or retrieve SPI
    const spi = await prisma.supplierProjectInstance.upsert({
      where: { supplierId_projectId: { supplierId, projectId } },
      update: { status },
      create: { supplierId, projectId, status }
    })

    // Get all active project templates
    const templates = await prisma.projectMilestoneTask.findMany({
      where: { projectId, isActive: true },
      select: { id: true, dueDate: true }
    })

    // Backfill supplier task instances, skipping existing ones
    let created = 0
    for (const t of templates) {
      try {
        await prisma.supplierTaskInstance.create({
          data: {
            supplierProjectInstanceId: spi.id,
            projectMilestoneTaskId: t.id,
            dueDate: t.dueDate,
            status: 'not_started',
            isApplied: true
          }
        })
        created++
      } catch (e: any) {
        // ignore unique constraint violations
        if (e.code !== 'P2002') throw e
      }
    }

    return NextResponse.json({ supplierProjectInstance: spi, createdInstances: created })
  } catch (error) {
    console.error('Error creating supplier project instance:', error)
    return NextResponse.json({ error: 'Failed to create supplier project instance' }, { status: 500 })
  }
}
