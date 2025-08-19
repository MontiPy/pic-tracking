# DEVOPS_ENGINEER Package Dependencies & Build System

## Overview
Update package dependencies, build configuration, and development tooling to support v2 design requirements including new UI libraries, styling approach, and development workflow optimizations.

## Current State Analysis
- **Package Manager**: npm
- **Build System**: Next.js 15 with Turbopack
- **Current Dependencies**: Basic React app with Tailwind CSS 4
- **Missing Dependencies**: TanStack Table/Query, dnd-kit, Zustand, CSS Modules tooling

## Target State (V2 Design)
- **New UI Stack**: TanStack ecosystem, dnd-kit for drag operations
- **Styling Migration**: Tailwind CSS → CSS Modules + design tokens
- **State Management**: Zustand for client state
- **Enhanced Development**: Better tooling for CSS Modules, validation

## Package Dependencies Tasks

### 1. Remove Deprecated Dependencies

#### 1.1 Tailwind CSS Removal
- [ ] **Uninstall Tailwind CSS packages**
  ```bash
  npm uninstall tailwindcss @tailwindcss/postcss
  ```

- [ ] **Remove Tailwind configuration**
  - Remove `tailwind.config.js` if exists
  - Remove Tailwind directives from global CSS
  - Update PostCSS configuration

### 2. Install New Core Dependencies

#### 2.1 Data Management Libraries
- [ ] **Install TanStack ecosystem**
  ```bash
  npm install @tanstack/react-table@^8.20.5
  npm install @tanstack/react-query@^5.85.3  # Already installed - verify version
  npm install @tanstack/react-virtual@^3.10.8  # For large dataset virtualization
  ```

#### 2.2 UI & Interaction Libraries
- [ ] **Install drag-and-drop libraries**
  ```bash
  npm install @dnd-kit/core@^6.1.0
  npm install @dnd-kit/sortable@^8.0.0  
  npm install @dnd-kit/utilities@^3.2.2
  ```

#### 2.3 State Management
- [ ] **Install Zustand**
  ```bash
  npm install zustand@^5.0.1
  ```

#### 2.4 Date & Utility Libraries
- [ ] **Install date-fns for timeline features**
  ```bash
  npm install date-fns@^3.6.0
  ```

#### 2.5 Optional UI Enhancement Libraries
- [ ] **Install Radix UI primitives** (for popovers, menus)
  ```bash
  npm install @radix-ui/react-popover@^1.1.1
  npm install @radix-ui/react-dropdown-menu@^2.1.1
  npm install @radix-ui/react-dialog@^1.1.1
  npm install @radix-ui/react-select@^2.1.1
  ```

### 3. Development Dependencies

#### 3.1 CSS Modules Tooling
- [ ] **Install CSS Modules type generation**
  ```bash
  npm install --save-dev typed-css-modules@^0.9.1
  npm install --save-dev css-loader@^7.1.2  # Next.js handles this, but explicit version
  ```

#### 3.2 Enhanced Validation & Testing
- [ ] **Upgrade Zod to v4**
  ```bash
  npm install zod@^4.0.17  # Already installed - verify version
  ```

- [ ] **Install testing utilities for new components**
  ```bash
  npm install --save-dev @testing-library/react@^16.0.1
  npm install --save-dev @testing-library/user-event@^14.5.2
  npm install --save-dev vitest@^2.1.5
  ```

#### 3.3 Code Quality Tools
- [ ] **Install additional ESLint plugins**
  ```bash
  npm install --save-dev eslint-plugin-react-hooks@^5.1.0
  npm install --save-dev @typescript-eslint/eslint-plugin@^8.15.0
  npm install --save-dev @typescript-eslint/parser@^8.15.0
  ```

### 4. Package.json Updates

#### 4.1 Update Scripts
- [ ] **Add new development scripts**
  ```json
  {
    "scripts": {
      "dev": "next dev --turbopack",
      "build": "next build",
      "start": "next start", 
      "lint": "next lint",
      "lint:fix": "next lint --fix",
      "type-check": "tsc --noEmit",
      "css:types": "typed-css-modules src --pattern '**/*.module.css' --watch",
      "test": "vitest",
      "test:ui": "vitest --ui",
      "db:generate": "prisma generate",
      "db:push": "prisma db push",
      "db:seed": "tsx prisma/seed.ts",
      "db:studio": "prisma studio",
      "migration:validate": "tsx scripts/validate-migration.ts"
    }
  }
  ```

#### 4.2 Update Package Metadata
- [ ] **Update package.json metadata**
  ```json
  {
    "name": "supplier-task-portal",
    "version": "2.0.0",
    "description": "Manufacturing supplier task management portal with inline editing and advanced scheduling",
    "keywords": ["manufacturing", "supplier-management", "task-tracking", "project-management"],
    "engines": {
      "node": ">=18.0.0",
      "npm": ">=8.0.0"
    }
  }
  ```

### 5. Configuration Updates

#### 5.1 TypeScript Configuration
- [ ] **Update tsconfig.json for new dependencies**
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "lib": ["dom", "dom.iterable", "ES6"],
      "allowJs": true,
      "skipLibCheck": true,
      "strict": true,
      "forceConsistentCasingInFileNames": true,
      "noEmit": true,
      "esModuleInterop": true,
      "module": "esnext",
      "moduleResolution": "node",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "preserve",
      "incremental": true,
      "plugins": [{ "name": "next" }],
      "baseUrl": ".",
      "paths": {
        "@/*": ["./src/*"],
        "@/components/*": ["./components/*"],
        "@/lib/*": ["./lib/*"],
        "@/hooks/*": ["./hooks/*"],
        "@/stores/*": ["./stores/*"],
        "@/styles/*": ["./src/styles/*"]
      },
      "types": ["vitest/globals"]
    },
    "include": [
      "next-env.d.ts",
      "**/*.ts",
      "**/*.tsx",
      ".next/types/**/*.ts",
      "**/*.module.css"
    ],
    "exclude": ["node_modules"]
  }
  ```

#### 5.2 Next.js Configuration
- [ ] **Update next.config.js**
  ```javascript
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    experimental: {
      turbopack: true,
      typedRoutes: true
    },
    eslint: {
      dirs: ['pages', 'components', 'lib', 'hooks', 'stores']
    },
    // CSS Modules configuration
    cssModules: true,
    webpack(config) {
      // Optimize for new dependencies
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
      return config;
    }
  };
  
  module.exports = nextConfig;
  ```

#### 5.3 ESLint Configuration
- [ ] **Update .eslintrc.json**
  ```json
  {
    "extends": [
      "next/core-web-vitals", 
      "@typescript-eslint/recommended"
    ],
    "plugins": ["@typescript-eslint", "react-hooks"],
    "rules": {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "prefer-const": "error"
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
      "ecmaVersion": 2022,
      "sourceType": "module"
    }
  }
  ```

### 6. Development Workflow Enhancements

#### 6.1 CSS Modules Setup
- [ ] **Create CSS modules type definitions**
  ```bash
  # Add to package.json scripts
  "css:types": "typed-css-modules src --pattern '**/*.module.css' --watch"
  ```

#### 6.2 Git Hooks (Optional)
- [ ] **Add pre-commit hooks for quality**
  ```bash
  npm install --save-dev husky@^9.1.6
  npm install --save-dev lint-staged@^15.2.10
  
  # package.json
  "lint-staged": {
    "**/*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "**/*.{css,scss,md}": ["prettier --write"]
  }
  ```

### 7. Bundle Analysis & Optimization

#### 7.1 Bundle Analyzer
- [ ] **Add bundle analysis tools**
  ```bash
  npm install --save-dev @next/bundle-analyzer@^15.4.6
  ```

- [ ] **Add bundle analysis script**
  ```json
  {
    "scripts": {
      "analyze": "ANALYZE=true next build"
    }
  }
  ```

### 8. Environment Configuration

#### 8.1 Environment Variables Template
- [ ] **Create .env.example**
  ```bash
  # Database
  DATABASE_URL="file:./dev.db"
  
  # Optional single-user auth
  ADMIN_PASSCODE=""
  
  # Development
  NODE_ENV="development"
  NEXT_TELEMETRY_DISABLED=1
  
  # Feature flags
  USE_V2_API="true"
  ENABLE_SUB_TASKS="true"
  ```

## Installation & Upgrade Process

### Step-by-Step Installation
1. **Backup current package-lock.json**
2. **Remove deprecated packages**
3. **Install new dependencies in batches**
4. **Update configuration files**
5. **Run type checking and linting**
6. **Test development server startup**

### Verification Steps
- [ ] **Development server starts without errors**
- [ ] **TypeScript compilation succeeds**
- [ ] **ESLint runs without errors**
- [ ] **All new dependencies resolve correctly**
- [ ] **CSS Modules type generation works**

## Success Criteria
- [ ] All new dependencies installed and compatible
- [ ] Development server runs with Turbopack
- [ ] TypeScript types resolve correctly for new libraries
- [ ] CSS Modules working with type generation
- [ ] Bundle size remains reasonable (<1MB initial load)
- [ ] No security vulnerabilities in dependencies
- [ ] All development scripts functional

## Risks & Mitigation
- **Risk**: Version conflicts between dependencies
  - **Mitigation**: Use exact versions, test compatibility
- **Risk**: Bundle size increase
  - **Mitigation**: Bundle analysis, tree shaking optimization
- **Risk**: Development server performance degradation
  - **Mitigation**: Turbopack usage, incremental migration

## Dependencies
- Must coordinate with FRONTEND_UI_redesign.md for library usage
- Should precede DATABASE_ARCHITECT_schema_migration.md implementation
- Links to BACKEND_API_restructure.md for validation library updates