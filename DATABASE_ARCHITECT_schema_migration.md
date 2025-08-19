# DATABASE_ARCHITECT Schema Migration Plan

## Overview
Complete migration from current dual-model architecture to new v2 design with TaskType→TaskTypeSection→Task→ProjectTaskTemplate→SupplierTaskInstance flow.

## Current State Analysis
- **Current Models**: TaskType→Milestone→Task→ProjectMilestoneTask→SupplierTaskInstance
- **Legacy Models**: TaskTemplate/TaskInstance (marked for removal)
- **Database**: SQLite with Prisma ORM
- **Issues**: Intermediate Milestone entity needs to be replaced with TaskTypeSection

## Target State (V2 Design)
- **New Flow**: TaskType→TaskTypeSection→Task→ProjectTaskTemplate→SupplierTaskInstance  
- **Key Changes**: Replace Milestone with TaskTypeSection, simplify ProjectTaskTemplate structure
- **Sub-task Support**: 1-level nesting with parentTaskId

## Schema Migration Tasks

### 1. Create New Models
- [ ] **TaskTypeSection Model**
  ```prisma
  model TaskTypeSection {
    id         String  @id @default(cuid())
    taskTypeId String
    name       String
    sequence   Int
    
    taskType   TaskType @relation(fields: [taskTypeId], references: [id])
    tasks      Task[]
    
    @@unique([taskTypeId, name])
    @@index([taskTypeId, sequence])
    @@map("task_type_sections")
  }
  ```

- [ ] **Updated Task Model** (add sectionId, parentTaskId for sub-tasks)
  ```prisma
  model Task {
    id             String  @id @default(cuid())
    taskTypeId     String
    sectionId      String?
    parentTaskId   String?  // for sub-tasks (1 level)
    name           String
    description    String?
    sequence       Int
    defaultOwner   String?
    defaultNotes   String?
    
    taskType       TaskType @relation(fields: [taskTypeId], references: [id])
    section        TaskTypeSection? @relation(fields: [sectionId], references: [id])
    parent         Task? @relation("SubTasks", fields: [parentTaskId], references: [id])
    subTasks       Task[] @relation("SubTasks")
    
    @@unique([taskTypeId, name, parentTaskId])
    @@index([taskTypeId, sectionId])
    @@map("tasks")
  }
  ```

- [ ] **ProjectTaskType Model** (many-to-many between projects and task types)
  ```prisma
  model ProjectTaskType {
    id         String @id @default(cuid())
    projectId  String
    taskTypeId String
    isActive   Boolean @default(true)
    
    project    Project  @relation(fields: [projectId], references: [id])
    taskType   TaskType @relation(fields: [taskTypeId], references: [id])
    
    @@unique([projectId, taskTypeId])
    @@map("project_task_types")
  }
  ```

- [ ] **Simplified ProjectTaskTemplate Model**
  ```prisma
  model ProjectTaskTemplate {
    id         String  @id @default(cuid())
    projectId  String
    taskId     String
    sectionId  String?  // convenience copy for grouping
    dueDate    DateTime // canonical per project
    owner      String?
    notes      String?
    
    // Optional relative scheduling
    anchor     AnchorType @default(PROJECT_START)
    offsetDays Int?
    
    project    Project @relation(fields: [projectId], references: [id])
    task       Task    @relation(fields: [taskId], references: [id])
    
    @@unique([projectId, taskId])
    @@index([projectId, sectionId])
    @@map("project_task_templates")
  }
  ```

- [ ] **Add AnchorType Enum**
  ```prisma
  enum AnchorType {
    PROJECT_START
    MILESTONE_DATE
    RELATIVE_TO_TASK
  }
  ```

### 2. Update Existing Models

- [ ] **Update TaskType Model** (remove old milestone relationship)
  ```prisma
  model TaskType {
    id          String  @id @default(cuid())
    name        String  @unique
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
    
    // New relationships
    sections    TaskTypeSection[]
    tasks       Task[]
    projectTaskTypes ProjectTaskType[]
    
    @@index([name])
    @@map("task_types")
  }
  ```

- [ ] **Update SupplierTaskInstance Model** (change foreign key references)
  ```prisma
  model SupplierTaskInstance {
    id                        String   @id @default(cuid())
    supplierProjectInstanceId String
    projectTaskTemplateId     String
    status        TaskStatus  @default(not_started)
    dueDate       DateTime    // inherited copy
    actualDueDate DateTime?   // override
    owner         String?
    notes         String?
    isApplied     Boolean     @default(true)
    blockedReason String?
    submissionFiles Json?
    
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    
    supplierProjectInstance SupplierProjectInstance @relation(fields: [supplierProjectInstanceId], references: [id])
    projectTaskTemplate     ProjectTaskTemplate @relation(fields: [projectTaskTemplateId], references: [id])
    
    @@index([supplierProjectInstanceId, status])
    @@index([supplierProjectInstanceId, dueDate])
    @@map("supplier_task_instances")
  }
  ```

### 3. Remove Deprecated Models
- [ ] **Mark for removal** (keep during transition)
  - Milestone model
  - ProjectMilestoneTask model  
  - Legacy TaskTemplate/TaskInstance models

### 4. Add Required Indexes
- [ ] **Performance indexes**
  ```prisma
  // TaskTypeSection
  @@index([taskTypeId, sequence])
  
  // Task  
  @@index([taskTypeId, sectionId])
  @@index([parentTaskId]) // for sub-task queries
  
  // ProjectTaskTemplate
  @@index([projectId, sectionId])
  @@index([projectId, dueDate])
  
  // SupplierTaskInstance
  @@index([supplierProjectInstanceId, status])
  @@index([supplierProjectInstanceId, dueDate])
  @@index([actualDueDate]) // for override tracking
  ```

## Migration Strategy

### Phase 1: Add New Models (Non-Breaking)
1. Add new models to schema.prisma
2. Run `prisma db push` to create tables
3. Keep existing models intact

### Phase 2: Data Migration Scripts
1. Create migration scripts to populate new models from existing data:
   - Migrate Milestone → TaskTypeSection
   - Migrate ProjectMilestoneTask → ProjectTaskTemplate
   - Update SupplierTaskInstance foreign keys

### Phase 3: Application Updates
1. Update API routes to use new models
2. Update components to use new data structure
3. Test all CRUD operations

### Phase 4: Cleanup (Breaking)
1. Remove deprecated models
2. Remove unused indexes
3. Final schema optimization

## Success Criteria
- [ ] All new models created with proper relationships
- [ ] Existing data successfully migrated to new structure
- [ ] Sub-task support (1-level nesting) working
- [ ] Due date propagation logic maintained
- [ ] Performance indexes optimize key queries
- [ ] Zero data loss during migration

## Dependencies
- Must coordinate with BACKEND_API_restructure.md for API changes
- Must coordinate with PRODUCT_MANAGER_data_migration.md for migration scripts
- Database backup required before Phase 4

## Risks & Mitigation
- **Risk**: Data loss during migration
  - **Mitigation**: Full database backup, incremental migration with validation
- **Risk**: Performance degradation  
  - **Mitigation**: Comprehensive indexing strategy, query analysis
- **Risk**: Breaking existing functionality
  - **Mitigation**: Phase migration approach, extensive testing