# UI Redesign Implementation Guide

## Overview

This document describes the comprehensive UI redesign from Tailwind CSS to CSS Modules with design tokens, implementing TanStack Table for spreadsheet interfaces, Board view for Kanban-style task management, and Timeline view for Gantt-chart visualization.

## Architecture Changes

### 1. Design System Foundation

#### CSS Modules + Design Tokens
- **Location**: `app/globals.css`
- **Features**: 
  - Comprehensive design token system with CSS custom properties
  - Manufacturing-specific status and category colors
  - Dark mode support
  - Responsive design utilities
  - Animation and transition definitions

#### Component Architecture
- **Layout**: Grid-based application shell with collapsible sidebar
- **Views**: Unified view container supporting Table/Board/Timeline
- **State**: Zustand stores for application and table state management
- **Editing**: Inline editing system with validation and optimistic updates

### 2. Key Components

#### Layout System
```typescript
// New layout structure
<Layout noPadding>
  <ViewContainer data={tasks} ... />
</Layout>
```

**Components:**
- `Layout.tsx` - Main application shell
- `Navbar.tsx` - Header with search and actions
- `Sidebar.tsx` - Navigation and view controls

#### View Container
Unified component that switches between three view modes:

```typescript
<ViewContainer
  data={tasks}
  columns={tableColumns}
  onTaskMove={handleBoardMove}
  onTaskClick={handleClick}
  // Automatically renders Table/Board/Timeline based on app state
/>
```

#### TanStack Table (Spreadsheet View)
**Features:**
- Advanced sorting, filtering, and pagination
- Column resizing and visibility controls
- Inline cell editing with validation
- Bulk selection and operations
- Row-level optimistic updates
- Keyboard navigation support

**Usage:**
```typescript
const columns = [
  columnHelper.accessor('title', {
    cell: ({ getValue, row }) => (
      <EditableTextCell
        value={getValue()}
        onSave={async (value) => {
          await updateTask(row.original.id, { title: value })
        }}
      />
    ),
  }),
]
```

#### Board View (Kanban)
**Features:**
- Drag-and-drop between status columns
- Status-based task organization
- Priority indicators and due date highlighting
- Add tasks directly to specific columns
- Mobile-responsive design

**Status Columns:**
- Not Started
- In Progress  
- Submitted
- Approved
- Blocked

#### Timeline View (Gantt)
**Features:**
- Grouping by Supplier/Project/Category/Status
- Expandable/collapsible groups
- Today line indicator
- Multiple time scales (Days/Weeks/Months)
- Overdue task highlighting
- Due date positioning

### 3. Inline Editing System

#### Available Cell Types
- `EditableTextCell` - Single/multi-line text editing
- `StatusCell` - Dropdown status selection
- `DateCell` - Date picker with validation

#### Features
- Double-click or 'E' key to edit
- Enter to save, Escape to cancel
- Real-time validation with error messages
- Optimistic updates with rollback
- Keyboard navigation hints

#### Example Usage
```typescript
<EditableTextCell
  value={task.notes}
  onSave={async (value) => {
    await updateTaskNotes(task.id, value)
  }}
  multiline
  maxLength={500}
  placeholder="Add notes..."
/>
```

### 4. State Management

#### App Store (Zustand)
- Current view mode (table/board/timeline)
- View density settings
- Selected rows and bulk edit mode
- Filters and saved views
- UI state (sidebar, modals)

#### Table Store
- Column visibility and sizing
- Sorting and filtering state
- Pagination settings
- Inline editing state
- Pending changes and optimistic updates

### 5. Manufacturing-Specific Features

#### Status System
Matches manufacturing workflow:
- `not_started` - Gray
- `in_progress` - Blue  
- `submitted` - Yellow/Orange
- `approved` - Green
- `blocked` - Red
- `cancelled` - Gray

#### Category Colors
- Part Approval - Blue
- NMR - Purple
- New Model Builds - Cyan
- Production Readiness - Green
- General - Gray

#### Due Date Logic
- Today: Orange highlighting
- Overdue: Red highlighting with animation
- Upcoming: Standard styling

## Implementation Patterns

### 1. Creating a New Page

```typescript
// pages/NewPage.tsx
import Layout from '@/components/layout/Layout'
import ViewContainer from '@/components/views/ViewContainer'
import { createColumns } from './columns'

export default function NewPage() {
  const [data, setData] = useState([])
  const columns = createColumns()
  
  return (
    <Layout>
      <ViewContainer
        data={data}
        columns={columns}
        title="Page Title"
        onTaskMove={handleMove}
        onTaskClick={handleClick}
      />
    </Layout>
  )
}
```

### 2. Creating Table Columns

