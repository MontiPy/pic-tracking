# QA_ENGINEER Testing Strategy & Validation Plan

## Overview
Comprehensive testing strategy for v2 migration ensuring data integrity, functional correctness, performance standards, and user experience quality throughout the transition from current implementation to new TaskType→TaskTypeSection→Task model.

## Current State Analysis
- **Current Testing**: Minimal automated testing
- **Test Environment**: Local development only
- **Critical Workflows**: Due date propagation, supplier task management, dashboard calculations
- **Risk Areas**: Data migration, API endpoint changes, UI interaction patterns

## Target State (V2 Design)
- **Comprehensive Test Coverage**: Unit, integration, E2E, migration validation
- **Automated Testing Pipeline**: Pre-migration validation, post-migration verification
- **Performance Baselines**: Dashboard load times, bulk operations, table rendering
- **User Experience Validation**: Keyboard navigation, inline editing, accessibility

## Testing Strategy Tasks

### 1. Migration Validation Testing

#### 1.1 Data Migration Integrity Tests
- [ ] **Create migration validation suite**
  ```typescript
  // tests/migration/data-integrity.test.ts
  describe('Data Migration Integrity', () => {
    beforeAll(async () => {
      // Run migration scripts on test database
    });
    
    test('All supplier task instances preserved', async () => {
      const preCount = await getPreMigrationCounts();
      const postCount = await getPostMigrationCounts();
      expect(postCount.supplierTaskInstances).toBe(preCount.supplierTaskInstances);
    });
    
    test('Due date logic maintained', async () => {
      // Test specific scenarios: overridden dates, propagated dates
      const testCases = await getTestDueDateScenarios();
      for (const testCase of testCases) {
        const result = await validateDueDateLogic(testCase);
        expect(result.isValid).toBe(true);
      }
    });
    
    test('Foreign key relationships intact', async () => {
      // Verify all FKs resolve correctly after migration
      const orphanedRecords = await findOrphanedRecords();
      expect(orphanedRecords).toHaveLength(0);
    });
    
    test('Status transitions preserved', async () => {
      // Ensure in_progress, completed, etc. statuses maintained
      const statusCounts = await getStatusDistribution();
      expect(statusCounts).toMatchSnapshot();
    });
  });
  ```

#### 1.2 Schema Validation Tests
- [ ] **Database schema validation**
  ```typescript
  // tests/migration/schema-validation.test.ts
  describe('Schema Migration Validation', () => {
    test('New models created correctly', async () => {
      const tables = await getTableNames();
      expect(tables).toContain('task_type_sections');
      expect(tables).toContain('project_task_templates');
    });
    
    test('Indexes created for performance', async () => {
      const indexes = await getIndexes();
      expect(indexes).toContain('idx_task_type_sections_sequence');
      expect(indexes).toContain('idx_supplier_task_instances_due_date');
    });
    
    test('Legacy models marked for deprecation', async () => {
      // Ensure old models still exist during transition
      const tables = await getTableNames();
      expect(tables).toContain('milestones'); // Should exist until cleanup
    });
  });
  ```

### 2. API Endpoint Testing

#### 2.1 New API Endpoints
- [ ] **Core CRUD operations testing**
  ```typescript
  // tests/api/task-types.test.ts
  describe('/api/task-types', () => {
    test('POST creates task type with sections', async () => {
      const response = await request(app)
        .post('/api/task-types')
        .send({ name: 'Test Task Type' })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Task Type');
    });
    
    test('POST /api/task-types/:id/sections creates section', async () => {
      const taskType = await createTestTaskType();
      const response = await request(app)
        .post(`/api/task-types/${taskType.id}/sections`)
        .send({ name: 'Test Section', sequence: 1 })
        .expect(201);
      
      expect(response.body.taskTypeId).toBe(taskType.id);
    });
  });
  ```

