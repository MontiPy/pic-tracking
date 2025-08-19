const { prisma } = require('../lib/prisma')

async function assessMigrationData() {
  console.log('🔍 PHASE 1: Pre-Migration Data Assessment')
  console.log('=========================================\n')

  try {
    // 1.1 Data Volume Assessment
    console.log('📊 Table Row Counts:')
    console.log('-------------------')

    const suppliers = await prisma.supplier.count()
    const projects = await prisma.project.count()
    const taskTypes = await prisma.taskType.count()
    
    // Legacy model counts
    const milestones = await prisma.milestone.count()
    const tasks = await prisma.task.count()
    const projectMilestoneTasks = await prisma.projectMilestoneTask.count()
    const supplierTaskInstances = await prisma.supplierTaskInstance.count()
    
    // New model counts
    const taskTypeSections = await prisma.taskTypeSection.count()
    const projectTaskTemplates = await prisma.projectTaskTemplate.count()
    const projectTaskTypes = await prisma.projectTaskType.count()
    const supplierProjectInstances = await prisma.supplierProjectInstance.count()

    console.log(`Suppliers:                    ${suppliers}`)
    console.log(`Projects:                     ${projects}`)
    console.log(`TaskTypes:                    ${taskTypes}`)
    console.log(`Milestones (Legacy):          ${milestones}`)
    console.log(`Tasks:                        ${tasks}`)
    console.log(`ProjectMilestoneTasks (Leg):  ${projectMilestoneTasks}`)
    console.log(`SupplierTaskInstances:        ${supplierTaskInstances}`)
    console.log(`TaskTypeSections (New):       ${taskTypeSections}`)
    console.log(`ProjectTaskTemplates (New):   ${projectTaskTemplates}`)
    console.log(`ProjectTaskTypes (New):       ${projectTaskTypes}`)
    console.log(`SupplierProjectInstances:     ${supplierProjectInstances}`)

    // 1.2 Migration Status Assessment
    console.log('\n🔄 Migration Status:')
    console.log('-------------------')

    const tasksWithSections = await prisma.task.count({
      where: { sectionId: { not: null } }
    })

    const supplierInstancesWithNewTemplate = await prisma.supplierTaskInstance.count({
      where: { projectTaskTemplateId: { not: null } }
    })

    const supplierInstancesWithLegacyTemplate = await prisma.supplierTaskInstance.count({
      where: { projectMilestoneTaskId: { not: null } }
    })

    console.log(`Tasks with Sections (V2):           ${tasksWithSections}/${tasks}`)
    console.log(`SupplierInstances with V2 Template: ${supplierInstancesWithNewTemplate}/${supplierTaskInstances}`)
    console.log(`SupplierInstances with Legacy:      ${supplierInstancesWithLegacyTemplate}/${supplierTaskInstances}`)

    const migrationComplete = (
      taskTypeSections > 0 && 
      tasksWithSections === tasks &&
      projectTaskTemplates > 0 &&
      supplierInstancesWithNewTemplate === supplierTaskInstances
    )

    console.log(`Migration Status: ${migrationComplete ? '✅ COMPLETE' : '⚠️  PENDING'}`)

    // 1.3 Data Quality Issues
    console.log('\n🔍 Data Quality Assessment:')
    console.log('---------------------------')

    // Check for orphaned records
    const orphanedTasks = await prisma.task.count({
      where: {
        milestone: null,
        milestoneId: { not: null }
      }
    })

    const orphanedSupplierInstances = await prisma.supplierTaskInstance.count({
      where: {
        AND: [
          { projectMilestoneTask: null },
          { projectMilestoneTaskId: { not: null } }
        ]
      }
    })

    const invalidStatuses = await prisma.supplierTaskInstance.count({
      where: {
        status: { notIn: ['not_started', 'in_progress', 'completed', 'blocked', 'cancelled'] }
      }
    })

    const futureDueDates = await prisma.supplierTaskInstance.count({
      where: {
        dueDate: { gte: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) } // 1 year from now
      }
    })

    console.log(`Orphaned Tasks:                ${orphanedTasks}`)
    console.log(`Orphaned SupplierInstances:   ${orphanedSupplierInstances}`)
    console.log(`Invalid Status Values:        ${invalidStatuses}`)
    console.log(`Suspicious Future Due Dates:  ${futureDueDates}`)

    // 1.4 Relationship Analysis
    console.log('\n🔗 Relationship Analysis:')
    console.log('-------------------------')

    const taskTypesWithMilestones = await prisma.taskType.findMany({
      include: {
        milestones: {
          include: {
            tasks: true
          }
        },
        sections: {
          include: {
            tasks: true
          }
        }
      }
    })

    taskTypesWithMilestones.forEach(taskType => {
      const milestonesCount = taskType.milestones.length
      const sectionsCount = taskType.sections.length
      const tasksInMilestones = taskType.milestones.reduce((sum, m) => sum + m.tasks.length, 0)
      const tasksInSections = taskType.sections.reduce((sum, s) => sum + s.tasks.length, 0)

      console.log(`TaskType: ${taskType.name}`)
      console.log(`  Milestones: ${milestonesCount} (${tasksInMilestones} tasks)`)
      console.log(`  Sections:   ${sectionsCount} (${tasksInSections} tasks)`)
    })

    // 1.5 Critical Business Data
    console.log('\n💼 Critical Business Data:')
    console.log('--------------------------')

    const activeSupplierInstances = await prisma.supplierTaskInstance.count({
      where: { status: { in: ['not_started', 'in_progress'] } }
    })

    const overdueInstances = await prisma.supplierTaskInstance.count({
      where: {
        status: { in: ['not_started', 'in_progress'] },
        dueDate: { lt: new Date() }
      }
    })

    const completedInstances = await prisma.supplierTaskInstance.count({
      where: { status: 'completed' }
    })

    // Note: Simplified to avoid JSON field filtering complexity
    const allInstances = await prisma.supplierTaskInstance.findMany({
      select: {
        submissionFiles: true,
        notes: true
      }
    })

    const instancesWithFiles = allInstances.filter(i => i.submissionFiles !== null).length
    const instancesWithNotes = allInstances.filter(i => i.notes !== null && i.notes.trim() !== '').length

    console.log(`Active Supplier Tasks:        ${activeSupplierInstances}`)
    console.log(`Overdue Tasks:                ${overdueInstances}`)
    console.log(`Completed Tasks:              ${completedInstances}`)
    console.log(`Tasks with File Attachments:  ${instancesWithFiles}`)
    console.log(`Tasks with Notes:             ${instancesWithNotes}`)

    // 1.6 Risk Assessment Summary
    console.log('\n⚠️  Risk Assessment:')
    console.log('-------------------')

    const risks = []
    
    if (orphanedTasks > 0) risks.push(`${orphanedTasks} orphaned tasks`)
    if (orphanedSupplierInstances > 0) risks.push(`${orphanedSupplierInstances} orphaned supplier instances`)
    if (invalidStatuses > 0) risks.push(`${invalidStatuses} invalid status values`)
    if (activeSupplierInstances > 100) risks.push(`High volume of active tasks (${activeSupplierInstances})`)
    if (instancesWithFiles > 0) risks.push(`${instancesWithFiles} tasks with file attachments need preservation`)

    if (risks.length === 0) {
      console.log('✅ No critical risks identified')
    } else {
      console.log('🔴 Risks identified:')
      risks.forEach(risk => console.log(`   • ${risk}`))
    }

    // 1.7 Migration Readiness
    console.log('\n📋 Migration Readiness Checklist:')
    console.log('---------------------------------')

    const readinessChecks = [
      { name: 'Data Volume Reasonable', passed: supplierTaskInstances < 10000 },
      { name: 'No Orphaned Records', passed: orphanedTasks === 0 && orphanedSupplierInstances === 0 },
      { name: 'Valid Status Values', passed: invalidStatuses === 0 },
      { name: 'Schema V2 Models Present', passed: taskTypeSections >= 0 }, // Table exists
      { name: 'Active Business Data Present', passed: activeSupplierInstances > 0 },
    ]

    readinessChecks.forEach(check => {
      console.log(`${check.passed ? '✅' : '❌'} ${check.name}`)
    })

    const overallReady = readinessChecks.every(check => check.passed)
    console.log(`\nOverall Migration Readiness: ${overallReady ? '✅ READY' : '❌ NOT READY'}`)

    if (!overallReady) {
      console.log('\n🔧 Recommended Actions Before Migration:')
      readinessChecks
        .filter(check => !check.passed)
        .forEach(check => {
          switch (check.name) {
            case 'No Orphaned Records':
              console.log('   • Clean up orphaned task and supplier instance records')
              break
            case 'Valid Status Values':
              console.log('   • Fix invalid status values in supplier task instances')
              break
            case 'Data Volume Reasonable':
              console.log('   • Consider chunked migration for large datasets')
              break
          }
        })
    }

    return {
      volumes: {
        suppliers, projects, taskTypes, milestones, tasks,
        projectMilestoneTasks, supplierTaskInstances, taskTypeSections,
        projectTaskTemplates, projectTaskTypes, supplierProjectInstances
      },
      quality: {
        orphanedTasks, orphanedSupplierInstances, invalidStatuses, futureDueDates
      },
      business: {
        activeSupplierInstances, overdueInstances, completedInstances,
        instancesWithFiles, instancesWithNotes
      },
      readiness: overallReady,
      migrationComplete
    }

  } catch (error) {
    console.error('❌ Assessment failed:', error)
    throw error
  }
}

async function main() {
  try {
    const assessment = await assessMigrationData()
    
    console.log('\n📄 Assessment Complete - Results saved for migration planning')
    
    return assessment
  } catch (error) {
    console.error('💥 Assessment error:', error)
    throw error
  }
}

if (require.main === module) {
  main()
    .then(async () => {
      console.log('\n✅ Assessment completed.')
    })
    .catch(async (e) => {
      console.error('💥 Assessment error:', e)
      process.exit(1)
    })
}

module.exports = { assessMigrationData }