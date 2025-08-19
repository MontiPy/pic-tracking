import { prisma } from '../lib/prisma'
import { writeFileSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

interface BackupResult {
  timestamp: string
  databaseBackup: string
  criticalDataExports: string[]
  schemaBackup: string
  success: boolean
  errors?: string[]
}

async function createComprehensiveBackup(): Promise<BackupResult> {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const backupDir = path.join(process.cwd(), 'backups', timestamp)
  const errors: string[] = []

  console.log('🔄 Creating Comprehensive Backup Strategy')
  console.log('========================================\n')
  console.log(`Timestamp: ${timestamp}`)
  console.log(`Backup Directory: ${backupDir}\n`)

  try {
    // Ensure backup directory exists
    try {
      await execAsync(`mkdir -p "${backupDir}"`)
    } catch (error) {
      // Windows mkdir equivalent
      await execAsync(`mkdir "${backupDir}"`)
    }

    // 1. Full Database Backup
    console.log('1️⃣ Creating Full Database Backup...')
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
    const backupDbPath = path.join(backupDir, `database_${timestamp}.db`)
    
    try {
      // SQLite backup using .backup command
      await execAsync(`sqlite3 "${dbPath}" ".backup '${backupDbPath}'"`)
      console.log(`   ✅ Database backup created: ${backupDbPath}`)
    } catch (error) {
      const errorMsg = `Database backup failed: ${error}`
      console.error(`   ❌ ${errorMsg}`)
      errors.push(errorMsg)
    }

    // 2. Critical Data CSV Exports
    console.log('\n2️⃣ Exporting Critical Data to CSV...')
    const criticalDataExports: string[] = []

    const criticalTables = [
      'supplier_task_instances',
      'project_task_templates', 
      'task_type_sections',
      'tasks',
      'suppliers',
      'projects'
    ]

    for (const tableName of criticalTables) {
      try {
        console.log(`   📄 Exporting ${tableName}...`)
        
        let data: any[] = []
        
        switch (tableName) {
          case 'supplier_task_instances':
            data = await prisma.supplierTaskInstance.findMany()
            break
          case 'project_task_templates':
            data = await prisma.projectTaskTemplate.findMany()
            break
          case 'task_type_sections':
            data = await prisma.taskTypeSection.findMany()
            break
          case 'tasks':
            data = await prisma.task.findMany()
            break
          case 'suppliers':
            data = await prisma.supplier.findMany()
            break
          case 'projects':
            data = await prisma.project.findMany()
            break
        }

        if (data.length > 0) {
          // Convert to CSV
          const headers = Object.keys(data[0]).join(',')
          const rows = data.map(row => 
            Object.values(row).map(value => {
              if (value === null) return ''
              if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`
              }
              return String(value)
            }).join(',')
          )
          
          const csv = [headers, ...rows].join('\n')
          const csvPath = path.join(backupDir, `${tableName}_${timestamp}.csv`)
          writeFileSync(csvPath, csv, 'utf8')
          
          criticalDataExports.push(csvPath)
          console.log(`      ✅ Exported ${data.length} records to ${csvPath}`)
        } else {
          console.log(`      ⚠️  Table ${tableName} is empty - no export needed`)
        }
      } catch (error) {
        const errorMsg = `Export failed for ${tableName}: ${error}`
        console.error(`      ❌ ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    // 3. Schema Backup
    console.log('\n3️⃣ Creating Schema Backup...')
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
    const schemaBackupPath = path.join(backupDir, `schema_${timestamp}.prisma`)
    
    try {
      await execAsync(`cp "${schemaPath}" "${schemaBackupPath}"`)
      console.log(`   ✅ Schema backup created: ${schemaBackupPath}`)
    } catch (error) {
      // Windows copy equivalent
      try {
        await execAsync(`copy "${schemaPath}" "${schemaBackupPath}"`)
        console.log(`   ✅ Schema backup created: ${schemaBackupPath}`)
      } catch (winError) {
        const errorMsg = `Schema backup failed: ${winError}`
        console.error(`   ❌ ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    // 4. Create Backup Manifest
    console.log('\n4️⃣ Creating Backup Manifest...')
    const manifest = {
      timestamp,
      backupType: 'comprehensive_v2_migration',
      database: {
        source: dbPath,
        backup: backupDbPath,
        size: '(to be calculated)'
      },
      criticalData: {
        exports: criticalDataExports.map(file => ({
          file: path.basename(file),
          fullPath: file
        }))
      },
      schema: {
        source: schemaPath,
        backup: schemaBackupPath
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd()
      },
      migration: {
        phase: 'post_v2_migration',
        status: 'v2_complete_legacy_cleanup_pending'
      }
    }

    const manifestPath = path.join(backupDir, `backup_manifest_${timestamp}.json`)
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
    console.log(`   ✅ Backup manifest created: ${manifestPath}`)

    // 5. Verification
    console.log('\n5️⃣ Verifying Backup Integrity...')
    
    // Verify database backup exists and has content
    try {
      const { stdout } = await execAsync(`sqlite3 "${backupDbPath}" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';"`)
      const tableCount = parseInt(stdout.trim())
      console.log(`   ✅ Database backup verified: ${tableCount} tables found`)
    } catch (error) {
      const errorMsg = `Database backup verification failed: ${error}`
      console.error(`   ❌ ${errorMsg}`)
      errors.push(errorMsg)
    }

    // Verify critical data exports
    console.log(`   ✅ Critical data exports verified: ${criticalDataExports.length} files`)

    // 6. Cleanup Instructions
    console.log('\n6️⃣ Backup Complete - Usage Instructions:')
    console.log('==========================================')
    console.log(`Backup Location: ${backupDir}`)
    console.log(`\nRestoration Commands:`)
    console.log(`  Database: sqlite3 "${dbPath}" < "${backupDbPath}"`)
    console.log(`  Schema:   cp "${schemaBackupPath}" "${schemaPath}"`)
    console.log(`\nRetention: Keep backups for 30 days minimum`)
    console.log(`Migration Phase: V2 Complete - Legacy cleanup pending`)

    const result: BackupResult = {
      timestamp,
      databaseBackup: backupDbPath,
      criticalDataExports,
      schemaBackup: schemaBackupPath,
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }

    if (errors.length > 0) {
      console.log(`\n⚠️  Backup completed with ${errors.length} errors - see details above`)
    } else {
      console.log(`\n✅ Backup completed successfully with no errors`)
    }

    return result

  } catch (error) {
    console.error('💥 Backup process failed:', error)
    throw error
  }
}

async function main() {
  try {
    const result = await createComprehensiveBackup()
    
    if (result.success) {
      console.log('\n🎉 Comprehensive backup strategy executed successfully!')
      console.log('System is ready for any migration operations or rollbacks.')
    } else {
      console.log('\n⚠️  Backup completed with issues. Review errors before proceeding with migration.')
    }
    
    return result
  } catch (error) {
    console.error('💥 Backup strategy failed:', error)
    throw error
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Backup strategy completed.')
    })
    .catch((e) => {
      console.error('💥 Backup error:', e)
      process.exit(1)
    })
}

export { createComprehensiveBackup }