#### 2.2 Due Date Propagation Testing
- [ ] **Propagation logic validation**
  ```typescript
  // tests/api/due-date-propagation.test.ts
  describe('Due Date Propagation', () => {
    test('Template change updates non-overridden instances', async () => {
      // Setup: Create project with suppliers, some with overrides
      const { template, instances } = await setupDueDateTestScenario();
      
      // Action: Update template due date
      const newDueDate = '2025-09-22';
      await request(app)
        .put(`/api/project-templates/${template.id}`)
        .send({ dueDate: newDueDate })
        .expect(200);
      
      // Validation: Check propagation
      const updatedInstances = await getSupplierTaskInstances(instances.map(i => i.id));
      const nonOverridden = updatedInstances.filter(i => !i.actualDueDate);
      const overridden = updatedInstances.filter(i => i.actualDueDate);
      
      nonOverridden.forEach(instance => {
        expect(instance.dueDate).toBe(newDueDate);
      });
      
      overridden.forEach(instance => {
        expect(instance.dueDate).not.toBe(newDueDate); // Should preserve override
      });
    });
    
    test('Bulk shift operations work correctly', async () => {
      const response = await request(app)
        .post('/api/projects/test-proj/shift-dates')
        .send({ 
          days: 7, 
          scope: 'project',
          sectionId: 'test-section'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('updatedCount');
      expect(response.body.updatedCount).toBeGreaterThan(0);
    });
  });
  ```

#### 2.3 Supplier Assignment Testing
- [ ] **Assignment workflow validation**
  ```typescript
  // tests/api/supplier-assignment.test.ts  
  describe('Supplier Assignment', () => {
    test('Assignment creates all task instances', async () => {
      const { supplier, project } = await setupAssignmentTest();
      
      const response = await request(app)
        .post(`/api/suppliers/${supplier.id}/projects/${project.id}/assign`)
        .expect(200);
      
      expect(response.body.created).toBeGreaterThan(0);
      expect(response.body.skipped).toBe(0);
      
      // Verify instances created
      const instances = await getSupplierTaskInstances({ 
        supplierId: supplier.id, 
        projectId: project.id 
      });
      expect(instances.length).toBe(response.body.created);
    });
    
    test('Idempotent assignment (no duplicates)', async () => {
      // First assignment
      await assignSupplierToProject(supplier.id, project.id);
      
      // Second assignment should skip existing
      const response = await request(app)
        .post(`/api/suppliers/${supplier.id}/projects/${project.id}/assign`)
        .expect(200);
      
      expect(response.body.created).toBe(0);
      expect(response.body.skipped).toBeGreaterThan(0);
    });
  });
  ```

### 3. UI Component Testing

#### 3.1 Data Table Component Testing
- [ ] **TanStack Table functionality**
  ```typescript
  // tests/components/DataTable.test.tsx
  import { render, screen, fireEvent } from '@testing-library/react';
  import { DataTable } from '@/components/table/DataTable';
  
  describe('DataTable Component', () => {
    test('Renders supplier task data correctly', () => {
      const testData = createTestSupplierTaskData();
      render(<DataTable data={testData} columns={testColumns} />);
      
      expect(screen.getByText('ACME Plastics')).toBeInTheDocument();
      expect(screen.getByText('Submit PPAP Docs')).toBeInTheDocument();
    });
    
    test('Inline editing works for text fields', async () => {
      const testData = createTestSupplierTaskData();
      const onEdit = jest.fn();
      render(<DataTable data={testData} columns={testColumns} onEdit={onEdit} />);
      
      // Double-click to edit
      const notesCell = screen.getByText('Original notes');
      fireEvent.doubleClick(notesCell);
      
      // Should show input field
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Updated notes' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({
        notes: 'Updated notes'
      }));
    });
    
    test('Status dropdown works correctly', () => {
      // Test status cell component
      const testData = createTestSupplierTaskData();
      render(<DataTable data={testData} columns={testColumns} />);
      
      const statusCell = screen.getByText('not_started');
      fireEvent.click(statusCell);
      
      // Should show dropdown options
      expect(screen.getByText('in_progress')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });
  ```

#### 3.2 Board View Testing  
- [ ] **Drag and drop functionality**
  ```typescript
  // tests/components/BoardView.test.tsx
  describe('BoardView Component', () => {
    test('Renders status columns correctly', () => {
      const testData = createTestSupplierTaskData();
      render(<BoardView data={testData} />);
      
      expect(screen.getByText('Not Started')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
    
    test('Drag and drop updates status', async () => {
      // Test dnd-kit integration
      const onStatusChange = jest.fn();
      const testData = createTestSupplierTaskData();
      render(<BoardView data={testData} onStatusChange={onStatusChange} />);
      
      // Simulate drag and drop (mocked for unit tests)
      const taskCard = screen.getByTestId('task-card-1');
      // Drag simulation would need specialized testing utilities
      // Implementation depends on dnd-kit testing approach
    });
  });
  ```

