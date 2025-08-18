import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, contactInfo } = body

    if (!name || !contactInfo) {
      return NextResponse.json(
        { error: 'Name and contact info are required' },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        name,
        contactInfo
      },
      include: {
        supplierProjects: {
          include: {
            project: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Error updating supplier:', error)
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.supplier.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}