```typescript
// columns.tsx
import { createColumnHelper } from '@tanstack/react-table'
import EditableTextCell from '@/components/table/cells/EditableTextCell'

const columnHelper = createColumnHelper<TaskType>()

export const createColumns = () => [
  columnHelper.accessor('title', {
    header: 'Title',
    cell: ({ getValue, row }) => (
      <EditableTextCell
        value={getValue()}
        onSave={async (value) => {
          await api.updateTask(row.original.id, { title: value })
        }}
      />
    ),
  }),
  // More columns...
]
```

### 3. Adding Custom Cell Types

```typescript
// CustomCell.tsx
interface CustomCellProps {
  value: string
  onSave: (value: string) => Promise<void>
  // Other props...
}

export default function CustomCell({ value, onSave }: CustomCellProps) {
  // Implementation with inline editing pattern
  return <div>...</div>
}
```

## CSS Architecture

### Design Tokens
All design tokens are defined in `app/globals.css` using CSS custom properties:

```css
:root {
  --color-primary: #3b82f6;
  --space-md: 1rem;
  --border-radius-md: 0.375rem;
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Component Styling
Each component uses CSS Modules:

```typescript
// Component.tsx
import styles from './Component.module.css'

export function Component() {
  return <div className={styles.container}>...</div>
}
```

```css
/* Component.module.css */
.container {
  padding: var(--space-md);
  border-radius: var(--border-radius-md);
  background: var(--color-bg-primary);
}
```

### Utility Classes
Global utility classes are available:

```css
.stack { display: flex; flex-direction: column; }
.cluster { display: flex; flex-wrap: wrap; gap: var(--space-sm); }
.between { display: flex; justify-content: space-between; align-items: center; }
```

## Accessibility Features

### Keyboard Navigation
- Tab/Shift+Tab: Navigate between interactive elements
- Enter/Space: Activate buttons and edit cells
- Escape: Cancel editing operations
- Arrow keys: Navigate table cells and status options

### Screen Reader Support
- Proper ARIA labels and roles
- Live regions for status updates
- Semantic HTML structure
- Focus management during editing

### Visual Accessibility
- High contrast colors meeting WCAG AA standards
- Consistent focus indicators
- Clear visual hierarchy
- Support for reduced motion preferences

## Performance Optimizations

### Virtual Scrolling
- Large datasets handled efficiently
- Row virtualization with `@tanstack/react-virtual`
- Smooth scrolling performance

### State Optimization
- Memoized components and calculations
- Efficient re-rendering with proper dependencies
- Optimistic updates for perceived performance

### Bundle Optimization
- Tree-shaking friendly architecture
- Lazy loading of view components
- Minimal bundle size impact

## Migration Strategy

### Phase 1: Foundation (Completed)
- ✅ Design tokens and CSS architecture
- ✅ Layout components transformation
- ✅ State management setup

### Phase 2: Core Views (Completed)  
- ✅ TanStack Table implementation
- ✅ Board view with drag-and-drop
- ✅ Timeline view with grouping
- ✅ Inline editing system

### Phase 3: Integration (In Progress)
- 🔄 Page-by-page component replacement
- ⏳ API integration updates
- ⏳ Testing and refinement

### Phase 4: Enhancement
- ⏳ Advanced features (saved views, bulk operations)
- ⏳ Performance optimization
- ⏳ Accessibility audit and improvements

## Testing Strategy

### Component Testing
- Unit tests for all cell components
- Integration tests for view switching
- Accessibility testing with jest-axe

### User Experience Testing
- Keyboard navigation verification
- Screen reader compatibility
- Mobile responsiveness testing
- Performance benchmarking

## Troubleshooting

### Common Issues

1. **CSS Module styles not applying**
   - Verify CSS Module naming convention (`.module.css`)
   - Check import syntax: `import styles from './Component.module.css'`

2. **Design tokens not working**
   - Ensure tokens are defined in `app/globals.css`
   - Use `var()` function: `var(--color-primary)`

3. **Inline editing not triggering**
   - Check `onSave` handler is provided and returns Promise
   - Verify cell is not disabled
   - Ensure proper event propagation

4. **View switching not working**
   - Check Zustand store connection
   - Verify `currentView` state updates
   - Ensure ViewContainer receives correct props

### Performance Issues

1. **Slow table rendering**
   - Enable virtual scrolling for large datasets
   - Optimize column definitions
   - Use proper React.memo() for cells

2. **Laggy drag-and-drop**
   - Check drag sensor configuration
   - Optimize render during drag operations
   - Use transform CSS instead of position changes

## Future Enhancements

### Planned Features
- Command palette (⌘K) for quick actions
- Advanced filtering and search
- Export functionality (CSV, Excel, PDF)
- Real-time collaboration features
- Mobile app integration
- Advanced scheduling algorithms

### API Integrations
- Real-time updates with WebSockets
- Optimistic update conflict resolution
- Offline support with sync
- Advanced caching strategies

---

This redesign provides a modern, accessible, and highly functional interface for manufacturing task management while maintaining excellent performance and user experience standards.