### 4. Performance Testing

#### 4.1 Load Performance Baselines
- [ ] **Dashboard performance testing**
  ```typescript
  // tests/performance/dashboard.perf.test.ts
  describe('Dashboard Performance', () => {
    test('Dashboard loads within 2 seconds', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/dashboard')
        .expect(200);
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });
    
    test('Large dataset table renders performantly', async () => {
      // Create large dataset (1000+ rows)
      const largeDataset = createLargeSupplierTaskDataset(1000);
      
      const startTime = Date.now();
      render(<DataTable data={largeDataset} columns={testColumns} />);
      
      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(1000); // 1 second max
    });
  });
  ```

#### 4.2 Database Query Performance
- [ ] **Query performance validation**
  ```typescript
  // tests/performance/database.perf.test.ts
  describe('Database Query Performance', () => {
    test('Dashboard queries execute quickly', async () => {
      // Test key dashboard queries
      const queries = [
        'SELECT COUNT(*) FROM supplier_task_instances WHERE dueDate < NOW()',
        'SELECT COUNT(*) FROM supplier_task_instances WHERE status = "blocked"'
      ];
      
      for (const query of queries) {
        const startTime = Date.now();
        await executeQuery(query);
        const queryTime = Date.now() - startTime;
        expect(queryTime).toBeLessThan(100); // 100ms max
      }
    });
  });
  ```

### 5. Accessibility & UX Testing

#### 5.1 Keyboard Navigation Testing
- [ ] **Keyboard accessibility validation**
  ```typescript
  // tests/accessibility/keyboard-navigation.test.tsx
  describe('Keyboard Navigation', () => {
    test('Table navigation with arrow keys', () => {
      render(<DataTable data={testData} columns={testColumns} />);
      
      const firstCell = screen.getByRole('cell');
      firstCell.focus();
      
      // Test arrow key navigation
      fireEvent.keyDown(firstCell, { key: 'ArrowRight' });
      // Verify focus moved to next cell
    });
    
    test('Keyboard shortcuts work correctly', () => {
      render(<App />);
      
      // Test '/' for search
      fireEvent.keyDown(document, { key: '/' });
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
      
      // Test 'N' for new row
      fireEvent.keyDown(document, { key: 'n' });
      // Verify new row dialog or inline row creation
    });
  });
  ```

#### 5.2 WCAG 2.1 AA Compliance
- [ ] **Accessibility testing with axe**
  ```typescript
  // tests/accessibility/axe.test.tsx
  import { axe, toHaveNoViolations } from 'jest-axe';
  
  expect.extend(toHaveNoViolations);
  
  describe('Accessibility Compliance', () => {
    test('Dashboard page has no accessibility violations', async () => {
      const { container } = render(<DashboardPage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    test('Data table has proper ARIA labels', () => {
      render(<DataTable data={testData} columns={testColumns} />);
      
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label');
      
      const columnHeaders = screen.getAllByRole('columnheader');
      columnHeaders.forEach(header => {
        expect(header).toHaveAttribute('aria-sort');
      });
    });
  });
  ```

### 6. End-to-End Testing

#### 6.1 Critical User Workflows
- [ ] **Complete workflow testing with Playwright**
  ```typescript
  // tests/e2e/supplier-workflow.spec.ts
  import { test, expect } from '@playwright/test';
  
  test.describe('Supplier Task Management Workflow', () => {
    test('Complete supplier onboarding and task assignment', async ({ page }) => {
      // 1. Create supplier
      await page.goto('/suppliers');
      await page.click('text=New Supplier');
      await page.fill('[name="name"]', 'Test Supplier Corp');
      await page.click('button[type="submit"]');
      
      // 2. Create project
      await page.goto('/projects');
      await page.click('text=New Project');
      await page.fill('[name="name"]', 'Test Project');
      await page.click('button[type="submit"]');
      
      // 3. Assign supplier to project  
      await page.click('text=Assign Suppliers');
      await page.check('text=Test Supplier Corp');
      await page.click('text=Assign Selected');
      
      // 4. Verify task instances created
      await page.goto('/dashboard');
      await expect(page.locator('text=Test Supplier Corp')).toBeVisible();
    });
    
    test('Due date propagation works end-to-end', async ({ page }) => {
      // Setup test data
      await setupE2ETestData();
      
      // Navigate to project templates
      await page.goto('/projects/test-project/templates');
      
      // Edit due date
      await page.click('[data-testid="edit-due-date-submit-ppap"]');
      await page.fill('[data-testid="due-date-input"]', '2025-09-22');
      await page.press('[data-testid="due-date-input"]', 'Enter');
      
      // Verify propagation
      await page.goto('/dashboard');
      const supplierRow = page.locator('[data-supplier="acme-plastics"]');
      await expect(supplierRow.locator('text=2025-09-22')).toBeVisible();
    });
  });
  ```

