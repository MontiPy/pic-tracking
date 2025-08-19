# BACKEND_API Restructure Plan

## Overview
Complete API restructure to support new v2 TaskType→TaskTypeSection→Task→ProjectTaskTemplate→SupplierTaskInstance model with simplified, single-user focused endpoints.

## Current State Analysis
- **Current API**: Mixed legacy (TaskTemplate/TaskInstance) and new (Milestone-based) endpoints
- **Framework**: Next.js 15 App Router with TypeScript
- **Auth**: None (single-user)
- **Validation**: Basic, needs Zod schemas
- **Caching**: Minimal

## Target State (V2 Design)
- **New API Surface**: Simplified, focused on single-user workflows
- **Optimistic Locking**: updatedAt-based concurrency control
- **Due Date Propagation**: Smart propagation with override handling
- **Bulk Operations**: Shift dates, apply changes across scopes

## API Restructure Tasks

### 1. Core Entity Endpoints

#### 1.1 Suppliers API
- [ ] **Clean up existing `/api/suppliers`**
  - Remove multi-tenant complexity
  - Simplify to basic CRUD: `{ name, contact?, code? }`
  - Add validation with Zod schemas

- [ ] **Routes to maintain:**
  ```typescript
  POST /api/suppliers
  GET /api/suppliers
  GET /api/suppliers/:id  
  PUT /api/suppliers/:id
  DELETE /api/suppliers/:id // if needed
  ```

#### 1.2 Task Types & Structure (Settings)
- [ ] **NEW: `/api/task-types`** (replace existing)
  ```typescript
  POST /api/task-types { name }
  GET /api/task-types
  PUT /api/task-types/:id { name }
  DELETE /api/task-types/:id
  ```

- [ ] **NEW: `/api/task-types/:id/sections`**
  ```typescript  
  POST /api/task-types/:id/sections { name, sequence }
  PUT /api/task-types/:taskTypeId/sections/:id { name, sequence }
  DELETE /api/task-types/:taskTypeId/sections/:id
  ```

- [ ] **NEW: `/api/tasks`** (replace existing)
  ```typescript
  POST /api/tasks { 
    taskTypeId, 
    sectionId?, 
    parentTaskId?, // for sub-tasks
    name, 
    sequence, 
    defaultOwner?, 
    defaultNotes? 
  }
  PUT /api/tasks/:id // same fields
  DELETE /api/tasks/:id
  ```

#### 1.3 Projects API  
- [ ] **Clean up existing `/api/projects`**
  ```typescript
  POST /api/projects { name, description? }
  GET /api/projects
  PUT /api/projects/:id { name, description? }
  ```

- [ ] **NEW: `/api/projects/:id/task-types`**
  ```typescript
  POST /api/projects/:id/task-types { taskTypeId }
  // → materializes ProjectTaskTemplate rows for every Task/Sub-task
  DELETE /api/projects/:projectId/task-types/:taskTypeId
  ```

### 2. Template Management (Core Workflow)

#### 2.1 Project Task Templates
- [ ] **NEW: `/api/project-templates`** (replaces project-milestone-tasks)
  ```typescript
  GET /api/project-templates?projectId=:id
  PUT /api/project-templates/:id { 
    dueDate, 
    owner?, 
    notes?, 
    prevUpdatedAt // optimistic lock
  }
  // → Propagates to SupplierTaskInstance where actualDueDate IS NULL
  ```

- [ ] **NEW: Bulk operations `/api/projects/:id/shift-dates`**
  ```typescript
  POST /api/projects/:id/shift-dates {
    taskTypeId?, 
    sectionId?, 
    days: +N|-N,
    scope: "project" | "all-projects-using-type"
  }
  // → Bulk shift with propagation scope control
  ```

### 3. Supplier-Project Assignment

#### 3.1 Assignment API
- [ ] **NEW: `/api/suppliers/:supplierId/projects/:projectId/assign`**
  ```typescript
  POST /api/suppliers/:supplierId/projects/:projectId/assign
  // → Creates SupplierTaskInstance rows (idempotent)
  // Response: { created: N, skipped: N }
  ```

- [ ] **Cleanup old assignment endpoints**
  - Remove `/api/projects/:id/assign-supplier`
  - Consolidate logic into new endpoint

### 4. Supplier Task Instance Management

#### 4.1 Instance CRUD
- [ ] **Update `/api/supplier-task-instances/:id`**
  ```typescript
  PUT /api/supplier-task-instances/:id {
    status?: TaskStatus,
    actualDueDate?: DateTime | null, // override control
    owner?: string,
    notes?: string,
    isApplied?: boolean,
    blockedReason?: string,
    submissionFiles?: Json
  }
  ```

