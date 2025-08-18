# Supplier Task Management System - Design Document

## Overview
A centralized application for managing supplier due dates and task status across multiple projects. The system maintains consistency by ensuring tasks with the same title have synchronized due dates across all suppliers within a project.

## System Architecture

### Data Model Hierarchy
```
Suppliers
├── Projects
    ├── Task Types
        ├── Tasks
```

### Core Entities

#### Supplier
```typescript
interface Supplier {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}
```

#### Project
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}
```

#### Task Type
```typescript
interface TaskType {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  order: number; // For display ordering
  createdAt: Date;
  updatedAt: Date;
}
```

#### Task Template (Master Task Definition)
```typescript
interface TaskTemplate {
  id: string;
  projectId: string;
  taskTypeId: string;
  title: string;
  description?: string;
  dueDate: Date;
  estimatedHours?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[]; // Array of task template IDs
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Task Instance (Supplier-specific Task)
```typescript
interface TaskInstance {
  id: string;
  taskTemplateId: string;
  supplierId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  actualStartDate?: Date;
  actualCompletionDate?: Date;
  notes?: string;
  attachments?: string[];
  completionPercentage: number;
  updatedAt: Date;
}
```

## Key Features

### 1. Central Due Date Management
- **Master Task Templates**: Each project has task templates that define the canonical due dates
- **Automatic Synchronization**: When a task template due date changes, all supplier instances inherit the new date
- **Bulk Due Date Updates**: Ability to shift all task dates by a relative amount (e.g., "delay all tasks by 2 weeks")

### 2. Supplier Management
- Add/edit/deactivate suppliers
- Assign suppliers to projects
- View supplier performance metrics
- Contact information management

### 3. Project Management
- Create projects with standardized task structures
- Clone project templates for new suppliers
- Project status tracking and reporting
- Timeline visualization

### 4. Task Management
- Task status tracking per supplier
- Progress percentage tracking
- Notes and file attachments
- Dependency management
- Overdue task alerts

### 5. Reporting & Analytics
- Supplier performance dashboards
- Project completion rates
- Overdue task reports
- Timeline comparisons across suppliers

## User Interface Design

### Main Navigation
```
┌─────────────────────────────────────────┐
│ Supplier Task Manager                    │
├─────────────────────────────────────────┤
│ 📊 Dashboard                            │
│ 🏢 Suppliers                            │
│ 📋 Projects                             │
│ 📅 Master Schedule                      │
│ 📈 Reports                              │
└─────────────────────────────────────────┘
```

### Dashboard Layout
- **Overview Cards**: Active projects, overdue tasks, supplier count
- **Recent Activity**: Latest task updates, completed milestones
- **Upcoming Deadlines**: Next 7-14 days of due tasks
- **Performance Metrics**: On-time completion rates, avg delay times

### Master Schedule View
- **Project Selection**: Dropdown to choose active project
- **Task Template Grid**: 
  - Columns: Task Type, Task Title, Due Date, Priority, Assigned Suppliers
  - Inline editing for due dates
  - Bulk actions for date adjustments
- **Timeline View**: Gantt-style visualization of all tasks

### Supplier Project View
- **Supplier Header**: Name, contact info, overall progress
- **Task Status Grid**:
  - Grouped by Task Type
  - Status indicators (color-coded)
  - Progress bars
  - Action buttons (mark complete, add notes)
- **Quick Actions**: Bulk status updates, export progress report

## Technical Implementation

### Technology Stack Recommendations
- **Frontend**: React/Next.js with TypeScript
- **Backend**: Node.js with Express or Fastify
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: React Query + Zustand
- **UI Framework**: Tailwind CSS + Headless UI or shadcn/ui
- **Authentication**: NextAuth.js or Auth0

### Database Schema Considerations
```sql
-- Enable foreign key constraints and cascading updates
-- Consider indexing frequently queried fields:
-- - supplier_id, project_id combinations
-- - task_template_id for quick lookups
-- - due_date for timeline queries
-- - status fields for filtering

-- Implement triggers for automatic task instance creation
-- when suppliers are assigned to projects
```

### API Design
```typescript
// Key API endpoints
GET    /api/suppliers
POST   /api/suppliers
GET    /api/suppliers/:id/projects
POST   /api/suppliers/:id/projects/:projectId/assign

GET    /api/projects
POST   /api/projects
GET    /api/projects/:id/task-templates
PUT    /api/projects/:id/task-templates/:templateId/due-date

GET    /api/task-instances
PUT    /api/task-instances/:id/status
POST   /api/task-instances/:id/notes

GET    /api/reports/overdue-tasks
GET    /api/reports/supplier-performance
```

## Business Logic Rules

### Due Date Synchronization
1. When a task template due date is updated:
   - All related task instances inherit the new due date
   - System logs the change with timestamp and user
   - Affected suppliers receive notifications (optional)

2. Due date validation:
   - Cannot set due dates before project start date
   - Warn if due date is before current date
   - Validate dependency chains don't create circular references

### Task Status Workflow
```
not_started → in_progress → completed
     ↓             ↓
   blocked ← → cancelled
```

### Supplier Assignment
- When a supplier is assigned to a project:
  - Automatically create task instances for all task templates
  - Set initial status to 'not_started'
  - Inherit due dates from templates

## Security & Access Control

### User Roles
- **Admin**: Full system access, can modify master schedules
- **Project Manager**: Can view/edit assigned projects, update due dates
- **Supplier Coordinator**: Can update task status for assigned suppliers
- **Viewer**: Read-only access to reports and dashboards

### Data Protection
- API authentication via JWT tokens
- Role-based route protection
- Input validation and sanitization
- Audit logging for critical operations

## Future Enhancements

### Phase 2 Features
- Email notifications for due dates and status changes
- File attachment system for task documentation
- Integration with external calendar systems
- Mobile responsive design

### Phase 3 Features
- Advanced reporting with custom dashboards
- Integration with supplier portals
- Automated task creation via templates
- Performance analytics and predictive insights

## Development Phases

### Phase 1: Core Foundation (4-6 weeks)
- Basic CRUD operations for all entities
- Master schedule management
- Simple task status tracking
- Basic reporting

### Phase 2: Enhanced UX (3-4 weeks)
- Advanced UI components
- Bulk operations
- Improved navigation
- Data validation and error handling

### Phase 3: Advanced Features (4-5 weeks)
- Comprehensive reporting
- User management
- Performance optimizations
- Testing and deployment

## Getting Started with Claude Code

### Initial Setup Commands
```bash
# Create new Next.js project
npx create-next-app@latest supplier-task-manager --typescript --tailwind --app

# Install core dependencies
npm install @prisma/client prisma @tanstack/react-query zustand
npm install @hookform/resolvers react-hook-form zod
npm install lucide-react @radix-ui/react-*

# Development dependencies
npm install -D @types/node tsx
```

### First Implementation Steps
1. Set up database schema with Prisma
2. Create basic API routes for suppliers and projects
3. Implement core UI components
4. Build master schedule management interface
5. Add task instance creation and status tracking

---

This design document provides a comprehensive foundation for building your supplier task management system. Use it as a reference when working with Claude Code to implement specific features and maintain consistency across the application.