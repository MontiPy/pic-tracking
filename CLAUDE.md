# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Primary Development:**
- `npm run dev` - Start development server with Turbopack (port 3000)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

**Database Operations:**
- `npm run db:generate` - Generate Prisma client after schema changes  
- `npm run db:push` - Push schema changes to SQLite database
- `npm run db:seed` - Seed database with test data
- `npm run db:studio` - Open Prisma Studio for database management

## Architecture Overview

This is a **Supplier Task Management Portal** built with Next.js 15, TypeScript, Tailwind CSS, and Prisma ORM with SQLite. The system manages manufacturing workflows with suppliers, projects, and hierarchical task structures.

### Dual Data Model Architecture

**Current State:** The codebase implements both legacy and new data models during an ongoing migration:

- **New Model (Target):** TaskType → Milestone → Task → ProjectMilestoneTask → SupplierTaskInstance
- **Legacy Model:** TaskTemplate → TaskInstance (kept for backward compatibility)

### Core Workflow Hierarchy

```
Manufacturing Sections:
├── Part Approval (PA2, PA3, PA4 milestones)
├── NMR (New Model Release)  
├── New Model Builds
└── General

Task Flow:
Suppliers → SupplierProjectInstances → Projects
TaskTypes → Milestones → Tasks → ProjectMilestoneTasks → SupplierTaskInstances
```

### Key Technical Patterns

**Prisma Client Usage:**
- ALWAYS import from `lib/prisma.ts` (centralized singleton)
- NEVER use `new PrismaClient()` directly

**Next.js 15 API Routes:**
- Use `{ params }: { params: Promise<{ id: string }> }` 
- Always `const { id } = await params`

**Manufacturing Categories:**
- Valid categories: `['Part Approval', 'NMR', 'New Model Builds', 'General', 'Production Readiness']`

### Directory Structure

- `/app` - Next.js App Router with API routes and pages
- `/components/forms` - Form components (ProjectTemplateForm replaces TaskTemplateForm)
- `/lib` - Utilities (prisma.ts, task-sync.ts, validation.ts, cache.ts)
- `/prisma` - Database schema and seed data
- `supplier_task_manager_design.md` - Comprehensive design document

### Database Schema Notes

**Core Entities:**
- `suppliers` - Supplier details with JSON contacts
- `projects` - Project management
- `task_types` - Manufacturing task categories  
- `milestones` - PA2, PA3, PA4 etc. within task types
- `tasks` - Individual tasks within milestones
- `project_milestone_tasks` - Project-level task templates with canonical due dates
- `supplier_task_instances` - Supplier-specific task instances that inherit due dates

### Task Creation Flow

**Current Implementation (New Model):**
1. Select/create TaskType 
2. Select/create Milestone within TaskType
3. Select/create Task within Milestone  
4. Set due date and create ProjectMilestoneTask
5. Auto-generate SupplierTaskInstances when suppliers assigned

**Important:** The schedule page (`/schedule`) uses `ProjectTemplateForm` component which calls `/api/project-templates` endpoint for the new hierarchical workflow.

### Status and Migration Notes

- **Phase 1:** Prisma client centralization and Next.js 15 compatibility (COMPLETED)
- **Phase 2:** New model task creation workflow (COMPLETED)  
- **Phase 3:** Migration support and cleanup (PENDING)

**Known Legacy Dependencies:** Some API endpoints and UI components still reference old TaskTemplate/TaskInstance models for backward compatibility during migration.

### Testing and Data

- Database seeding creates test data for all entities
- Manufacturing terminology: PA2/PA3/PA4 (Part Approval milestones), NMR processes
- Task lifecycle: not_started → in_progress → completed (with blocked/cancelled options)