# FRONTEND_UI Redesign Plan

## Overview
Complete UI overhaul from Tailwind CSS to CSS Modules + design tokens, replacing current forms/components with high-density, keyboard-first interface inspired by ClickUp/Monday.com/Jira.

## Current State Analysis
- **Current Stack**: Next.js 15, React 19, Tailwind CSS 4, React Hook Form
- **Components**: Basic forms (ProjectTemplateForm, TaskCustomizationForm, etc.)
- **Styling**: Tailwind utility-first approach
- **Interaction**: Traditional form-based workflow
- **Data Fetching**: Basic fetch calls, some React Query

## Target State (V2 Design)
- **New Stack**: React + TanStack Table & Query, dnd-kit, date-fns, Zustand
- **Styling**: CSS Modules + design tokens (CSS variables)
- **Interaction**: Inline editing everywhere, keyboard-first
- **Views**: Table (default), Board, Timeline
- **UX**: High-density, low-chrome, spreadsheet-like experience

## UI Redesign Tasks

### 1. Design System Foundation

#### 1.1 Design Tokens & CSS Variables
- [ ] **Create design tokens system**
  ```css
  /* src/styles/tokens.css */
  :root {
    /* Colors */
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #f8fafc; 
    --color-bg-tertiary: #f1f5f9;
    --color-border-default: #e2e8f0;
    --color-border-strong: #cbd5e1;
    --color-text-primary: #0f172a;
    --color-text-secondary: #475569;
    --color-text-tertiary: #64748b;
    
    /* Status colors */
    --color-status-not-started: #64748b;
    --color-status-in-progress: #3b82f6;
    --color-status-submitted: #f59e0b;
    --color-status-approved: #10b981;
    --color-status-blocked: #ef4444;
    
    /* Spacing */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    
    /* Typography */
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    
    /* Layout */
    --sidebar-width: 240px;
    --header-height: 56px;
    --row-height: 32px;
  }
  ```

- [ ] **Create utility classes**
  ```css
  /* src/styles/utilities.css */
  .stack { display: flex; flex-direction: column; }
  .cluster { display: flex; flex-wrap: wrap; gap: var(--space-sm); }
  .grid { display: grid; }
  .sr-only { position: absolute; width: 1px; height: 1px; /* ... */ }
  ```

#### 1.2 Global Reset & Base Styles
- [ ] **Create global reset**
  ```css
  /* src/styles/reset.css */
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, sans-serif; }
  /* ... comprehensive reset */
  ```

### 2. Core Layout Components

#### 2.1 Application Shell
- [ ] **Update Layout.tsx** (remove Tailwind classes)
  ```typescript
  // components/layout/Layout.module.css
  .layout {
    display: grid;
    grid-template-areas: "sidebar header" "sidebar main";
    grid-template-columns: var(--sidebar-width) 1fr;
    grid-template-rows: var(--header-height) 1fr;
    height: 100vh;
  }
  
  .header { grid-area: header; /* styles */ }
  .sidebar { grid-area: sidebar; /* styles */ }
  .main { grid-area: main; /* styles */ }
  ```

#### 2.2 Navigation Components
- [ ] **Update Navbar.tsx** with CSS modules
- [ ] **Create sidebar navigation** for sections/views
- [ ] **Add command palette trigger** (Cmd/Ctrl+K)

### 3. Data Table (Primary View)

#### 3.1 TanStack Table Integration
- [ ] **Install dependencies**
  ```json
  {
    "@tanstack/react-table": "^8.x",
    "@tanstack/react-query": "^5.x" // already installed
  }
  ```

- [ ] **Create DataTable component**
  ```typescript
  // components/table/DataTable.tsx
  import { useReactTable, getCoreRowModel } from '@tanstack/react-table'
  
  export function DataTable<T>({ data, columns, onEdit }) {
    // Table configuration with inline editing
    // Column show/hide functionality  
    // Saved views support
  }
  ```

- [ ] **Define column structure**
  ```typescript
  // Supplier • Task • Section • Milestone • Effective Due • Status • Owner • Notes • 📎
  const columns = [
    { id: 'supplier', header: 'Supplier', accessorKey: 'supplierName' },
    { id: 'task', header: 'Task', accessorKey: 'taskName' },
    { id: 'section', header: 'Section', accessorKey: 'sectionName' },
    { id: 'effectiveDue', header: 'Effective Due', accessorKey: 'effectiveDueDate' },
    { id: 'status', header: 'Status', cell: StatusCell },
    { id: 'owner', header: 'Owner', cell: EditableTextCell },
    { id: 'notes', header: 'Notes', cell: EditableTextCell },
    { id: 'attachments', header: '📎', cell: AttachmentCell }
  ];
  ```

#### 3.2 Inline Editing Cells
- [ ] **Create EditableTextCell component**
  ```typescript
  // components/table/cells/EditableTextCell.tsx
  // Double-click or 'E' to edit, Esc to cancel, Enter to save
  ```

- [ ] **Create StatusCell component** 
  ```typescript
  // components/table/cells/StatusCell.tsx
  // Dropdown with status options, color-coded
  ```

- [ ] **Create DateCell component**
  ```typescript
  // components/table/cells/DateCell.tsx
  // Date picker for due date editing
  ```

### 4. Board View (Kanban)

#### 4.1 dnd-kit Integration
- [ ] **Install dnd-kit**
  ```json
  {
    "@dnd-kit/core": "^6.x",
    "@dnd-kit/sortable": "^8.x",
    "@dnd-kit/utilities": "^3.x"
  }
  ```

- [ ] **Create BoardView component**
  ```typescript
  // components/board/BoardView.tsx
  // Status columns: Not Started | In Progress | Submitted | Approved | Blocked
  // Drag cards between columns to update status
  ```

- [ ] **Create TaskCard component**
  ```typescript
  // components/board/TaskCard.tsx
  // Compact card showing task, supplier, due date
  ```

### 5. Timeline View (Light Gantt)

#### 5.1 Timeline Component
- [ ] **Create TimelineView component**
  ```typescript
  // components/timeline/TimelineView.tsx
  // Rows by Supplier or Section
  // Bars at Effective Due dates
  // Today line indicator
  ```

- [ ] **Date calculations with date-fns**
  ```json
  { "date-fns": "^3.x" }
  ```

### 6. Settings & Task Type Management

#### 6.1 Task Type Settings
- [ ] **Create TaskTypeSettings component**
  ```typescript
  // components/settings/TaskTypeSettings.tsx
  // Manage Task Types, Sections, Tasks/Sub-tasks
  // Drag to reorder, parent/child nesting
  // Preview of resulting Project structure
  ```

- [ ] **Create drag-and-drop hierarchy**
  - Task Types (top level)
  - Sections (under Task Types)  
  - Tasks (under Sections)
  - Sub-tasks (under Tasks, 1-level max)

### 7. Interaction & UX Features

#### 7.1 Keyboard Navigation
- [ ] **Implement keyboard shortcuts**
  ```typescript
  // hooks/useKeyboardShortcuts.ts
  // '/' - search
  // 'N' - new row  
  // 'Cmd/Ctrl+K' - command palette
  // Arrow keys - navigation
  // Enter - save editing
  // Esc - cancel editing
  ```

#### 7.2 Quick Filters
- [ ] **Create FilterChips component**
  ```typescript
  // components/filters/FilterChips.tsx
  // Project, Supplier, Section, Task Type, Status, Overdue chips
  ```

#### 7.3 Saved Views
- [ ] **Create SavedViews component**
  ```typescript
  // components/views/SavedViews.tsx
  // Save/load table configurations
  // Example views: "Due Next 7 Days", "PPAP Only", "Overdue Tasks"
  ```

#### 7.4 Bulk Operations
- [ ] **Create BulkActions component**
  ```typescript
  // components/bulk/BulkActions.tsx
  // Select multiple rows, shift dates ±N days
  // Scope switcher: "This Project" | "All Projects Using This Task Type"
  ```

### 8. State Management (Zustand)

#### 8.1 Application State
- [ ] **Create Zustand stores**
  ```typescript
  // stores/useAppStore.ts
  interface AppState {
    currentView: 'table' | 'board' | 'timeline';
    selectedRows: string[];
    filters: FilterState;
    savedViews: SavedView[];
  }
  
  // stores/useTableStore.ts
  interface TableState {
    columnVisibility: Record<string, boolean>;
    columnOrder: string[];
    sorting: SortingState;
  }
  ```

### 9. Form Replacements

#### 9.1 Modal Forms → Inline Editing
- [ ] **Replace ProjectTemplateForm**
  - Convert to inline table editing
  - Quick add row functionality

- [ ] **Replace TaskCustomizationForm**  
  - Convert to drag-and-drop settings interface

- [ ] **Replace other form components**
  - Supplier forms → inline editing
  - Task instance forms → inline editing

### 10. Performance & Optimization

#### 10.1 React Query Integration
- [ ] **Optimize data fetching**
  ```typescript
  // hooks/useSupplierTaskInstances.ts
  // Proper caching, invalidation, optimistic updates
  ```

#### 10.2 Virtual Scrolling (if needed)
- [ ] **Large dataset handling**
  ```typescript
  // If >1000 rows, implement virtual scrolling
  // @tanstack/react-virtual
  ```

## Migration Strategy

### Phase 1: Design System (Non-Breaking)
1. Create design tokens and CSS modules
2. Build utility classes
3. Set up global styles

### Phase 2: Core Components (Replace Gradually)
1. Layout and navigation
2. DataTable component  
3. Basic inline editing

### Phase 3: Advanced Features
1. Board and Timeline views
2. Keyboard shortcuts
3. Bulk operations
4. Saved views

### Phase 4: Polish & Optimization
1. Performance optimization
2. Accessibility improvements
3. Final UX polish

## Success Criteria
- [ ] Complete removal of Tailwind CSS classes
- [ ] Functional CSS Modules + design tokens system
- [ ] TanStack Table with inline editing working
- [ ] Board view with drag-and-drop status updates
- [ ] Timeline view showing project schedules
- [ ] Keyboard shortcuts fully implemented
- [ ] Bulk operations with scope control
- [ ] Saved views functionality
- [ ] Sub-task hierarchy support (1-level)
- [ ] Performance optimized for single-user load

## Dependencies
- Requires BACKEND_API_restructure.md new endpoints
- Must coordinate with DATABASE_ARCHITECT_schema_migration.md data structure
- Package.json updates for new dependencies

## Risks & Mitigation
- **Risk**: Major UX disruption during transition
  - **Mitigation**: Incremental migration, feature flags
- **Risk**: Performance issues with large datasets
  - **Mitigation**: Virtual scrolling, proper React Query caching
- **Risk**: Keyboard accessibility regression
  - **Mitigation**: Comprehensive keyboard navigation testing