-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "supplierNumber" TEXT,
    "location" TEXT,
    "contacts" TEXT,
    "contactInfo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "task_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskTypeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "milestones_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "task_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "task_type_sections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "task_type_sections_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "task_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskTypeId" TEXT NOT NULL,
    "sectionId" TEXT,
    "parentTaskId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL,
    "defaultOwner" TEXT,
    "defaultNotes" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "milestoneId" TEXT,
    CONSTRAINT "tasks_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "task_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "task_type_sections" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_task_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "taskTypeId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "project_task_types_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_task_types_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "task_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_task_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "sectionId" TEXT,
    "dueDate" DATETIME NOT NULL,
    "owner" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "anchor" TEXT NOT NULL DEFAULT 'PROJECT_START',
    "offsetDays" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "project_task_templates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_task_templates_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_milestone_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "responsibleParties" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "project_milestone_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_milestone_tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_milestone_tasks_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "supplier_project_instances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "supplier_project_instances_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "supplier_project_instances_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "supplier_task_instances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierProjectInstanceId" TEXT NOT NULL,
    "projectTaskTemplateId" TEXT,
    "projectMilestoneTaskId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "dueDate" DATETIME NOT NULL,
    "actualDueDate" DATETIME,
    "owner" TEXT,
    "notes" TEXT,
    "isApplied" BOOLEAN NOT NULL DEFAULT true,
    "blockedReason" TEXT,
    "submissionFiles" JSONB,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "supplier_task_instances_supplierProjectInstanceId_fkey" FOREIGN KEY ("supplierProjectInstanceId") REFERENCES "supplier_project_instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "supplier_task_instances_projectTaskTemplateId_fkey" FOREIGN KEY ("projectTaskTemplateId") REFERENCES "project_task_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "supplier_task_instances_projectMilestoneTaskId_fkey" FOREIGN KEY ("projectMilestoneTaskId") REFERENCES "project_milestone_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "supplier_projects_old" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "supplier_projects_old_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "supplier_projects_old_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "task_templates_old" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskTypeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "canonicalDue" DATETIME NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "task_templates_old_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "task_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "task_templates_old_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "task_instances_old" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierProjectId" TEXT NOT NULL,
    "taskTemplateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "actualDue" DATETIME,
    "completedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "task_instances_old_supplierProjectId_fkey" FOREIGN KEY ("supplierProjectId") REFERENCES "supplier_projects_old" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "task_instances_old_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "task_templates_old" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplierNumber_key" ON "suppliers"("supplierNumber");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_supplierNumber_idx" ON "suppliers"("supplierNumber");

-- CreateIndex
CREATE INDEX "suppliers_updatedAt_idx" ON "suppliers"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "projects_name_key" ON "projects"("name");

-- CreateIndex
CREATE INDEX "projects_name_idx" ON "projects"("name");

-- CreateIndex
CREATE INDEX "projects_updatedAt_idx" ON "projects"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "task_types_name_key" ON "task_types"("name");

-- CreateIndex
CREATE INDEX "task_types_category_idx" ON "task_types"("category");

-- CreateIndex
CREATE INDEX "task_types_name_idx" ON "task_types"("name");

-- CreateIndex
CREATE INDEX "milestones_taskTypeId_idx" ON "milestones"("taskTypeId");

-- CreateIndex
CREATE INDEX "milestones_code_idx" ON "milestones"("code");

-- CreateIndex
CREATE INDEX "milestones_sequence_idx" ON "milestones"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_taskTypeId_code_key" ON "milestones"("taskTypeId", "code");

-- CreateIndex
CREATE INDEX "task_type_sections_taskTypeId_sequence_idx" ON "task_type_sections"("taskTypeId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "task_type_sections_taskTypeId_name_key" ON "task_type_sections"("taskTypeId", "name");

-- CreateIndex
CREATE INDEX "tasks_taskTypeId_sectionId_idx" ON "tasks"("taskTypeId", "sectionId");

-- CreateIndex
CREATE INDEX "tasks_parentTaskId_idx" ON "tasks"("parentTaskId");

-- CreateIndex
CREATE INDEX "tasks_name_idx" ON "tasks"("name");

-- CreateIndex
CREATE INDEX "tasks_sequence_idx" ON "tasks"("sequence");

-- CreateIndex
CREATE INDEX "tasks_milestoneId_idx" ON "tasks"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_taskTypeId_name_parentTaskId_key" ON "tasks"("taskTypeId", "name", "parentTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_milestoneId_name_key" ON "tasks"("milestoneId", "name");

-- CreateIndex
CREATE INDEX "project_task_types_projectId_idx" ON "project_task_types"("projectId");

-- CreateIndex
CREATE INDEX "project_task_types_taskTypeId_idx" ON "project_task_types"("taskTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "project_task_types_projectId_taskTypeId_key" ON "project_task_types"("projectId", "taskTypeId");

-- CreateIndex
CREATE INDEX "project_task_templates_projectId_sectionId_idx" ON "project_task_templates"("projectId", "sectionId");

-- CreateIndex
CREATE INDEX "project_task_templates_projectId_dueDate_idx" ON "project_task_templates"("projectId", "dueDate");

-- CreateIndex
CREATE INDEX "project_task_templates_taskId_idx" ON "project_task_templates"("taskId");

-- CreateIndex
CREATE INDEX "project_task_templates_dueDate_idx" ON "project_task_templates"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "project_task_templates_projectId_taskId_key" ON "project_task_templates"("projectId", "taskId");

-- CreateIndex
CREATE INDEX "project_milestone_tasks_projectId_idx" ON "project_milestone_tasks"("projectId");

-- CreateIndex
CREATE INDEX "project_milestone_tasks_milestoneId_idx" ON "project_milestone_tasks"("milestoneId");

-- CreateIndex
CREATE INDEX "project_milestone_tasks_taskId_idx" ON "project_milestone_tasks"("taskId");

-- CreateIndex
CREATE INDEX "project_milestone_tasks_dueDate_idx" ON "project_milestone_tasks"("dueDate");

-- CreateIndex
CREATE INDEX "project_milestone_tasks_projectId_dueDate_idx" ON "project_milestone_tasks"("projectId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "project_milestone_tasks_projectId_milestoneId_taskId_key" ON "project_milestone_tasks"("projectId", "milestoneId", "taskId");

-- CreateIndex
CREATE INDEX "supplier_project_instances_supplierId_idx" ON "supplier_project_instances"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_project_instances_projectId_idx" ON "supplier_project_instances"("projectId");

-- CreateIndex
CREATE INDEX "supplier_project_instances_status_idx" ON "supplier_project_instances"("status");

-- CreateIndex
CREATE INDEX "supplier_project_instances_assignedAt_idx" ON "supplier_project_instances"("assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_project_instances_supplierId_projectId_key" ON "supplier_project_instances"("supplierId", "projectId");

-- CreateIndex
CREATE INDEX "supplier_task_instances_supplierProjectInstanceId_status_idx" ON "supplier_task_instances"("supplierProjectInstanceId", "status");

-- CreateIndex
CREATE INDEX "supplier_task_instances_supplierProjectInstanceId_dueDate_idx" ON "supplier_task_instances"("supplierProjectInstanceId", "dueDate");

-- CreateIndex
CREATE INDEX "supplier_task_instances_actualDueDate_idx" ON "supplier_task_instances"("actualDueDate");

-- CreateIndex
CREATE INDEX "supplier_task_instances_status_dueDate_idx" ON "supplier_task_instances"("status", "dueDate");

-- CreateIndex
CREATE INDEX "supplier_task_instances_projectTaskTemplateId_idx" ON "supplier_task_instances"("projectTaskTemplateId");

-- CreateIndex
CREATE INDEX "supplier_task_instances_projectMilestoneTaskId_idx" ON "supplier_task_instances"("projectMilestoneTaskId");

-- CreateIndex
CREATE INDEX "supplier_task_instances_isApplied_idx" ON "supplier_task_instances"("isApplied");

-- CreateIndex
CREATE INDEX "supplier_task_instances_updatedAt_idx" ON "supplier_task_instances"("updatedAt");

-- CreateIndex
CREATE INDEX "supplier_task_instances_completedAt_idx" ON "supplier_task_instances"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_task_instances_supplierProjectInstanceId_projectTaskTemplateId_key" ON "supplier_task_instances"("supplierProjectInstanceId", "projectTaskTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_task_instances_supplierProjectInstanceId_projectMilestoneTaskId_key" ON "supplier_task_instances"("supplierProjectInstanceId", "projectMilestoneTaskId");

-- CreateIndex
CREATE INDEX "supplier_projects_old_supplierId_idx" ON "supplier_projects_old"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_projects_old_projectId_idx" ON "supplier_projects_old"("projectId");

-- CreateIndex
CREATE INDEX "supplier_projects_old_status_idx" ON "supplier_projects_old"("status");

-- CreateIndex
CREATE INDEX "supplier_projects_old_assignedAt_idx" ON "supplier_projects_old"("assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_projects_old_supplierId_projectId_key" ON "supplier_projects_old"("supplierId", "projectId");

-- CreateIndex
CREATE INDEX "task_templates_old_projectId_idx" ON "task_templates_old"("projectId");

-- CreateIndex
CREATE INDEX "task_templates_old_taskTypeId_idx" ON "task_templates_old"("taskTypeId");

-- CreateIndex
CREATE INDEX "task_templates_old_canonicalDue_idx" ON "task_templates_old"("canonicalDue");

-- CreateIndex
CREATE INDEX "task_templates_old_projectId_canonicalDue_idx" ON "task_templates_old"("projectId", "canonicalDue");

-- CreateIndex
CREATE UNIQUE INDEX "task_templates_old_taskTypeId_projectId_key" ON "task_templates_old"("taskTypeId", "projectId");

-- CreateIndex
CREATE INDEX "task_instances_old_status_idx" ON "task_instances_old"("status");

-- CreateIndex
CREATE INDEX "task_instances_old_actualDue_idx" ON "task_instances_old"("actualDue");

-- CreateIndex
CREATE INDEX "task_instances_old_supplierProjectId_idx" ON "task_instances_old"("supplierProjectId");

-- CreateIndex
CREATE INDEX "task_instances_old_taskTemplateId_idx" ON "task_instances_old"("taskTemplateId");

-- CreateIndex
CREATE INDEX "task_instances_old_status_actualDue_idx" ON "task_instances_old"("status", "actualDue");

-- CreateIndex
CREATE INDEX "task_instances_old_supplierProjectId_status_idx" ON "task_instances_old"("supplierProjectId", "status");

-- CreateIndex
CREATE INDEX "task_instances_old_updatedAt_idx" ON "task_instances_old"("updatedAt");

-- CreateIndex
CREATE INDEX "task_instances_old_completedAt_idx" ON "task_instances_old"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "task_instances_old_supplierProjectId_taskTemplateId_key" ON "task_instances_old"("supplierProjectId", "taskTemplateId");
