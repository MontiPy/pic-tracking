import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with new hierarchical structure...')

  // 1. Create Projects
  console.log('📁 Creating projects...')
  const project3FS = await prisma.project.create({
    data: {
      name: '3FS',
      description: 'Three-Function System development project',
    },
  })

  const projectMMS = await prisma.project.create({
    data: {
      name: 'MMS',
      description: 'Multi-Module System project',
    },
  })

  // 2. Create Task Types (manufacturing categories)
  console.log('🏗️ Creating task types...')
  const partApprovalType = await prisma.taskType.create({
    data: {
      name: 'Part Approval',
      category: 'Part Approval',
      description: 'Component approvals, drawings, specifications, sign-offs',
    },
  })

  const newModelBuildsType = await prisma.taskType.create({
    data: {
      name: 'New Model Builds',
      category: 'New Model Builds',
      description: 'New model development and validation',
    },
  })

  const productionReadinessType = await prisma.taskType.create({
    data: {
      name: 'Production Readiness',
      category: 'Production Readiness',
      description: 'Production validation and readiness activities',
    },
  })

  // 3. Create Milestones (PA2, PA3, PA4, NMR1, etc.)
  console.log('🎯 Creating milestones...')
  
  // Part Approval milestones
  const pa2 = await prisma.milestone.create({
    data: {
      taskTypeId: partApprovalType.id,
      code: 'PA2',
      name: 'First Article Inspection',
      description: 'Initial part validation and approval',
      sequence: 1,
    },
  })

  const pa3 = await prisma.milestone.create({
    data: {
      taskTypeId: partApprovalType.id,
      code: 'PA3',
      name: 'Production Trial',
      description: 'Production trial and validation',
      sequence: 2,
    },
  })

  const pa4 = await prisma.milestone.create({
    data: {
      taskTypeId: partApprovalType.id,
      code: 'PA4',
      name: 'Production Approval',
      description: 'Final production approval',
      sequence: 3,
    },
  })

  // New Model Builds milestones
  const nmr1 = await prisma.milestone.create({
    data: {
      taskTypeId: newModelBuildsType.id,
      code: 'NMR1',
      name: 'Prototype Build',
      description: 'Initial prototype development',
      sequence: 1,
    },
  })

  const nmr2 = await prisma.milestone.create({
    data: {
      taskTypeId: newModelBuildsType.id,
      code: 'NMR2',
      name: 'Validation Build',
      description: 'Prototype validation and testing',
      sequence: 2,
    },
  })

  // Production Readiness milestones
  const pr1 = await prisma.milestone.create({
    data: {
      taskTypeId: productionReadinessType.id,
      code: 'PR1',
      name: 'Capability Study',
      description: 'Production capability assessment',
      sequence: 1,
    },
  })

  // 4. Create Tasks within Milestones
  console.log('📋 Creating tasks...')
  
  // PA3 tasks (the example you mentioned)
  const gageRRTask = await prisma.task.create({
    data: {
      milestoneId: pa3.id,
      name: 'Gage R&R Submission',
      description: 'Submit gage repeatability and reproducibility study',
      sequence: 1,
    },
  })

  const drawingApprovalTask = await prisma.task.create({
    data: {
      milestoneId: pa3.id,
      name: 'Drawing Approval',
      description: 'Submit and approve technical drawings',
      sequence: 2,
    },
  })

  const materialCertTask = await prisma.task.create({
    data: {
      milestoneId: pa3.id,
      name: 'Material Certification',
      description: 'Submit material certification documents',
      sequence: 3,
    },
  })

  // PA2 tasks
  const initialInspectionTask = await prisma.task.create({
    data: {
      milestoneId: pa2.id,
      name: 'Initial Inspection Report',
      description: 'Submit first article inspection report',
      sequence: 1,
    },
  })

  const dimensionalReportTask = await prisma.task.create({
    data: {
      milestoneId: pa2.id,
      name: 'Dimensional Report',
      description: 'Submit dimensional analysis report',
      sequence: 2,
    },
  })

  // NMR1 tasks
  const prototypeSubmissionTask = await prisma.task.create({
    data: {
      milestoneId: nmr1.id,
      name: 'Prototype Submission',
      description: 'Submit initial prototype for review',
      sequence: 1,
    },
  })

  // 5. Create Project Milestone Tasks (Templates with Due Dates)
  console.log('📅 Creating project milestone task templates...')
  
  const now = new Date()
  const projectMilestoneTasks = [
    // 3FS Project - Part Approval PA2 tasks
    {
      projectId: project3FS.id,
      milestoneId: pa2.id,
      taskId: initialInspectionTask.id,
      dueDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), // 20 days
      notes: 'Critical for 3FS timeline',
    },
    {
      projectId: project3FS.id,
      milestoneId: pa2.id,
      taskId: dimensionalReportTask.id,
      dueDate: new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000), // 22 days
      notes: 'Required before PA3',
    },
    // 3FS Project - Part Approval PA3 tasks (the example you gave)
    {
      projectId: project3FS.id,
      milestoneId: pa3.id,
      taskId: gageRRTask.id,
      dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      notes: 'Critical path item for 3FS',
    },
    {
      projectId: project3FS.id,
      milestoneId: pa3.id,
      taskId: drawingApprovalTask.id,
      dueDate: new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000), // 32 days
      notes: 'Must align with Gage R&R',
    },
    {
      projectId: project3FS.id,
      milestoneId: pa3.id,
      taskId: materialCertTask.id,
      dueDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000), // 28 days
      notes: 'Can be done in parallel',
    },
    // 3FS Project - NMR1 tasks
    {
      projectId: project3FS.id,
      milestoneId: nmr1.id,
      taskId: prototypeSubmissionTask.id,
      dueDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000), // 45 days
      notes: '3FS prototype deadline',
    },
    // MMS Project - Same tasks but different due dates
    {
      projectId: projectMMS.id,
      milestoneId: pa3.id,
      taskId: gageRRTask.id,
      dueDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000), // 25 days (faster for MMS)
      notes: 'Accelerated timeline for MMS',
    },
    {
      projectId: projectMMS.id,
      milestoneId: pa3.id,
      taskId: drawingApprovalTask.id,
      dueDate: new Date(now.getTime() + 27 * 24 * 60 * 60 * 1000), // 27 days
      notes: 'MMS drawing review',
    },
  ]

  const createdProjectMilestoneTasks = []
  for (const pmt of projectMilestoneTasks) {
    const created = await prisma.projectMilestoneTask.create({ data: pmt })
    createdProjectMilestoneTasks.push(created)
  }

  // 6. Create Enhanced Suppliers with new fields
  console.log('🏭 Creating suppliers...')
  const suppliers = [
    {
      name: 'Precision Manufacturing Corp',
      supplierNumber: 'PMC-001',
      location: 'Detroit, MI',
      contacts: JSON.stringify([
        { name: 'John Smith', role: 'Engineering Manager', email: 'j.smith@precision-mfg.com', phone: '+1-555-0101' },
        { name: 'Sarah Johnson', role: 'Quality Manager', email: 's.johnson@precision-mfg.com', phone: '+1-555-0102' }
      ]),
      contactInfo: 'contact@precision-mfg.com | +1-555-0101', // Keep for backward compatibility
    },
    {
      name: 'Advanced Components Ltd',
      supplierNumber: 'ACL-002',
      location: 'Cleveland, OH',
      contacts: JSON.stringify([
        { name: 'Michael Brown', role: 'Project Manager', email: 'm.brown@advancedcomp.com', phone: '+1-555-0202' },
        { name: 'Lisa Davis', role: 'Production Supervisor', email: 'l.davis@advancedcomp.com', phone: '+1-555-0203' }
      ]),
      contactInfo: 'info@advancedcomp.com | +1-555-0202',
    },
    {
      name: 'Quality Systems Inc',
      supplierNumber: 'QSI-003',
      location: 'Indianapolis, IN',
      contacts: JSON.stringify([
        { name: 'Robert Wilson', role: 'Sales Manager', email: 'r.wilson@qualitysystems.com', phone: '+1-555-0303' }
      ]),
      contactInfo: 'sales@qualitysystems.com | +1-555-0303',
    },
  ]

  const createdSuppliers = []
  for (const supplier of suppliers) {
    const created = await prisma.supplier.create({ data: supplier })
    createdSuppliers.push(created)
  }

  // 7. Create Supplier Project Instances
  console.log('🤝 Creating supplier project assignments...')
  const supplierProjectInstances = [
    // Supplier A -> 3FS Project (the example you mentioned)
    { supplierId: createdSuppliers[0].id, projectId: project3FS.id },
    // Advanced Components -> Both projects
    { supplierId: createdSuppliers[1].id, projectId: project3FS.id },
    { supplierId: createdSuppliers[1].id, projectId: projectMMS.id },
    // Quality Systems -> MMS Project
    { supplierId: createdSuppliers[2].id, projectId: projectMMS.id },
  ]

  const createdSupplierProjectInstances = []
  for (const spi of supplierProjectInstances) {
    const created = await prisma.supplierProjectInstance.create({ data: spi })
    createdSupplierProjectInstances.push(created)
  }

  // 8. Create Supplier Task Instances (individual tasks for each supplier)
  console.log('✅ Creating supplier task instances...')
  
  // For each supplier project instance, create task instances for all project milestone tasks
  for (const spi of createdSupplierProjectInstances) {
    const projectMilestoneTasksForProject = createdProjectMilestoneTasks.filter(
      pmt => pmt.projectId === spi.projectId
    )

    for (const pmt of projectMilestoneTasksForProject) {
      await prisma.supplierTaskInstance.create({
        data: {
          supplierProjectInstanceId: spi.id,
          projectMilestoneTaskId: pmt.id,
          dueDate: pmt.dueDate, // Inherit from project template
          status: 'not_started',
          isApplied: true, // All tasks applied by default
        },
      })
    }
  }

  // 9. Demonstrate customization - un-apply some tasks for specific suppliers
  console.log('🎛️ Demonstrating task customization...')
  
  // Find the Gage R&R task for Quality Systems Inc in MMS project and un-apply it
  const qualitySystemsMMS = createdSupplierProjectInstances.find(
    spi => spi.supplierId === createdSuppliers[2].id && spi.projectId === projectMMS.id
  )
  
  if (qualitySystemsMMS) {
    const gageRRProjectTask = createdProjectMilestoneTasks.find(
      pmt => pmt.projectId === projectMMS.id && pmt.taskId === gageRRTask.id
    )
    
    if (gageRRProjectTask) {
      await prisma.supplierTaskInstance.updateMany({
        where: {
          supplierProjectInstanceId: qualitySystemsMMS.id,
          projectMilestoneTaskId: gageRRProjectTask.id,
        },
        data: {
          isApplied: false, // Un-apply this task for this supplier
        },
      })
      console.log('  ↳ Un-applied Gage R&R task for Quality Systems Inc in MMS project')
    }
  }

  // 10. Show the complete hierarchy for the example
  console.log('\\n🎉 Database seeded successfully!')
  console.log('\\n📊 Summary:')
  console.log(`  • ${createdSuppliers.length} suppliers created`)
  console.log(`  • 2 projects created (3FS, MMS)`)
  console.log(`  • 3 task types created (Part Approval, New Model Builds, Production Readiness)`)
  console.log(`  • 6 milestones created (PA2, PA3, PA4, NMR1, NMR2, PR1)`)
  console.log(`  • 6 tasks created (including Gage R&R Submission)`)
  console.log(`  • ${createdProjectMilestoneTasks.length} project milestone task templates created`)
  console.log(`  • ${createdSupplierProjectInstances.length} supplier project assignments created`)
  
  console.log('\\n🌟 Example hierarchy created:')
  console.log('  Supplier A → 3FS → Part Approval → PA3 → Gage R&R Submission')
  console.log('  ↳ Due dates set at project template level for consistency')
  console.log('  ↳ Tasks can be applied/un-applied per supplier as needed')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })