# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Supplier Task Management Portal** - a centralized system for managing supplier due dates and task status across multiple manufacturing projects. The system ensures task consistency by synchronizing due dates across all suppliers within each project.

### Current Status
- **Phase**: Planning/Documentation 
- **Implementation**: Not yet started - this is currently a documentation-only repository
- **Next Steps**: Begin Next.js application setup based on the design documents

## Key Development Commands

Since this project hasn't been implemented yet, these commands should be run during initial setup:

```bash
# Initial project setup (when implementation begins)
npx create-next-app@latest . --typescript --tailwind --app

# Core dependencies installation
npm install @prisma/client prisma @tanstack/react-query
npm install @hookform/resolvers react-hook-form zod
npm install lucide-react

# Database setup (SQLite with Prisma)
npx prisma generate
npx prisma db push
npx prisma db seed

# Development workflow
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript checking

# Database management
npx prisma studio        # Visual database browser
npx prisma db push       # Push schema changes
npx prisma generate      # Regenerate Prisma client
```

## Architecture & Technical Stack

### Planned Technology Stack
- **Frontend**: Next.js 15 with App Router, TypeScript, React 18
- **Styling**: Tailwind CSS with responsive design
- **Database**: SQLite with Prisma ORM for development
- **State Management**: TanStack Query (React Query) + React Hook Form
- **UI Components**: Custom accessible components with Lucide Icons
- **Validation**: Zod schemas for type-safe validation

### Data Model Hierarchy
```
Suppliers → SupplierProjects → Projects → TaskTypes → TaskTemplates → TaskInstances
```

### Core Entities
- **Suppliers**: Manufacturing suppliers with contact information
- **Projects**: Platform Development (A), Product Refresh (B), Technology Integration (C)
- **Task Templates**: Master definitions with canonical due dates
- **Task Instances**: Supplier-specific tasks that inherit from templates
- **Task Categories**: Part Approval, Production Readiness, New Model Builds, General

## Business Logic Patterns

### Due Date Synchronization
- Master task templates maintain canonical due dates for all projects
- When template dates change, all supplier task instances automatically inherit updates
- Supports bulk date adjustments for project timeline changes

### Task Status Workflow
```
not_started → in_progress → completed
     ↓             ↓
   blocked ←→  cancelled
```

### Manufacturing-Specific Features
- **Part Approval**: Component approvals, drawings, specifications, sign-offs
- **Production Readiness**: Validation activities, capability studies, production trials  
- **New Model Builds**: Prototype development, pilot production, validation testing
- **General**: Documentation, compliance, contracts, administrative tasks

## Implementation Priorities

### Phase 1: Foundation (4-6 weeks)
1. Next.js project setup with TypeScript and Tailwind
2. Prisma schema implementation based on design document
3. Basic CRUD operations for suppliers, projects, task templates
4. Master schedule management interface
5. Simple task status tracking

### Phase 2: Enhanced UX (3-4 weeks)
1. Advanced UI components with manufacturing terminology
2. Bulk operations for date management
3. Responsive supplier portal design
4. Data validation and error handling

### Phase 3: Advanced Features (4-5 weeks)
1. Performance analytics and supplier metrics
2. Comprehensive reporting dashboards
3. Accessibility compliance (WCAG 2.1 AA)
4. Production deployment and monitoring

## Development Guidelines

### Manufacturing Domain Considerations
- Use manufacturing-specific terminology throughout the UI
- Implement supplier portal branding and professional appearance
- Focus on production workflow compatibility
- Ensure task categories align with manufacturing processes

### Database Design Patterns
- Implement foreign key constraints with cascading updates
- Index frequently queried fields (supplier_id, project_id combinations)
- Use triggers for automatic task instance creation when suppliers are assigned
- Maintain audit logs for critical due date changes

### API Design Patterns
Key endpoints to implement:
```typescript
GET/POST /api/suppliers
GET/POST /api/projects  
GET/PUT  /api/projects/:id/task-templates
PUT      /api/task-instances/:id/status
GET      /api/reports/supplier-performance
```

## Files and Documentation

### Current Documentation
- `README.md` - Comprehensive project overview and setup instructions
- `supplier_task_manager_design.md` - Detailed system architecture and technical specifications
- `supplier tracking system.pdf` - Additional project requirements

### Future Code Organization
When implementation begins, follow this structure:
```
/app                    # Next.js App Router pages
/components            # Reusable UI components  
/lib                   # Utilities and configurations
/prisma               # Database schema and migrations
/types                # TypeScript type definitions
/hooks                # Custom React hooks
```

## Specific Implementation Notes

### Security Considerations
- Input validation with Zod schemas
- SQL injection prevention through Prisma
- CSRF protection for form submissions
- Secure session management for supplier access

### Performance Requirements  
- Server-side rendering with Next.js App Router
- Optimistic UI updates for real-time task status changes
- Efficient database queries with proper indexing
- Lazy loading for large supplier datasets

### Accessibility Requirements
- WCAG 2.1 AA compliance for supplier portal access
- Keyboard navigation for all manufacturing workflows
- Screen reader optimization with proper ARIA labels
- Color contrast validation for production environments

## Testing Strategy

When implementation begins:
- Unit tests for business logic (due date synchronization)
- Integration tests for API endpoints
- End-to-end tests for critical supplier workflows
- Accessibility testing with assistive technologies
- Performance testing for large supplier datasets

---

**Note**: This project is currently in the documentation phase. Use the design documents as the authoritative source for implementation details.

## Before Starting - Pre-Implementation Checklist

**Required Actions:**
- [ ] Confirm understanding of project requirements
- [ ] Provide overview of current file structure
- [ ] Identify potential risks and challenges
- [ ] List any ambiguous requirements needing clarification
- [ ] Outline implementation plan with clear milestones
- [ ] Identify areas where human review will be critical
- [ ] Acknowledge any domain-specific limitations

**Ask clarifying questions if needed. Do not proceed until the approach is validated.**

## Planning Before Execution

Before writing any code or making changes:

1. Analyze the current project structure and understand existing patterns
2. Create a clear implementation plan outlining each step
3. Consider how new features integrate with the existing architecture
4. Identify potential impacts on other parts of the system
5. Document your approach before beginning implementation
6. Assess security implications of the proposed changes
7. Consider performance impacts and scalability
8. Identify configuration and environment requirements
9. Review UX/accessibility requirements

## Development Workflow

### Incremental Development Strategy

1. **Understand**: Review requirements and existing codebase
2. **Plan**: Design minimal viable implementation first
3. **Implement**: 
   - Start with core functionality
   - Build features incrementally with working checkpoints
   - Validate each step before proceeding
   - Avoid large, monolithic changes
4. **Test**: Verify functionality at each checkpoint
5. **Enhance**: Layer additional features progressively
6. **Refactor**: Improve code quality without changing behavior
7. **Document**: Update relevant documentation continuously

### Progressive Enhancement Approach

- Build core functionality first
- Layer enhancements progressively
- Ensure graceful degradation
- Maintain backward compatibility
- Create fallback behaviors for advanced features

## Code Quality Standards

### General Principles

- Write clean, self-documenting code with meaningful variable and function names
- Follow established conventions in the project (or industry standards if new project)
- Implement proper error handling and edge case management
- Add comments only where the intent isn't immediately clear from the code
- Prefer composition over inheritance where appropriate
- Keep functions small and focused on a single responsibility
- Explain trade-offs when multiple valid solutions exist

### Security-First Development

- **Always** validate and sanitize all input data
- Implement proper authentication and authorization checks
- Never store sensitive data in plain text
- Follow OWASP Top 10 security guidelines
- Use parameterized queries for database operations
- Implement rate limiting where appropriate
- Scan dependencies for known vulnerabilities
- Use secure communication protocols (HTTPS, WSS)
- Follow the principle of least privilege

### Error Handling & Failure Management

- Fail fast with clear, actionable error messages
- Implement circuit breakers for external service calls
- Provide graceful fallback behaviors
- Design recovery strategies for transient failures
- Never expose sensitive information in error messages
- Log errors with appropriate context for debugging
- Distinguish between recoverable and non-recoverable errors
- Implement retry logic with exponential backoff where appropriate

## User Experience (UX) Requirements

### Accessibility (WCAG 2.1 AA Compliance)

**Core Requirements:**
- Ensure keyboard navigation for all interactive elements
- Maintain focus visibility and logical tab order
- Include proper ARIA labels and roles
- Ensure minimum color contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Support screen readers with semantic HTML
- Provide text alternatives for all non-text content
- Ensure forms have proper labels and error messages
- Support browser zoom up to 200% without horizontal scrolling
- Interactive elements must have minimum 44x44px touch targets

### UI Implementation Standards

**Responsive Design:**
- Design for breakpoints, not devices
- Use relative units (rem, em, %) over fixed pixels
- Implement fluid typography and spacing
- Test on actual devices, not just browser tools
- Consider thumb reach zones on mobile devices

**Performance & User Experience:**
- Implement skeleton screens for loading states
- Show progress indicators for operations > 1 second
- Provide instant visual feedback for user interactions
- Optimize Core Web Vitals:
  - Cumulative Layout Shift (CLS) < 0.1
  - First Input Delay (FID) < 100ms
  - Largest Contentful Paint (LCP) < 2.5s
- Implement optimistic UI updates where appropriate
- Use lazy loading for images and heavy components

**Interaction Patterns:**
- Display errors near the relevant input/action
- Use plain language, avoid technical jargon
- Provide actionable recovery steps
- Maintain user input after errors
- Auto-save user input periodically
- Warn before discarding unsaved changes
- Respect `prefers-reduced-motion` settings

## Efficiency Requirements

### Performance Optimization

- Optimize for readability first, then performance where necessary
- Analyze time complexity for all algorithms (document O notation)
- Minimize database queries and optimize existing ones
- Reduce network requests through batching and caching
- Monitor bundle sizes for frontend code
- Implement lazy loading for heavy resources
- Use appropriate data structures for the use case
- Consider memory usage and potential bottlenecks
- Profile performance bottlenecks before optimizing

### Resource Management

- Implement caching strategies where beneficial
- Clean up resources (close connections, clear timers)
- Avoid memory leaks through proper cleanup
- Use connection pooling for database connections
- Implement pagination for large data sets
- Optimize asset delivery (compression, CDN usage)

## Project Structure Considerations

### Architecture & Organization

- Maintain consistent file and folder organization
- Follow separation of concerns (business logic, data access, presentation)
- Use modular design patterns that allow for easy testing and maintenance
- Ensure new features don't break existing functionality
- Keep related code together, separate unrelated concerns
- Create reusable components and utilities where appropriate
- Minimize dependencies and avoid circular references

### Configuration Management

- Separate environment-specific configuration
- Never commit secrets or credentials to version control
- Use environment variables for sensitive configuration
- Implement configuration validation on startup
- Document all configuration options
- Consider feature flags for gradual rollouts
- Provide sensible defaults with override capabilities

## Testing Approach

### Testing Strategy

- Write testable code with dependency injection where needed
- Implement unit tests for critical business logic
- Include integration tests for API endpoints
- Add end-to-end tests for critical user flows
- Validate input data and handle invalid states gracefully
- Test edge cases and error conditions
- Ensure backwards compatibility when modifying existing features
- Include performance tests for critical paths
- Test with assistive technologies
- Document how to run tests locally

### Test Coverage Requirements

- Aim for high coverage on business logic
- Test error handling paths
- Include negative test cases
- Test boundary conditions
- Verify security controls
- Test configuration variations
- Test accessibility requirements
- Verify responsive design breakpoints

## Documentation Requirements

### Code Documentation

- Update README.md for new features and setup changes
- Document public APIs with clear examples
- Create Architecture Decision Records (ADRs) for significant choices
- Maintain up-to-date setup and installation instructions
- Document environment variables and configuration options
- Include troubleshooting guides for common issues
- Add inline documentation for complex algorithms
- Document breaking changes prominently
- Include accessibility notes for components

### API Documentation

- Include request/response examples
- Document error codes and meanings
- Specify rate limits and quotas
- Provide authentication requirements
- Include versioning information

## Version Control Best Practices

### Commit Strategy

- Make atomic commits with single-purpose changes
- Write meaningful commit messages following conventional commits format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `refactor:` for code refactoring
  - `test:` for test additions/changes
  - `chore:` for maintenance tasks
  - `style:` for formatting, missing semicolons, etc.
  - `perf:` for performance improvements
  - `a11y:` for accessibility improvements
- Include ticket/issue numbers in commit messages
- Avoid mixing formatting changes with logic changes

### Branch Management

- Create feature branches for new development
- Keep branches small and focused
- Rebase or merge main branch regularly
- Delete branches after merging
- Use descriptive branch names

## Debugging & Monitoring

### Logging Strategy

- Implement structured logging (JSON format preferred)
- Use appropriate log levels (ERROR, WARN, INFO, DEBUG)
- Include correlation IDs for request tracing
- Never log sensitive information (passwords, tokens, PII)
- Separate debug logging from production
- Include contextual information in log entries
- Implement log rotation and retention policies

### Monitoring & Observability

- Add performance instrumentation points
- Implement health check endpoints
- Include metrics collection for key operations
- Set up error tracking and alerting
- Monitor resource usage patterns
- Track business-relevant metrics
- Monitor Core Web Vitals in production
- Track accessibility audit scores

## Code Review Preparation

### Self-Review Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] Documentation has been updated
- [ ] No sensitive data in code or commits
- [ ] Performance implications considered
- [ ] Security implications reviewed
- [ ] Accessibility requirements met
- [ ] UX guidelines followed
- [ ] Breaking changes clearly marked
- [ ] PR description explains what and why

### Pull Request Guidelines

- Provide clear PR title and description
- Include screenshots for UI changes
- Link related issues or tickets
- Highlight areas needing specific review
- Call out any technical debt or TODOs
- Provide testing instructions
- Note any deployment considerations
- Include accessibility testing results
- Document any UX decisions made

## Component Design Guidelines

### Reusable Component Checklist

- [ ] Component works with keyboard only
- [ ] Component is screen reader accessible
- [ ] Component handles loading/error/empty states
- [ ] Component is responsive
- [ ] Component follows design system patterns
- [ ] Component has appropriate TypeScript types
- [ ] Component is documented with usage examples
- [ ] Component handles edge cases gracefully
- [ ] Component respects user preferences (theme, motion)
- [ ] Component has been tested across browsers

## Internationalization (i18n) Considerations

- Design for text expansion (German ~30% longer than English)
- Support RTL (right-to-left) languages
- Avoid text in images
- Use ICU message format for pluralization
- Consider cultural differences in icons/colors
- Format dates/numbers according to locale
- Test with actual translations
- Design for different reading patterns

## Specific Instructions

### Decision Making

- Always explain reasoning for architectural decisions
- Flag any potential technical debt or areas needing future improvement
- Suggest alternatives when multiple valid approaches exist
- Highlight any breaking changes or migration requirements
- Provide clear commit messages that explain what and why
- Document trade-offs and assumptions made
- Identify areas where human expertise is crucial
- Consider long-term maintainability in all decisions

### Communication

- Use clear, concise language in all communications
- Highlight critical information prominently
- Separate must-have from nice-to-have requirements
- Ask for clarification rather than making assumptions
- Provide progress updates for long-running tasks
- Flag blockers immediately
- Document UX/design decisions and rationale

## AI-Specific Considerations

- Request clarification on ambiguous requirements before proceeding
- Explicitly state when making assumptions
- Highlight areas where domain expertise is needed
- Acknowledge limitations in specialized knowledge
- Provide multiple solutions when trade-offs exist
- Flag security-sensitive code for human review
- Indicate confidence levels for complex implementations
- Suggest areas for additional testing or review
- Note when UX best practices conflict with requirements
- Identify accessibility concerns that need human validation

## Definition of Done

A feature is considered complete when:

- [ ] All acceptance criteria are met
- [ ] Code passes all tests (unit, integration, e2e)
- [ ] Code has been peer reviewed
- [ ] Documentation is updated
- [ ] Accessibility requirements are met
- [ ] Performance benchmarks are satisfied
- [ ] Security scan passes
- [ ] No critical or high-severity issues remain
- [ ] Feature works across supported browsers/devices
- [ ] Monitoring and logging are in place
- [ ] Feature flags are configured (if applicable)
- [ ] Deployment instructions are documented

---

*Note: This is a living document. Customize based on your specific tech stack, team conventions, and project requirements. Regular updates ensure guidelines remain relevant and effective.*

*Last Updated: 8/15/2025*
*Version: 1.0*