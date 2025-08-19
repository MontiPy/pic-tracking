import { PrismaClient, AnchorType } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateToV2() {
  console.log('🔄 Starting migration from Milestone-based to TaskTypeSection-based model...')

  // Step 1: Migrate Milestone data to TaskTypeSection
  console.log('📋 Migrating Milestones to TaskTypeSections...')
  
  const milestones = await prisma.milestone.findMany({
    include: {
      taskType: true,
    },
  })

  const migratedSections: { [key: string]: string } = {}

  for (const milestone of milestones) {
    console.log(`  → Converting Milestone ${milestone.code} to TaskTypeSection...`)
    
    const section = await prisma.taskTypeSection.create({
      data: {
        taskTypeId: milestone.taskTypeId,
        name: `${milestone.code} - ${milestone.name}`,
        sequence: milestone.sequence,
        description: milestone.description || `Migrated from milestone ${milestone.code}`,
      },
    })
    
    migratedSections[milestone.id] = section.id
    console.log(`    ✓ Created TaskTypeSection: ${section.name}`)
  }

  // Step 2: Update Tasks to reference TaskTypeSections instead of Milestones
  console.log('✅ Updating Tasks to use TaskTypeSections...')
  
  const tasks = await prisma.task.findMany({
    where: {
      milestoneId: { not: null },
    },
    include: {
      milestone: true,
    },
  })

  for (const task of tasks) {
    if (task.milestoneId && migratedSections[task.milestoneId]) {
      console.log(`  → Updating Task: ${task.name}`)
      
      await prisma.task.update({
        where: { id: task.id },
        data: {
          taskTypeId: task.milestone!.taskTypeId,
          sectionId: migratedSections[task.milestoneId],
          // Keep milestoneId for backward compatibility during transition
        },
      })
      
      console.log(`    ✓ Task now references TaskTypeSection and TaskType`)
    }
  }

  // Step 3: Migrate ProjectMilestoneTask to ProjectTaskTemplate
  console.log('📅 Migrating ProjectMilestoneTasks to ProjectTaskTemplates...')
  
  const projectMilestoneTasks = await prisma.projectMilestoneTask.findMany({
    include: {
      task: {
        include: {
          milestone: true,
        },
      },
    },
  })

  const migratedTemplates: { [key: string]: string } = {}

  for (const pmt of projectMilestoneTasks) {
    console.log(`  → Converting ProjectMilestoneTask for Task: ${pmt.task.name}`)
    
    // Find the corresponding section ID
    const sectionId = pmt.task.milestoneId ? migratedSections[pmt.task.milestoneId] : null
    
    const template = await prisma.projectTaskTemplate.create({
      data: {
        projectId: pmt.projectId,
        taskId: pmt.taskId,
        sectionId,
        dueDate: pmt.dueDate,
        owner: pmt.responsibleParties || null,
        notes: pmt.notes,
        isActive: pmt.isActive,
        anchor: AnchorType.PROJECT_START, // Default anchor type
        // Calculate offset days from creation date if available
        offsetDays: Math.ceil((pmt.dueDate.getTime() - pmt.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      },
    })
    
    migratedTemplates[pmt.id] = template.id
    console.log(`    ✓ Created ProjectTaskTemplate with due date: ${template.dueDate.toISOString().split('T')[0]}`)
  }

  // Step 4: Update SupplierTaskInstances to reference new ProjectTaskTemplates
  console.log('📝 Updating SupplierTaskInstances to use ProjectTaskTemplates...')
  
  const supplierTaskInstances = await prisma.supplierTaskInstance.findMany({
    where: {
      projectMilestoneTaskId: { not: null },
    },
  })

  for (const sti of supplierTaskInstances) {
    if (sti.projectMilestoneTaskId && migratedTemplates[sti.projectMilestoneTaskId]) {
      console.log(`  → Updating SupplierTaskInstance: ${sti.id}`)
      
      await prisma.supplierTaskInstance.update({
        where: { id: sti.id },
        data: {
          projectTaskTemplateId: migratedTemplates[sti.projectMilestoneTaskId],
          // Keep projectMilestoneTaskId for backward compatibility during transition
        },
      })
      
      console.log(`    ✓ SupplierTaskInstance now references ProjectTaskTemplate`)
    }
  }

  // Step 5: Create ProjectTaskType relationships
  console.log('🔗 Creating ProjectTaskType relationships...')
  
  const projectTaskTypes = await prisma.project.findMany({
    include: {
      projectTaskTemplates: {
        include: {
          task: {
            include: {
              taskType: true,
            },
          },
        },
      },
    },
  })

  for (const project of projectTaskTypes) {
    const taskTypeIds = new Set(
      project.projectTaskTemplates.map(template => template.task.taskType.id)
    )

    for (const taskTypeId of taskTypeIds) {
      // Check if relationship already exists
      const existing = await prisma.projectTaskType.findUnique({
        where: {
          projectId_taskTypeId: {
            projectId: project.id,
            taskTypeId,
          },
        },
      })

      if (!existing) {
        await prisma.projectTaskType.create({
          data: {
            projectId: project.id,
            taskTypeId,
          },
        })
        
        const taskType = await prisma.taskType.findUnique({ where: { id: taskTypeId } })
        console.log(`    ✓ Created ProjectTaskType: ${project.name} ↔ ${taskType?.name}`)
      }
    }
  }

  // Step 6: Verification - Show migrated data structure
  console.log('\n🔍 Verifying migration results...')
  
  const verificationQuery = await prisma.taskType.findMany({
    include: {
      sections: {
        include: {
          tasks: {
            include: {
              projectTaskTemplates: {
                include: {
                  project: true,
                  supplierTaskInstances: true,
                },
              },
            },
          },
        },
      },
      projectTaskTypes: {
        include: {
          project: true,
        },
      },
    },
  })

  verificationQuery.forEach(taskType => {
    console.log(`\nTaskType: ${taskType.name}`)
    console.log(`  ProjectTaskTypes: ${taskType.projectTaskTypes.map(ptt => ptt.project.name).join(', ')}`)
    
    taskType.sections.forEach(section => {
      console.log(`  └── Section: ${section.name}`)
      
      section.tasks.forEach(task => {
        console.log(`      └── Task: ${task.name}`)
        console.log(`          Templates: ${task.projectTaskTemplates.length}`)
        console.log(`          Supplier Instances: ${task.projectTaskTemplates.reduce((sum, t) => sum + t.supplierTaskInstances.length, 0)}`)
      })
    })
  })

  console.log('\n🎉 Migration to V2 completed successfully!')
  console.log('\n📊 Migration Summary:')
  console.log(`  • ${milestones.length} Milestones → TaskTypeSections`)
  console.log(`  • ${tasks.length} Tasks updated with TaskType/Section references`)
  console.log(`  • ${projectMilestoneTasks.length} ProjectMilestoneTasks → ProjectTaskTemplates`)
  console.log(`  • ${supplierTaskInstances.length} SupplierTaskInstances updated`)
  console.log(`  • ProjectTaskType relationships created`)

  console.log('\n⚠️  Note: Legacy models (Milestone, ProjectMilestoneTask) are preserved for backward compatibility.')
  console.log('   Remove them in a future migration after confirming all APIs use V2 models.')
}

async function main() {
  try {
    await migrateToV2()
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log('\n✅ Migration completed and database disconnected.')
  })
  .catch(async (e) => {
    console.error('💥 Migration error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })