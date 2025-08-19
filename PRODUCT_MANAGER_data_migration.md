# PRODUCT_MANAGER Data Migration Strategy

## Overview
Comprehensive data migration strategy to transition from current dual-model architecture to v2 design while maintaining zero data loss, ensuring business continuity, and providing rollback capabilities.

## Current State Analysis
- **Active Models**: TaskType→Milestone→Task→ProjectMilestoneTask→SupplierTaskInstance
- **Legacy Models**: TaskTemplate/TaskInstance (backward compatibility)
- **Data Volume**: Unknown (need assessment)
- **Business Impact**: High - supplier workflows depend on existing data
- **Downtime Tolerance**: Minimal (single-user system allows brief maintenance windows)

## Target State (V2 Design)
- **New Models**: TaskType→TaskTypeSection→Task→ProjectTaskTemplate→SupplierTaskInstance
- **Eliminated Models**: Milestone, ProjectMilestoneTask
- **Enhanced Models**: Task (with sub-task support), updated foreign keys

## Migration Strategy & Risk Assessment

### Business Impact Analysis
- **Critical Data**: Supplier task instances with status/due dates
- **Historical Data**: Completed tasks, notes, file attachments
- **Workflow Continuity**: Supplier progress tracking
- **Reporting**: Dashboard metrics, overdue calculations

### Migration Approach: Zero-Downtime Phased Migration

## Phase 1: Pre-Migration Assessment & Preparation

### 1.1 Data Assessment
- [ ] **Audit current data volumes**
  ```sql
  -- Get table row counts
  SELECT 'suppliers' as table_name, COUNT(*) as row_count FROM suppliers
  UNION ALL
  SELECT 'projects', COUNT(*) FROM projects  
  UNION ALL
  SELECT 'task_types', COUNT(*) FROM task_types
  UNION ALL
  SELECT 'milestones', COUNT(*) FROM milestones
  UNION ALL
  SELECT 'tasks', COUNT(*) FROM tasks
  UNION ALL
  SELECT 'project_milestone_tasks', COUNT(*) FROM project_milestone_tasks
  UNION ALL
  SELECT 'supplier_task_instances', COUNT(*) FROM supplier_task_instances;
  ```

- [ ] **Identify data quality issues**
  - Orphaned records
  - Missing required fields
  - Invalid status values
  - Date inconsistencies

- [ ] **Document current relationships**
  - Task Type → Milestone mappings
  - Section categorization patterns
  - Due date override patterns

### 1.2 Backup Strategy
- [ ] **Create full database backup**
  ```bash
  # SQLite backup
  sqlite3 database.db ".backup backup_pre_migration.db"
  ```

- [ ] **Export critical data to CSV**
  ```sql
  -- Export key tables for safety
  .headers on
  .mode csv
  .output supplier_task_instances_backup.csv
  SELECT * FROM supplier_task_instances;
  ```

- [ ] **Version control schema snapshots**
  ```bash
  # Backup current schema.prisma
  cp prisma/schema.prisma prisma/schema_v1_backup.prisma
  ```

## Phase 2: Schema Migration (Non-Breaking)

### 2.1 Add New Models
- [ ] **Deploy new models alongside existing**
  - TaskTypeSection
  - Updated Task (with parentTaskId, sectionId)
  - ProjectTaskType 
  - ProjectTaskTemplate
  - Keep existing models intact

- [ ] **Run Prisma migration**
  ```bash
  npx prisma db push
  ```

### 2.2 Create Migration Scripts
- [ ] **Create data transformation scripts**
  ```typescript
  // scripts/migrate-milestone-to-section.ts
  export async function migrateMilestonesToSections() {
    // Convert Milestone → TaskTypeSection
    // Preserve sequence, naming patterns
    // Handle edge cases (milestones without tasks)
  }
  ```

- [ ] **Create validation scripts**
  ```typescript
  // scripts/validate-migration.ts  
  export async function validateMigrationIntegrity() {
    // Compare row counts
    // Verify relationship integrity
    // Check data consistency
  }
  ```

## Phase 3: Data Migration Execution

### 3.1 Milestone → TaskTypeSection Migration
- [ ] **Strategy**: Direct mapping with pattern recognition
  ```typescript
  // Migration logic:
  // 1. Group milestones by taskType
  // 2. Create TaskTypeSection for each milestone
  // 3. Map common patterns:
  //    - "Part Approval" sections: PA2→"First Article", PA3→"Production Trial"  
  //    - "NMR" sections: NMR1→"Documentation", NMR2→"Testing"
  //    - Custom sections: preserve milestone names
  ```

- [ ] **Handle edge cases**
  - Milestones with no tasks (create placeholder sections)
  - Duplicate milestone names within task types
  - Custom milestone codes not following standard patterns

### 3.2 ProjectMilestoneTask → ProjectTaskTemplate Migration
- [ ] **Strategy**: Foreign key remapping with data preservation
  ```typescript
  // Migration logic:
  // 1. For each ProjectMilestoneTask:
  //    - Find corresponding Task via milestone
  //    - Map to new TaskTypeSection relationship
  //    - Preserve dueDate, notes, responsibleParties
  //    - Create ProjectTaskTemplate record
  ```

- [ ] **Preserve due date logic**
  - Maintain existing due dates exactly
  - Preserve override patterns in SupplierTaskInstance
  - Document any date calculation changes

### 3.3 SupplierTaskInstance Updates
- [ ] **Strategy**: Foreign key updates only
  ```typescript
  // Migration logic:
  // 1. Update projectTaskTemplateId references
  // 2. Preserve all other fields (status, dates, notes)
  // 3. Maintain actualDueDate overrides
  // 4. Keep isApplied flags
  ```

## Phase 4: Application Cutover

### 4.1 API Endpoint Migration
- [ ] **Deploy new endpoints with feature flag**
  ```typescript
  // Feature flag: USE_V2_API
  if (process.env.USE_V2_API === 'true') {
    // Use new TaskTypeSection-based endpoints
  } else {  
    // Use legacy Milestone-based endpoints
  }
  ```

- [ ] **Gradual endpoint migration**
  1. Dashboard (read-only, lowest risk)
  2. Task viewing (read operations)  
  3. Task updates (write operations)
  4. Task creation (highest impact)

### 4.2 UI Component Migration  
- [ ] **Component-by-component replacement**
  1. Dashboard components (TaskTypeSection grouping)
  2. Task list components
  3. Task editing forms
  4. Task creation workflows

## Phase 5: Validation & Testing

### 5.1 Data Integrity Validation
- [ ] **Automated validation suite**
  ```typescript
  // tests/migration-validation.test.ts
  describe('Migration Validation', () => {
    test('All supplier task instances preserved', () => {
      // Compare pre/post migration counts
      // Verify no data loss
    });
    
    test('Due date logic maintained', () => {
      // Test due date propagation
      // Verify override behavior
    });
    
    test('Relationships intact', () => {
      // Check foreign key integrity
      // Verify joins work correctly  
    });
  });
  ```

### 5.2 Business Logic Testing
- [ ] **Critical workflow testing**
  - Due date propagation with overrides
  - Status updates and transitions
  - Dashboard calculations (overdue, due next 7 days)
  - Supplier task assignment process

### 5.3 Performance Validation
- [ ] **Query performance comparison**
  ```typescript
  // Compare v1 vs v2 query performance
  // Dashboard load times
  // Large dataset handling
  // Index effectiveness
  ```

## Phase 6: Legacy Cleanup (Post-Validation)

### 6.1 Legacy Model Removal
- [ ] **Remove deprecated models** (after 30-day validation period)
  - Milestone model
  - ProjectMilestoneTask model
  - Legacy TaskTemplate/TaskInstance models

- [ ] **Schema cleanup**
  - Remove unused indexes
  - Clean up foreign key references
  - Optimize new model indexes

### 6.2 API Cleanup
- [ ] **Remove legacy endpoints**
- [ ] **Remove feature flags**
- [ ] **Update documentation**

## Rollback Strategy

### Emergency Rollback Plan
- [ ] **Immediate rollback capability** (within 24 hours)
  ```bash
  # Restore from backup
  cp backup_pre_migration.db database.db
  # Revert code to previous version
  git checkout v1-stable
  # Restart application
  ```

- [ ] **Partial rollback options**
  - API-level rollback (feature flag toggle)
  - Component-level rollback (React component switching)
  - Database-level rollback (restore specific tables)

## Success Criteria & Acceptance Tests

### Data Migration Success
- [ ] **Zero data loss validation**
  - All supplier task instances preserved
  - All historical data intact
  - All file attachments accessible

- [ ] **Functional equivalence**
  - Due date propagation works identically
  - Status transitions function correctly
  - Dashboard calculations match

- [ ] **Performance maintained/improved**
  - Dashboard load time ≤ v1 performance
  - Task list rendering ≤ v1 performance
  - Bulk operations performance acceptable

### Business Continuity
- [ ] **Workflow continuity**
  - Suppliers can continue task progress
  - Project managers can update due dates
  - Reporting functions correctly

- [ ] **User experience**
  - No training required for basic operations
  - Enhanced features provide clear value
  - Error handling graceful and informative

## Timeline & Milestones

### Week 1: Assessment & Preparation
- Data assessment and backup creation
- Migration script development
- Test environment setup

### Week 2: Schema Migration & Testing
- Deploy new models to test environment
- Run migration scripts and validation
- Performance testing and optimization

### Week 3: Application Migration
- API endpoint migration with feature flags
- Component migration and testing
- User acceptance testing

### Week 4: Production Deployment & Validation
- Production migration execution
- Post-migration validation
- Performance monitoring

### Week 5+: Legacy Cleanup (After Validation Period)
- Remove deprecated models and code
- Final optimization and documentation

## Risk Mitigation Matrix

| Risk | Probability | Impact | Mitigation |
|------|------------|---------|------------|
| Data Loss | Low | Critical | Full backup, validation scripts, rollback plan |
| Performance Degradation | Medium | High | Performance testing, index optimization |
| Business Disruption | Medium | High | Phased migration, feature flags |
| Migration Script Failure | Medium | Medium | Comprehensive testing, atomic operations |
| Foreign Key Conflicts | Low | Medium | Careful relationship mapping, validation |

## Communication Plan

### Stakeholder Updates
- [ ] **Pre-migration notification**: Schema and API changes coming
- [ ] **Migration window notification**: Brief maintenance period required  
- [ ] **Post-migration validation**: Confirm successful migration
- [ ] **Enhancement rollout**: New features available

### Documentation Updates
- [ ] **Technical documentation**: Updated API endpoints, schema changes
- [ ] **User documentation**: New features and workflow changes
- [ ] **Troubleshooting guide**: Common issues and solutions