### 7. Regression Testing

#### 7.1 Legacy Feature Validation
- [ ] **Ensure existing features continue working**
  ```typescript
  // tests/regression/legacy-features.test.ts
  describe('Legacy Feature Regression', () => {
    test('Existing supplier data displays correctly', async () => {
      // Test that migrated supplier data shows properly
      const response = await request(app).get('/api/suppliers');
      expect(response.body).toMatchSchema(supplierListSchema);
    });
    
    test('Historical task completion data preserved', async () => {
      // Verify completed tasks with timestamps are intact
      const completedTasks = await getCompletedTasks();
      expect(completedTasks).toHaveLength(expectedCompletedCount);
    });
  });
  ```

## Test Environment Setup

### 1. Test Database Configuration
- [ ] **Isolated test database**
  ```typescript
  // jest.setup.ts or vitest.setup.ts
  beforeAll(async () => {
    // Create test database
    await setupTestDatabase();
    // Run migrations
    await runMigrations();
    // Seed test data
    await seedTestData();
  });
  
  afterAll(async () => {
    // Cleanup
    await cleanupTestDatabase();
  });
  ```

### 2. Test Data Management
- [ ] **Consistent test data factories**
  ```typescript
  // tests/helpers/test-factories.ts
  export function createTestSupplier(overrides = {}) {
    return {
      id: 'test-supplier-1',
      name: 'ACME Test Corp',
      contact: 'test@acme.com',
      ...overrides
    };
  }
  
  export function createTestSupplierTaskInstance(overrides = {}) {
    return {
      id: 'test-instance-1',
      status: 'not_started',
      dueDate: '2025-09-15',
      ...overrides
    };
  }
  ```

## Testing Timeline & Phases

### Phase 1: Migration Validation (Critical)
1. Data migration integrity tests
2. Schema validation tests  
3. API endpoint basic functionality tests
**Target**: 100% data preservation validation

### Phase 2: Core Functionality (High Priority)
1. Due date propagation testing
2. Supplier assignment workflow testing
3. Critical UI component testing
**Target**: All major workflows validated

### Phase 3: Performance & UX (Medium Priority) 
1. Load performance testing
2. Accessibility compliance testing
3. Keyboard navigation validation
**Target**: Performance baselines met, WCAG AA compliance

### Phase 4: End-to-End & Regression (Pre-Release)
1. Complete user workflow testing
2. Legacy feature regression testing
3. Cross-browser compatibility testing
**Target**: Full system validation

## Success Criteria
- [ ] **Data Migration**: Zero data loss, 100% integrity validation
- [ ] **API Functionality**: All endpoints working with proper validation
- [ ] **UI Components**: Inline editing, keyboard navigation, accessibility compliant
- [ ] **Performance**: Dashboard <2s load time, table rendering <1s for 1000 rows
- [ ] **Accessibility**: WCAG 2.1 AA compliance
- [ ] **Regression**: All existing features continue working
- [ ] **E2E Workflows**: Complete user journeys validated

## Risk Mitigation
- **Risk**: Data corruption during migration testing
  - **Mitigation**: Isolated test database, comprehensive backup strategy
- **Risk**: Performance regression  
  - **Mitigation**: Baseline measurements, continuous performance monitoring
- **Risk**: Accessibility violations
  - **Mitigation**: Automated axe testing, manual keyboard testing
- **Risk**: Complex UI interaction failures
  - **Mitigation**: Comprehensive component testing, E2E validation

## Dependencies
- Requires DATABASE_ARCHITECT_schema_migration.md for migration scripts
- Must coordinate with PRODUCT_MANAGER_data_migration.md for test scenarios
- Links to FRONTEND_UI_redesign.md for component testing requirements
- Needs BACKEND_API_restructure.md endpoint specifications