- [ ] **NEW: Bulk instance operations**
  ```typescript
  POST /api/supplier-task-instances/bulk-update {
    instanceIds: string[],
    updates: Partial<SupplierTaskInstance>
  }
  ```

### 5. Dashboard & Reporting

#### 5.1 Dashboard API
- [ ] **Update `/api/dashboard`** (replace milestone-based queries)
  ```typescript
  GET /api/dashboard
  // Response:
  {
    overdue: number,
    dueNext7Days: number, 
    blocked: number,
    bySupplier: { [supplierId]: { overdue, due, blocked } },
    bySection: { [sectionId]: { overdue, due, blocked } }
  }
  ```

- [ ] **Performance optimization**
  - Use database views/materialized queries
  - Cache with Next.js revalidation tags

### 6. Validation & Error Handling

#### 6.1 Zod Schemas
- [ ] **Create comprehensive validation schemas**
  ```typescript
  // lib/validation.ts
  export const supplierSchema = z.object({
    name: z.string().min(1),
    contact: z.string().optional(),
    code: z.string().optional()
  });

  export const taskSchema = z.object({
    taskTypeId: z.string().cuid(),
    sectionId: z.string().cuid().optional(),
    parentTaskId: z.string().cuid().optional(),
    name: z.string().min(1),
    sequence: z.number().int().min(0),
    defaultOwner: z.string().optional(),
    defaultNotes: z.string().optional()
  });

  export const supplierTaskInstanceUpdateSchema = z.object({
    status: z.enum(['not_started', 'in_progress', 'submitted', 'approved', 'blocked']).optional(),
    actualDueDate: z.string().datetime().nullable().optional(),
    owner: z.string().optional(),
    notes: z.string().optional(),
    isApplied: z.boolean().optional(),
    blockedReason: z.string().optional()
  });
  ```

#### 6.2 Error Responses
- [ ] **Standardize error format**
  ```typescript
  // Consistent problem responses
  {
    error: string,
    message: string,
    code?: string,
    field?: string // for validation errors
  }
  ```

### 7. Due Date Propagation Logic

#### 7.1 Core Propagation Function
- [ ] **Create propagation utility**
  ```typescript
  // lib/due-date-propagation.ts
  export async function propagateTemplateDateChange(
    templateId: string,
    newDueDate: Date,
    scope: 'project' | 'all-projects-using-type'
  ) {
    // Update instances where actualDueDate IS NULL
    // Return { updatedCount: number }
  }
  ```

#### 7.2 Optimistic Locking
- [ ] **Implement updatedAt-based locking**
  ```typescript
  // Check prevUpdatedAt against current updatedAt
  // Prevent concurrent modifications
  ```

### 8. Cleanup Legacy Endpoints

#### 8.1 Routes to Remove
- [ ] **Mark for deprecation/removal:**
  - `/api/milestones/*` (replaced by sections)
  - Old task template routes
  - Complex multi-step assignment flows

#### 8.2 Migration Support
- [ ] **Temporary compatibility layer**
  - Support both old and new endpoints during transition
  - Feature flag to switch between implementations

## Implementation Priority

### Phase 1: Foundation (High Priority)
1. Task Types & Sections API
2. Updated Tasks API with sub-task support
3. Project-TaskType association API
4. Basic validation with Zod

### Phase 2: Core Workflow (High Priority)  
1. Project Task Template management
2. Supplier assignment workflow
3. Supplier Task Instance CRUD
4. Due date propagation logic

### Phase 3: Optimization (Medium Priority)
1. Dashboard API optimization
2. Bulk operations
3. Performance improvements
4. Error handling standardization

### Phase 4: Cleanup (Low Priority)
1. Remove legacy endpoints
2. Final API consolidation
3. Documentation updates

## Success Criteria
- [ ] All new endpoints functioning with proper validation
- [ ] Due date propagation working with override logic
- [ ] Bulk operations supporting multi-scope changes
- [ ] Dashboard performance optimized for single-user load
- [ ] Zero breaking changes during transition period
- [ ] Comprehensive error handling and validation
- [ ] Sub-task support (1-level nesting) implemented

## Dependencies
- Requires DATABASE_ARCHITECT_schema_migration.md schema changes
- Must coordinate with FRONTEND_UI_redesign.md for API consumption
- Needs PRODUCT_MANAGER_data_migration.md for data consistency

## Testing Strategy
- Unit tests for all new endpoints
- Integration tests for propagation logic
- Performance tests for dashboard queries
- Migration tests for legacy compatibility

## Risks & Mitigation
- **Risk**: Breaking existing functionality during transition
  - **Mitigation**: Feature flags, backward compatibility layer
- **Risk**: Performance issues with propagation at scale
  - **Mitigation**: Database indexing, query optimization
- **Risk**: Data inconsistency during migration
  - **Mitigation**: Atomic operations, transaction management