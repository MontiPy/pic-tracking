import { prisma } from '../lib/prisma'

interface ValidationResult {
  timestamp: string
  passed: boolean
  summary: {
    totalChecks: number
    passedChecks: number
    failedChecks: number
  }
  checks: ValidationCheck[]
  recommendations: string[]
}

interface ValidationCheck {
  category: string
  name: string
  passed: boolean
  details: string
  data?: any
  severity: 'critical' | 'warning' | 'info'
}

async function validateV2System(): Promise<ValidationResult> {
  const timestamp = new Date().toISOString()
  const checks: ValidationCheck[] = []
  const recommendations: string[] = []

  console.log('🔍 V2 SYSTEM VALIDATION')
  console.log('========================\n')
  console.log(`Timestamp: ${timestamp}\n`)

  try {
    // 1. Schema Validation
    console.log('1️⃣ Schema Structure Validation')
    console.log('-------------------------------')

    // Check V2 models exist and have correct structure
    const v2ModelChecks = [
      {
        name: 'TaskTypeSection model exists',
        test: async () => {
          const count = await prisma.taskTypeSection.count()
          return { passed: count >= 0, details: `Found ${count} TaskTypeSection records` }
        }
      },
      {
        name: 'ProjectTaskTemplate model exists',
        test: async () => {
          const count = await prisma.projectTaskTemplate.count()
          return { passed: count >= 0, details: `Found ${count} ProjectTaskTemplate records` }
        }
      },
      {
        name: 'Tasks have sectionId references',
        test: async () => {
          const total = await prisma.task.count()
          const withSections = await prisma.task.count({ where: { sectionId: { not: null } } })
          return { 
            passed: total === withSections, 
            details: `${withSections}/${total} tasks have section references` 
          }
        }
      },
      {
        name: 'SupplierTaskInstances use V2 templates',
        test: async () => {
          const total = await prisma.supplierTaskInstance.count()
          const withV2 = await prisma.supplierTaskInstance.count({ 
            where: { projectTaskTemplateId: { not: null } } 
          })
          return { 
            passed: total === withV2, 
            details: `${withV2}/${total} instances use V2 ProjectTaskTemplate` 
          }
        }
      }
    ]

    for (const check of v2ModelChecks) {
      try {
        const result = await check.test()
        checks.push({
          category: 'Schema',
          name: check.name,
          passed: result.passed,
          details: result.details,
          severity: 'critical'
        })
        console.log(`${result.passed ? '✅' : '❌'} ${check.name}: ${result.details}`)
      } catch (error) {
        checks.push({
          category: 'Schema',
          name: check.name,
          passed: false,
          details: `Error: ${error}`,
          severity: 'critical'
        })
        console.log(`❌ ${check.name}: Error - ${error}`)
      }
    }

    // 2. Data Integrity Validation
    console.log('\n2️⃣ Data Integrity Validation')
    console.log('-----------------------------')

    const integrityChecks = [
      {
        name: 'No orphaned Tasks',
        test: async () => {
          const tasks = await prisma.task.findMany()
          const orphaned = tasks.filter(t => t.sectionId === null && t.taskTypeId !== null).length
          return { passed: orphaned === 0, details: `${orphaned} orphaned tasks found` }
        }
      },
      {
        name: 'All TaskTypeSections have valid TaskType',
        test: async () => {
          const total = await prisma.taskTypeSection.count()
          const sections = await prisma.taskTypeSection.findMany({
            include: { taskType: true }
          })
          const valid = sections.filter(s => s.taskType !== null).length
          return { passed: total === valid, details: `${valid}/${total} sections have valid TaskType` }
        }
      },
      {
        name: 'All ProjectTaskTemplates have valid references',
        test: async () => {
          const templates = await prisma.projectTaskTemplate.findMany({
            include: {
              project: true,
              task: true
            }
          })
          const invalid = templates.filter(t => !t.project || !t.task)
          return { 
            passed: invalid.length === 0, 
            details: `${templates.length - invalid.length}/${templates.length} templates have valid references` 
          }
        }
      },
      {
        name: 'SupplierTaskInstances have valid due dates',
        test: async () => {
          const instances = await prisma.supplierTaskInstance.findMany()
          const validDates = instances.filter(i => i.dueDate && i.dueDate > new Date('2020-01-01'))
          return { 
            passed: validDates.length === instances.length, 
            details: `${validDates.length}/${instances.length} instances have valid due dates` 
          }
        }
      }
    ]

    for (const check of integrityChecks) {
      try {
        const result = await check.test()
        checks.push({
          category: 'Data Integrity',
          name: check.name,
          passed: result.passed,
          details: result.details,
          severity: result.passed ? 'info' : 'warning'
        })
        console.log(`${result.passed ? '✅' : '⚠️'} ${check.name}: ${result.details}`)
      } catch (error) {
        checks.push({
          category: 'Data Integrity',
          name: check.name,
          passed: false,
          details: `Error: ${error}`,
          severity: 'critical'
        })
        console.log(`❌ ${check.name}: Error - ${error}`)
      }
    }

    // 3. Relationship Validation
    console.log('\n3️⃣ Relationship Validation')
    console.log('---------------------------')

    const relationshipChecks = [
      {
        name: 'TaskType → TaskTypeSection → Task hierarchy',
        test: async () => {
          const taskTypes = await prisma.taskType.findMany({
            include: {
              sections: {
                include: {
                  tasks: true
                }
              }
            }
          })
          
          let validHierarchy = true
          let details = ''
          
          for (const taskType of taskTypes) {
            const sectionCount = taskType.sections.length
            const taskCount = taskType.sections.reduce((sum, s) => sum + s.tasks.length, 0)
            details += `${taskType.name}: ${sectionCount} sections, ${taskCount} tasks; `
            
            if (sectionCount === 0 && taskCount === 0) {
              validHierarchy = false
            }
          }
          
          return { passed: validHierarchy, details: details.trim() }
        }
      },
      {
        name: 'Project → ProjectTaskTemplate → SupplierTaskInstance flow',
        test: async () => {
          const projects = await prisma.project.findMany({
            include: {
              projectTaskTemplates: {
                include: {
                  supplierTaskInstances: true
                }
              }
            }
          })
          
          let validFlow = true
          let details = ''
          
          for (const project of projects) {
            const templateCount = project.projectTaskTemplates.length
            const instanceCount = project.projectTaskTemplates.reduce((sum, t) => sum + t.supplierTaskInstances.length, 0)
            details += `${project.name}: ${templateCount} templates, ${instanceCount} instances; `
            
            if (templateCount > 0 && instanceCount === 0) {
              validFlow = false
            }
          }
          
          return { passed: validFlow, details: details.trim() }
        }
      }
    ]

    for (const check of relationshipChecks) {
      try {
        const result = await check.test()
        checks.push({
          category: 'Relationships',
          name: check.name,
          passed: result.passed,
          details: result.details,
          severity: result.passed ? 'info' : 'warning'
        })
        console.log(`${result.passed ? '✅' : '⚠️'} ${check.name}: ${result.details}`)
      } catch (error) {
        checks.push({
          category: 'Relationships',
          name: check.name,
          passed: false,
          details: `Error: ${error}`,
          severity: 'critical'
        })
        console.log(`❌ ${check.name}: Error - ${error}`)
      }
    }

    // 4. Business Logic Validation
    console.log('\n4️⃣ Business Logic Validation')
    console.log('-----------------------------')

    const businessChecks = [
      {
        name: 'Due date propagation works correctly',
        test: async () => {
          const templates = await prisma.projectTaskTemplate.findMany({
            include: {
              supplierTaskInstances: true
            }
          })
          
          let correctPropagation = 0
          let totalChecked = 0
          
          for (const template of templates) {
            for (const instance of template.supplierTaskInstances) {
              totalChecked++
              // Check if due date matches template (unless overridden)
              if (!instance.actualDueDate && instance.dueDate.getTime() === template.dueDate.getTime()) {
                correctPropagation++
              } else if (instance.actualDueDate) {
                correctPropagation++ // Override is valid
              }
            }
          }
          
          return { 
            passed: correctPropagation === totalChecked, 
            details: `${correctPropagation}/${totalChecked} instances have correct due dates` 
          }
        }
      },
      {
        name: 'Task status transitions are valid',
        test: async () => {
          const instances = await prisma.supplierTaskInstance.findMany()
          const validStatuses = ['not_started', 'in_progress', 'completed', 'blocked', 'cancelled']
          const validInstances = instances.filter(i => validStatuses.includes(i.status))
          
          return { 
            passed: validInstances.length === instances.length, 
            details: `${validInstances.length}/${instances.length} instances have valid status` 
          }
        }
      },
      {
        name: 'Manufacturing categories are correctly assigned',
        test: async () => {
          const taskTypes = await prisma.taskType.findMany()
          const validCategories = ['Part Approval', 'Production Readiness', 'New Model Builds', 'General', 'NMR']
          const validTaskTypes = taskTypes.filter(tt => validCategories.includes(tt.category))
          
          return { 
            passed: validTaskTypes.length === taskTypes.length, 
            details: `${validTaskTypes.length}/${taskTypes.length} task types have valid categories` 
          }
        }
      }
    ]

    for (const check of businessChecks) {
      try {
        const result = await check.test()
        checks.push({
          category: 'Business Logic',
          name: check.name,
          passed: result.passed,
          details: result.details,
          severity: result.passed ? 'info' : 'warning'
        })
        console.log(`${result.passed ? '✅' : '⚠️'} ${check.name}: ${result.details}`)
      } catch (error) {
        checks.push({
          category: 'Business Logic',
          name: check.name,
          passed: false,
          details: `Error: ${error}`,
          severity: 'critical'
        })
        console.log(`❌ ${check.name}: Error - ${error}`)
      }
    }

    // 5. Performance Validation
    console.log('\n5️⃣ Performance Validation')
    console.log('--------------------------')

    const performanceChecks = [
      {
        name: 'Dashboard query performance',
        test: async () => {
          const start = Date.now()
          await prisma.supplierTaskInstance.findMany({
            where: { status: { in: ['not_started', 'in_progress'] } },
            include: {
              supplierProjectInstance: {
                include: { supplier: true, project: true }
              },
              projectTaskTemplate: {
                include: { task: { include: { section: true, taskType: true } } }
              }
            },
            take: 50
          })
          const duration = Date.now() - start
          
          return { 
            passed: duration < 1000, 
            details: `Dashboard query took ${duration}ms` 
          }
        }
      },
      {
        name: 'Task hierarchy query performance',
        test: async () => {
          const start = Date.now()
          await prisma.taskType.findMany({
            include: {
              sections: {
                include: {
                  tasks: {
                    include: {
                      projectTaskTemplates: {
                        include: {
                          supplierTaskInstances: true
                        }
                      }
                    }
                  }
                }
              }
            }
          })
          const duration = Date.now() - start
          
          return { 
            passed: duration < 2000, 
            details: `Hierarchy query took ${duration}ms` 
          }
        }
      }
    ]

    for (const check of performanceChecks) {
      try {
        const result = await check.test()
        checks.push({
          category: 'Performance',
          name: check.name,
          passed: result.passed,
          details: result.details,
          severity: result.passed ? 'info' : 'warning'
        })
        console.log(`${result.passed ? '✅' : '⚠️'} ${check.name}: ${result.details}`)
      } catch (error) {
        checks.push({
          category: 'Performance',
          name: check.name,
          passed: false,
          details: `Error: ${error}`,
          severity: 'warning'
        })
        console.log(`❌ ${check.name}: Error - ${error}`)
      }
    }

    // 6. Generate Recommendations
    console.log('\n6️⃣ Generating Recommendations')
    console.log('-------------------------------')

    const failedCritical = checks.filter(c => !c.passed && c.severity === 'critical')
    const failedWarning = checks.filter(c => !c.passed && c.severity === 'warning')

    if (failedCritical.length > 0) {
      recommendations.push('🔴 CRITICAL ISSUES FOUND - System may not function correctly')
      failedCritical.forEach(check => {
        recommendations.push(`   • Fix ${check.category}: ${check.name}`)
      })
    }

    if (failedWarning.length > 0) {
      recommendations.push('🟡 Warning issues found - Review and address if needed')
      failedWarning.forEach(check => {
        recommendations.push(`   • Review ${check.category}: ${check.name}`)
      })
    }

    // Legacy cleanup recommendations
    const legacyMilestones = await prisma.milestone.count()
    const legacyProjectMilestoneTasks = await prisma.projectMilestoneTask.count()
    
    if (legacyMilestones > 0 || legacyProjectMilestoneTasks > 0) {
      recommendations.push('🧹 Legacy cleanup opportunity')
      recommendations.push(`   • Consider removing ${legacyMilestones} unused Milestone records`)
      recommendations.push(`   • Consider removing ${legacyProjectMilestoneTasks} unused ProjectMilestoneTask records`)
      recommendations.push('   • Update schema to remove legacy models after validation period')
    }

    // Summary
    const totalChecks = checks.length
    const passedChecks = checks.filter(c => c.passed).length
    const failedChecks = totalChecks - passedChecks
    const overallPassed = failedCritical.length === 0

    console.log('\n📊 Validation Summary')
    console.log('--------------------')
    console.log(`Total Checks: ${totalChecks}`)
    console.log(`Passed: ${passedChecks}`)
    console.log(`Failed: ${failedChecks}`)
    console.log(`Critical Failures: ${failedCritical.length}`)
    console.log(`Warning Failures: ${failedWarning.length}`)
    console.log(`Overall Status: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`)

    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      recommendations.forEach(rec => console.log(rec))
    } else {
      console.log('\n🎉 No recommendations - System validation passed completely!')
    }

    const result: ValidationResult = {
      timestamp,
      passed: overallPassed,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks
      },
      checks,
      recommendations
    }

    return result

  } catch (error) {
    console.error('💥 Validation failed:', error)
    throw error
  }
}

async function main() {
  try {
    const result = await validateV2System()
    
    console.log('\n📄 Validation Complete')
    console.log('======================')
    
    if (result.passed) {
      console.log('🎉 V2 System validation PASSED!')
      console.log('System is ready for production use.')
    } else {
      console.log('⚠️ V2 System validation found issues.')
      console.log('Review recommendations and fix critical issues before production.')
    }
    
    return result
  } catch (error) {
    console.error('💥 Validation error:', error)
    throw error
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ V2 system validation completed.')
    })
    .catch((e) => {
      console.error('💥 Validation error:', e)
      process.exit(1)
    })
}

export { validateV2System }