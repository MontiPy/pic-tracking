import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create Projects
  const projectA = await prisma.project.create({
    data: {
      name: 'Platform Development (A)',
      description: 'Core platform development project',
    },
  })

  const projectB = await prisma.project.create({
    data: {
      name: 'Product Refresh (B)',
      description: 'Product refresh and enhancement project',
    },
  })

  const projectC = await prisma.project.create({
    data: {
      name: 'Technology Integration (C)',
      description: 'New technology integration project',
    },
  })

  // Create Task Types
  const partApproval = await prisma.taskType.create({
    data: {
      name: 'Component Approval',
      category: 'Part Approval',
      description: 'Component approvals, drawings, specifications, sign-offs',
    },
  })

  const productionReadiness = await prisma.taskType.create({
    data: {
      name: 'Production Validation',
      category: 'Production Readiness',
      description: 'Validation activities, capability studies, production trials',
    },
  })

  const newModelBuilds = await prisma.taskType.create({
    data: {
      name: 'Prototype Development',
      category: 'New Model Builds',
      description: 'Prototype development, pilot production, validation testing',
    },
  })

  const general = await prisma.taskType.create({
    data: {
      name: 'Documentation Review',
      category: 'General',
      description: 'Documentation, compliance, contracts, administrative tasks',
    },
  })

  // Create Task Templates for each project
  const now = new Date()
  const templates = [
    // Project A templates
    {
      taskTypeId: partApproval.id,
      projectId: projectA.id,
      canonicalDue: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      description: 'Platform component approval',
    },
    {
      taskTypeId: productionReadiness.id,
      projectId: projectA.id,
      canonicalDue: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000), // 45 days
      description: 'Platform production validation',
    },
    // Project B templates
    {
      taskTypeId: partApproval.id,
      projectId: projectB.id,
      canonicalDue: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000), // 25 days
      description: 'Product refresh component approval',
    },
    {
      taskTypeId: newModelBuilds.id,
      projectId: projectB.id,
      canonicalDue: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days
      description: 'Product refresh prototype',
    },
    // Project C templates
    {
      taskTypeId: general.id,
      projectId: projectC.id,
      canonicalDue: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), // 20 days
      description: 'Technology integration documentation',
    },
  ]

  for (const template of templates) {
    await prisma.taskTemplate.create({ data: template })
  }

  // Create Suppliers
  const suppliers = [
    {
      name: 'Precision Manufacturing Corp',
      contactInfo: 'contact@precision-mfg.com | +1-555-0101',
    },
    {
      name: 'Advanced Components Ltd',
      contactInfo: 'info@advancedcomp.com | +1-555-0202',
    },
    {
      name: 'Quality Systems Inc',
      contactInfo: 'sales@qualitysystems.com | +1-555-0303',
    },
    {
      name: 'Industrial Solutions Group',
      contactInfo: 'support@industrial-solutions.com | +1-555-0404',
    },
  ]

  const createdSuppliers = []
  for (const supplier of suppliers) {
    const created = await prisma.supplier.create({ data: supplier })
    createdSuppliers.push(created)
  }

  // Create Supplier-Project assignments
  const assignments = [
    // Precision Manufacturing - Projects A & B
    { supplierId: createdSuppliers[0].id, projectId: projectA.id },
    { supplierId: createdSuppliers[0].id, projectId: projectB.id },
    // Advanced Components - All projects
    { supplierId: createdSuppliers[1].id, projectId: projectA.id },
    { supplierId: createdSuppliers[1].id, projectId: projectB.id },
    { supplierId: createdSuppliers[1].id, projectId: projectC.id },
    // Quality Systems - Projects B & C
    { supplierId: createdSuppliers[2].id, projectId: projectB.id },
    { supplierId: createdSuppliers[2].id, projectId: projectC.id },
    // Industrial Solutions - Project A only
    { supplierId: createdSuppliers[3].id, projectId: projectA.id },
  ]

  for (const assignment of assignments) {
    await prisma.supplierProject.create({ data: assignment })
  }

  console.log('Database seeded successfully!')
  console.log(`Created ${createdSuppliers.length} suppliers`)
  console.log(`Created 3 projects`)
  console.log(`Created 4 task types`)
  console.log(`Created ${templates.length} task templates`)
  console.log(`Created ${assignments.length} supplier-project assignments`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })