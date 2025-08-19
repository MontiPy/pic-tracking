import { PrismaClient, AnchorType, TaskStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Testing V2 Schema with TaskTypeSection model...')

  // Clean up existing data
  console.log('🧹 Cleaning existing data...')
  await prisma.supplierTaskInstance.deleteMany()
  await prisma.projectTaskTemplate.deleteMany()
  await prisma.projectTaskType.deleteMany()
  await prisma.task.deleteMany()
  await prisma.taskTypeSection.deleteMany()
  await prisma.supplierProjectInstance.deleteMany()
  await prisma.taskType.deleteMany()
  await prisma.project.deleteMany()
  await prisma.supplier.deleteMany()

  // 1. Create Projects
  console.log('📁 Creating projects...')
  const project3FS = await prisma.project.create({
    data: {
      name: '3FS V2',
      description: 'Three-Function System development project (V2 Schema)',
    },
  })

  // 2. Create Suppliers
  console.log('🏭 Creating suppliers...')
  const supplier = await prisma.supplier.create({
    data: {
      name: 'Precision Manufacturing Corp V2',
      supplierNumber: 'PMC-001-V2',
      location: 'Detroit, MI',
      contacts: JSON.stringify([
        { name: 'John Smith', role: 'Engineering Manager', email: 'j.smith@precision-mfg.com', phone: '+1-555-0101' },
      ]),
      contactInfo: 'contact@precision-mfg.com | +1-555-0101',
    },
  })

  // 3. Create TaskType
  console.log('🏗️ Creating task type...')
  const partApprovalType = await prisma.taskType.create({
    data: {
      name: 'Part Approval V2',
      category: 'Part Approval',
      description: 'Component approvals using V2 TaskTypeSection model',
    },
  })

  // 4. Create TaskTypeSection (replaces Milestone)
  console.log('📋 Creating task type sections...')
  const pa2Section = await prisma.taskTypeSection.create({
    data: {
      taskTypeId: partApprovalType.id,
      name: 'PA2 - First Article',
      sequence: 1,
      description: 'First Article Inspection tasks',
    },
  })

  const pa3Section = await prisma.taskTypeSection.create({
    data: {
      taskTypeId: partApprovalType.id,
      name: 'PA3 - Production Trial',
      sequence: 2,
      description: 'Production trial validation tasks',
    },
  })

  // 5. Create Tasks with section relationships
  console.log('✅ Creating tasks...')
  const gageRRTask = await prisma.task.create({
    data: {
      taskTypeId: partApprovalType.id,
      sectionId: pa3Section.id,
      name: 'Gage R&R Submission',
      description: 'Submit gage repeatability and reproducibility study',
      sequence: 1,
      defaultOwner: 'Quality Engineer',
      defaultNotes: 'Use MSA guidelines',
    },
  })

  const drawingTask = await prisma.task.create({
    data: {
      taskTypeId: partApprovalType.id,
      sectionId: pa3Section.id,
      name: 'Drawing Approval',
      description: 'Submit and approve technical drawings',
      sequence: 2,
      defaultOwner: 'Design Engineer',
    },
  })

  // Create a sub-task to demonstrate hierarchy
  const drawingReviewSubTask = await prisma.task.create({
    data: {
      taskTypeId: partApprovalType.id,
      sectionId: pa3Section.id,
      parentTaskId: drawingTask.id,
      name: 'Drawing Review Checklist',
      description: 'Complete internal drawing review checklist',
      sequence: 1,
      defaultOwner: 'Senior Engineer',
    },
  })

  // PA2 task
  const initialInspectionTask = await prisma.task.create({
    data: {
      taskTypeId: partApprovalType.id,
      sectionId: pa2Section.id,
      name: 'Initial Inspection Report',
      description: 'Submit first article inspection report',
      sequence: 1,
      defaultOwner: 'QC Inspector',
    },
  })

  // 6. Create ProjectTaskType relationship
  console.log('🔗 Creating project-tasktype relationship...')
  const projectTaskType = await prisma.projectTaskType.create({
    data: {
      projectId: project3FS.id,
      taskTypeId: partApprovalType.id,
    },
  })

  // 7. Create ProjectTaskTemplates (replaces ProjectMilestoneTask)
  console.log('📅 Creating project task templates...')
  const now = new Date()

  const gageRRTemplate = await prisma.projectTaskTemplate.create({
    data: {
      projectId: project3FS.id,
      taskId: gageRRTask.id,
      sectionId: pa3Section.id,
      dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      owner: 'John Smith',
      notes: 'Critical path item for 3FS project',
      anchor: AnchorType.PROJECT_START,
      offsetDays: 30,
    },
  })

  const drawingTemplate = await prisma.projectTaskTemplate.create({
    data: {
      projectId: project3FS.id,
      taskId: drawingTask.id,
      sectionId: pa3Section.id,
      dueDate: new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000),
      owner: 'Sarah Johnson',
      notes: 'Must align with Gage R&R completion',
      anchor: AnchorType.RELATIVE_TO_TASK,
      offsetDays: 2,
    },
  })

  const subTaskTemplate = await prisma.projectTaskTemplate.create({
    data: {
      projectId: project3FS.id,
      taskId: drawingReviewSubTask.id,
      sectionId: pa3Section.id,
      dueDate: new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000),
      owner: 'Engineering Team',
      notes: 'Sub-task: Complete before parent task',
      anchor: AnchorType.PROJECT_START,
      offsetDays: 31,
    },
  })

  const inspectionTemplate = await prisma.projectTaskTemplate.create({
    data: {
      projectId: project3FS.id,
      taskId: initialInspectionTask.id,
      sectionId: pa2Section.id,
      dueDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      owner: 'QC Team',
      notes: 'Required before PA3 tasks',
      anchor: AnchorType.PROJECT_START,
      offsetDays: 20,
    },
  })

  // 8. Create SupplierProjectInstance
  console.log('🤝 Creating supplier project assignment...')
  const supplierProjectInstance = await prisma.supplierProjectInstance.create({
    data: {
      supplierId: supplier.id,
      projectId: project3FS.id,
      status: 'active',
    },
  })

  // 9. Create SupplierTaskInstances using V2 model
  console.log('📝 Creating supplier task instances (V2)...')
  
  const supplierGageTask = await prisma.supplierTaskInstance.create({
    data: {
      supplierProjectInstanceId: supplierProjectInstance.id,
      projectTaskTemplateId: gageRRTemplate.id,
      status: TaskStatus.not_started,
      dueDate: gageRRTemplate.dueDate,
      owner: gageRRTemplate.owner,
      notes: 'Inherited from project template',
    },
  })

  const supplierDrawingTask = await prisma.supplierTaskInstance.create({
    data: {
      supplierProjectInstanceId: supplierProjectInstance.id,
      projectTaskTemplateId: drawingTemplate.id,
      status: TaskStatus.in_progress,
      dueDate: drawingTemplate.dueDate,
      actualDueDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000), // Extended due date
      owner: drawingTemplate.owner,
      notes: 'Due date extended by 3 days per supplier request',
    },
  })

  const supplierSubTask = await prisma.supplierTaskInstance.create({
    data: {
      supplierProjectInstanceId: supplierProjectInstance.id,
      projectTaskTemplateId: subTaskTemplate.id,
      status: TaskStatus.completed,
      dueDate: subTaskTemplate.dueDate,
      owner: subTaskTemplate.owner,
      notes: 'Sub-task completed first',
      completedAt: new Date(),
    },
  })

  const supplierInspectionTask = await prisma.supplierTaskInstance.create({
    data: {
      supplierProjectInstanceId: supplierProjectInstance.id,
      projectTaskTemplateId: inspectionTemplate.id,
      status: TaskStatus.completed,
      dueDate: inspectionTemplate.dueDate,
      owner: inspectionTemplate.owner,
      completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // Completed 5 days ago
    },
  })

  // 10. Query and display the V2 hierarchy
  console.log('\n🎉 V2 Schema seeding completed successfully!')
  console.log('\n📊 V2 Structure Created:')
  console.log(`  • 1 Project: ${project3FS.name}`)
  console.log(`  • 1 Supplier: ${supplier.name}`)
  console.log(`  • 1 TaskType: ${partApprovalType.name}`)
  console.log(`  • 2 TaskTypeSections: PA2, PA3`)
  console.log(`  • 4 Tasks (including 1 sub-task)`)
  console.log(`  • 4 ProjectTaskTemplates with AnchorType scheduling`)
  console.log(`  • 4 SupplierTaskInstances with various statuses`)

  // Demonstrate querying the V2 hierarchy
  console.log('\n🌟 V2 Hierarchy Query Example:')
  
  const hierarchyQuery = await prisma.taskType.findFirst({
    where: { id: partApprovalType.id },
    include: {
      sections: {
        include: {
          tasks: {
            include: {
              subTasks: true,
              projectTaskTemplates: {
                include: {
                  supplierTaskInstances: {
                    include: {
                      supplierProjectInstance: {
                        include: {
                          supplier: true,
                          project: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  console.log(`\nTaskType: ${hierarchyQuery?.name}`)
  hierarchyQuery?.sections.forEach(section => {
    console.log(`  └── Section: ${section.name}`)
    section.tasks.forEach(task => {
      console.log(`      └── Task: ${task.name}`)
      if (task.subTasks.length > 0) {
        task.subTasks.forEach(subTask => {
          console.log(`          └── SubTask: ${subTask.name}`)
        })
      }
      task.projectTaskTemplates.forEach(template => {
        console.log(`          └── Template: Due ${template.dueDate.toISOString().split('T')[0]}, Anchor: ${template.anchor}`)
        template.supplierTaskInstances.forEach(instance => {
          console.log(`              └── Instance: ${instance.supplierProjectInstance.supplier.name} - Status: ${instance.status}`)
        })
      })
    })
  })

  console.log('\n✅ V2 Schema migration test successful!')
  console.log('🔄 Ready for API and UI updates to use new TaskTypeSection model')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ V2 seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })