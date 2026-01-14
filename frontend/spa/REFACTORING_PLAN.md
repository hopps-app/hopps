# Frontend SPA Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring plan for the Hopps frontend SPA application. The analysis identified **84 total dependencies**, **94+ component files**, and several critical areas requiring attention including i18n violations, large components, missing error boundaries, performance issues, and accessibility gaps.

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Critical Issues](#critical-issues)
3. [Architectural Improvements](#architectural-improvements)
4. [Phase 1: Foundation & Quick Wins](#phase-1-foundation--quick-wins)
5. [Phase 2: Component Architecture](#phase-2-component-architecture)
6. [Phase 3: State Management & Data Fetching](#phase-3-state-management--data-fetching)
7. [Phase 4: Testing Infrastructure](#phase-4-testing-infrastructure)
8. [Phase 5: Performance Optimization](#phase-5-performance-optimization)
9. [Phase 6: Accessibility & UX](#phase-6-accessibility--ux)
10. [File-by-File Refactoring Priority](#file-by-file-refactoring-priority)

---

## Current State Assessment

### Strengths
- **TypeScript**: Strict mode enabled with ~99% type coverage
- **Modern Stack**: React 18.3.1, Vite 6.3.6, TailwindCSS 3.4.14
- **Form Handling**: React Hook Form + Zod validation is industry standard
- **i18n Infrastructure**: i18next properly configured with de/en/uk locales
- **Path Aliases**: Consistent `@/` import pattern throughout
- **State Management**: Zustand is lightweight and appropriate for the app size

### Weaknesses
- **Test Coverage**: Only 5 test files for 94+ components
- **i18n Compliance**: 25+ hardcoded string violations
- **Large Components**: 4 components exceed 200 lines (up to 601 lines)
- **Error Handling**: No React Error Boundaries
- **Accessibility**: Missing ARIA labels, keyboard navigation gaps
- **Performance**: Missing/ineffective memoization patterns
- **React Query**: Installed but completely unused
- **Dependencies**: Redundant packages (moment + date-fns)

---

## Critical Issues

### 1. i18n Violations (CRITICAL)
**Impact**: User-facing text not translatable, violates project requirements

| File | Issue Count |
|------|-------------|
| `OrganizationRegistrationForm.tsx` | 12 hardcoded strings |
| `ReceiptUploadView.tsx` | 20+ hardcoded strings (German) |
| `ReceiptsList.tsx` | 1 hardcoded string |
| `InvoiceUploadFormBommelSelector.tsx` | 1 hardcoded string |

### 2. Missing Error Boundaries (HIGH)
**Impact**: Component crashes can break entire application

- No `ErrorBoundary` component exists
- Multiple `console.error()` calls with no UI feedback
- Unhandled promise rejections

### 3. Large Components (HIGH)
**Impact**: Hard to maintain, test, and extend

| Component | Lines | Issues |
|-----------|-------|--------|
| `BommelTreeComponent.tsx` | 601 | Mixed concerns, inline styles, nested components |
| `OrganizationSettingsView.tsx` | 451 | Multiple API calls, complex state |
| `ReceiptUploadView.tsx` | 308 | 10+ state variables, hardcoded values |
| `OrganizationTreeNode.tsx` | 271 | Editing, deletion, dialogs combined |

### 4. Disabled ESLint Rules (HIGH)
**Impact**: Hook dependency bugs can cause stale closures and infinite loops

```javascript
// eslint.config.mjs - DANGEROUS
'react-hooks/exhaustive-deps': 'off'
```

---

## Architectural Improvements

### Proposed Directory Structure

```
src/
├── app/                          # Application shell
│   ├── providers/                # Context providers (Auth, Theme, Toast)
│   ├── routes/                   # Route definitions
│   └── App.tsx
│
├── components/
│   ├── ui/                       # Base UI components (unchanged)
│   └── common/                   # Shared composite components
│       ├── ErrorBoundary/
│       ├── LoadingState/
│       └── EmptyState/
│
├── features/                     # Feature-based modules
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── organization/
│   │   ├── components/
│   │   │   ├── OrganizationTree/
│   │   │   └── OrganizationSettings/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── receipts/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── categories/
│   └── invoices/
│
├── hooks/                        # Global shared hooks
├── lib/                          # Utilities
├── locales/                      # i18n (unchanged)
├── services/                     # Core services (API, Theme)
├── store/                        # Zustand stores
└── types/                        # Global type definitions
```

### Key Architectural Changes

1. **Feature-Based Organization**: Group related components, hooks, and services by domain
2. **Separation of Concerns**: Extract business logic from components into hooks/services
3. **Error Boundary Hierarchy**: Global + feature-level error boundaries
4. **Data Fetching Layer**: Introduce React Query for server state management

---

## Phase 1: Foundation & Quick Wins

### 1.1 Fix ESLint Configuration
**Priority**: CRITICAL | **Effort**: Small

```javascript
// eslint.config.mjs - REQUIRED CHANGES
export default [
  // ... existing config
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn', // Enable hook dependency checking
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-types': 'warn',
    }
  }
];
```

**Add missing plugins:**
```bash
pnpm add -D eslint-plugin-react eslint-plugin-jsx-a11y
```

### 1.2 Remove Redundant Dependencies
**Priority**: HIGH | **Effort**: Small

```bash
# Remove moment.js (date-fns is already used)
pnpm remove moment

# Move eslint-plugin-import to devDependencies
pnpm remove eslint-plugin-import
pnpm add -D eslint-plugin-import

# Update React Hook Form resolver
pnpm add @hookform/resolvers@^7.0.0
```

### 1.3 Add Error Boundary Component
**Priority**: HIGH | **Effort**: Small

Create `src/components/common/ErrorBoundary/ErrorBoundary.tsx`:

```typescript
import React, { Component, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // TODO: Send to error tracking service
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error }: { error?: Error }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div role="alert" className="p-4 text-center">
      <h2 className="text-lg font-semibold text-destructive">
        {t('errors.boundary.title')}
      </h2>
      <p className="text-muted-foreground">{t('errors.boundary.description')}</p>
      {error && (
        <pre className="mt-2 text-sm text-muted-foreground">
          {error.message}
        </pre>
      )}
    </div>
  );
}

export default ErrorBoundaryClass;
```

### 1.4 Add Missing Translation Keys
**Priority**: CRITICAL | **Effort**: Medium

**Files to update:**
- `src/locales/de/translation.json`
- `src/locales/en/translation.json`

**Required keys:**

```json
{
  "errors": {
    "boundary": {
      "title": "Something went wrong",
      "description": "Please try again or contact support"
    }
  },
  "validation": {
    "required": "This field is required",
    "email": "Please enter a valid email address",
    "passwordMin": "Password must be at least 8 characters",
    "passwordMatch": "Passwords do not match"
  },
  "organization": {
    "registration": {
      "organizationName": "Organization name",
      "firstName": "First name",
      "lastName": "Last name",
      "email": "Email address",
      "password": "Password",
      "confirmPassword": "Confirm password"
    }
  },
  "receipts": {
    "upload": {
      "invalidFileType": "Invalid file type",
      "uploadSuccess": "Receipt uploaded successfully",
      "uploadFailed": "Upload failed",
      "receiptNumber": "Receipt number",
      "receiptDate": "Receipt date",
      "unpaid": "Unpaid",
      "contractPartner": "Contract partner",
      "dueDate": "Due date",
      "category": "Category",
      "area": "Area",
      "tags": "Tags",
      "taxAmount": "Tax amount",
      "netAmount": "Net amount",
      "autoRead": "Automatic reading",
      "cancel": "Cancel",
      "saveAsDraft": "Save as draft"
    },
    "areas": {
      "ideell": "Non-profit area",
      "zweckbetrieb": "Purpose operation",
      "vermoegensverwaltung": "Asset management",
      "wirtschaftlich": "Commercial operation"
    },
    "types": {
      "einnahme": "Income",
      "ausgabe": "Expense"
    },
    "empty": "No receipts found"
  },
  "bommel": {
    "empty": "No Bommel found"
  }
}
```

### 1.5 Create Environment Example File
**Priority**: MEDIUM | **Effort**: Small

Create `src/.env.example`:

```bash
# API Configuration
VITE_API_ORG_URL=http://localhost:8101

# Keycloak Configuration
VITE_KEYCLOAK_URL=http://localhost:8092
VITE_KEYCLOAK_REALM=hopps
VITE_KEYCLOAK_CLIENT_ID=hopps-spa

# Feature Flags (optional)
VITE_ENABLE_ANALYTICS=false
```

---

## Phase 2: Component Architecture

### 2.1 Refactor BommelTreeComponent (601 lines)
**Priority**: HIGH | **Effort**: Large

**Current Issues:**
- 30+ inline style objects
- Nested component definitions inside render
- Mixed presentation and business logic
- Accessibility violations

**Target Structure:**

```
src/features/organization/components/OrganizationTree/
├── index.ts
├── OrganizationTree.tsx           # Main container
├── TreeNode/
│   ├── TreeNode.tsx               # Node presentation
│   ├── TreeNodeCard.tsx           # Card UI
│   ├── TreeNodeActions.tsx        # Edit/Delete buttons
│   └── TreeNodeEditForm.tsx       # Inline edit form
├── hooks/
│   ├── useTreeNavigation.ts       # Collapse/expand logic
│   ├── useTreeMutations.ts        # CRUD operations
│   └── useTreeDragDrop.ts         # DnD functionality
├── styles/
│   └── tree.css                   # Extracted CSS
└── types.ts
```

**Refactoring Steps:**

1. **Extract inline styles to CSS/Tailwind classes**
   ```typescript
   // Before
   style={{ display: 'flex', alignItems: 'center', gap: '8px' }}

   // After
   className="flex items-center gap-2"
   ```

2. **Extract nested components**
   ```typescript
   // Before: NodeCard defined inside BommelTreeComponent
   // After: Separate TreeNodeCard.tsx file
   ```

3. **Extract business logic to hooks**
   ```typescript
   // useTreeMutations.ts
   export function useTreeMutations(organizationId: number) {
     const { showSuccess, showError } = useToast();
     const { t } = useTranslation();

     const createNode = useMutation({
       mutationFn: (data: CreateBommelInput) =>
         apiService.orgService.bommelPOST(data),
       onSuccess: () => showSuccess(t('bommel.created')),
       onError: () => showError(t('bommel.createFailed')),
     });

     return { createNode, updateNode, deleteNode };
   }
   ```

4. **Add accessibility attributes**
   ```typescript
   <button
     aria-label={t('bommel.actions.expand')}
     aria-expanded={isExpanded}
     onClick={toggleExpand}
   >
     <ChevronDown className={cn('transition-transform', isExpanded && 'rotate-180')} />
   </button>
   ```

### 2.2 Refactor OrganizationSettingsView (451 lines)
**Priority**: HIGH | **Effort**: Medium

**Target Structure:**

```
src/features/organization/components/OrganizationSettings/
├── index.ts
├── OrganizationSettingsView.tsx   # Page container
├── SettingsHeader.tsx             # Title, description
├── SettingsTabs.tsx               # Tab navigation
├── tabs/
│   ├── StructureTab.tsx           # Tree management
│   ├── MembersTab.tsx             # Member management
│   └── GeneralTab.tsx             # General settings
└── hooks/
    └── useOrganizationSettings.ts # Data fetching
```

### 2.3 Refactor ReceiptUploadView (308 lines)
**Priority**: HIGH | **Effort**: Medium

**Issues to Fix:**
- Hardcoded bommelId (54) on line 159
- 20+ hardcoded German strings
- Empty `saveDraft` function
- Orphaned debug code

**Target Structure:**

```
src/features/receipts/components/ReceiptUpload/
├── index.ts
├── ReceiptUploadView.tsx          # Page container
├── ReceiptForm/
│   ├── ReceiptForm.tsx            # Form container
│   ├── ReceiptFormFields.tsx      # Form fields
│   ├── ReceiptFormDropzone.tsx    # File upload
│   └── ReceiptFormActions.tsx     # Submit buttons
├── hooks/
│   ├── useReceiptForm.ts          # Form state
│   └── useReceiptUpload.ts        # Upload logic
└── types.ts
```

### 2.4 Create Reusable Components
**Priority**: MEDIUM | **Effort**: Medium

**EmptyState Component:**

```typescript
// src/components/common/EmptyState/EmptyState.tsx
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ComponentType<{ className?: string }>;
}

export function EmptyState({ title, description, action, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="h-12 w-12 text-muted-foreground mb-4" />}
      <h3 className="text-lg font-medium">{title}</h3>
      {description && <p className="text-muted-foreground mt-1">{description}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

**LoadingState Component:**

```typescript
// src/components/common/LoadingState/LoadingState.tsx
interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({ message, fullScreen }: LoadingStateProps) {
  const { t } = useTranslation();

  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      fullScreen && 'min-h-screen'
    )}>
      <Spinner className="h-8 w-8 animate-spin" />
      <p className="text-muted-foreground mt-2">
        {message ?? t('common.loading')}
      </p>
    </div>
  );
}
```

---

## Phase 3: State Management & Data Fetching

### 3.1 Introduce React Query for Server State
**Priority**: HIGH | **Effort**: Medium

React Query is already installed but unused. Implement it for:
- Automatic caching
- Background refetching
- Loading/error states
- Optimistic updates

**Setup:**

```typescript
// src/app/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**Example Query Hook:**

```typescript
// src/features/categories/hooks/useCategories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/ApiService';

export const categoryKeys = {
  all: ['categories'] as const,
  detail: (id: number) => ['categories', id] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: () => apiService.orgService.categoryAll(),
  });
}

export function useCategory(id: number) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => apiService.orgService.categoryGET(id),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: CreateCategoryInput) =>
      apiService.orgService.categoryPOST(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      showSuccess(t('categories.created'));
    },
    onError: () => {
      showError(t('categories.createFailed'));
    },
  });
}
```

### 3.2 Refine Zustand Store Structure
**Priority**: MEDIUM | **Effort**: Small

Keep Zustand for:
- UI state (sidebar open/closed, modals)
- User session state
- Organization context

Move to React Query:
- Categories list
- Bommels/tree data
- Receipts/invoices
- Any server-fetched data

**Refined Store Structure:**

```typescript
// src/store/uiStore.ts
interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
}

interface UIActions {
  toggleSidebar: () => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState & UIActions>()(
  devtools((set) => ({
    sidebarOpen: true,
    activeModal: null,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    openModal: (modal) => set({ activeModal: modal }),
    closeModal: () => set({ activeModal: null }),
  }))
);
```

```typescript
// src/store/authStore.ts - Keep as-is but rename for clarity
export const useAuthStore = create<AuthState & AuthActions>()(
  devtools((set) => ({
    isAuthenticated: false,
    isInitialized: false,
    user: null,
    organization: null,
    // ... actions
  }))
);
```

### 3.3 Remove Bommels Store (Replace with React Query)
**Priority**: MEDIUM | **Effort**: Medium

**Before:**
```typescript
// Manual fetching with loading states
const { rootBommel, allBommels, isLoading, loadBommels } = useBommelsStore();
```

**After:**
```typescript
// React Query manages all state
const { data: bommels, isLoading, error } = useBommels(organizationId);
```

---

## Phase 4: Testing Infrastructure

### 4.1 Establish Testing Standards
**Priority**: HIGH | **Effort**: Medium

**Test File Naming:**
```
ComponentName.tsx
ComponentName.test.tsx      # Unit tests
ComponentName.integration.test.tsx  # Integration tests (if needed)
```

**Test Structure:**

```typescript
// Example: CategoryForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CategoryForm } from './CategoryForm';

// Mock dependencies
vi.mock('@/services/ApiService', () => ({
  default: {
    orgService: {
      categoryPOST: vi.fn(),
    },
  },
}));

describe('CategoryForm', () => {
  describe('rendering', () => {
    it('renders form fields correctly', () => {
      render(<CategoryForm onSuccess={vi.fn()} />);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows error when name is empty', async () => {
      const user = userEvent.setup();
      render(<CategoryForm onSuccess={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    });
  });

  describe('submission', () => {
    it('calls API and onSuccess when form is valid', async () => {
      const onSuccess = vi.fn();
      const user = userEvent.setup();
      render(<CategoryForm onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText(/name/i), 'Test Category');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });
});
```

### 4.2 Priority Test Coverage
**Priority**: HIGH | **Effort**: Large

**Critical Path Tests (Phase 1):**
1. `AuthGuard.test.tsx` - Authentication flow
2. `OrganizationRegistrationForm.test.tsx` - Registration
3. `CategoryForm.test.tsx` - Category CRUD
4. `ReceiptUploadView.test.tsx` - Receipt upload flow

**Core Component Tests (Phase 2):**
5. `BommelTreeComponent.test.tsx` - Tree operations
6. `InvoicesTable.test.tsx` - Table interactions
7. `useToast.test.ts` - Toast notifications
8. `useDebounce.test.ts` - Debounce hook

**Integration Tests (Phase 3):**
9. `Dashboard.integration.test.tsx` - Full dashboard flow
10. `OrganizationSettings.integration.test.tsx` - Settings flow

### 4.3 Test Utilities
**Priority**: MEDIUM | **Effort**: Small

```typescript
// src/test/utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/locales/i18n';

function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
```

### 4.4 Adjust Coverage Thresholds
**Priority**: LOW | **Effort**: Small

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    statements: 60,  // Reduced from 80% initially
    branches: 60,
    functions: 60,
    lines: 60,
  },
}
```

---

## Phase 5: Performance Optimization

### 5.1 Fix Memoization Issues
**Priority**: HIGH | **Effort**: Medium

**File: `useUploadForm.ts`**

```typescript
// Before - Dependencies incomplete
const onFilesChanged = useCallback((newFiles: File[]) => {
  // Uses fileProgress, selectedFiles
}, [fileProgress, selectedFiles]); // These change every render!

// After - Use refs for values that shouldn't trigger re-creation
const onFilesChanged = useCallback((newFiles: File[]) => {
  // Implementation
}, []); // Or use functional state updates
```

**File: `BommelCellRenderer.tsx`**

```typescript
// Before - Missing dependency
const onKeyPressPopover = useCallback((e: KeyboardEvent) => {
  if (e.key === 'Escape') setIsPopoverVisible(false);
}, [isPopoverVisible]); // 'node' referenced but not in deps

// After - Include all dependencies
const onKeyPressPopover = useCallback((e: KeyboardEvent) => {
  if (e.key === 'Escape') setIsPopoverVisible(false);
}, [node.id]); // Or extract node.id to avoid object dependency
```

### 5.2 Remove forceUpdate Anti-Pattern
**Priority**: HIGH | **Effort**: Medium

**File: `BommelTreeComponent.tsx`**

```typescript
// Before - Anti-pattern
const [, forceUpdate] = useReducer(x => x + 1, 0);
// ...
await someApiCall();
forceUpdate({}); // Forces full re-render

// After - Use proper state or React Query
const queryClient = useQueryClient();
// ...
await someApiCall();
queryClient.invalidateQueries({ queryKey: ['bommels'] }); // Triggers refetch
```

### 5.3 Lazy Loading for Routes
**Priority**: MEDIUM | **Effort**: Small

```typescript
// src/app/routes/AppRoutes.tsx
import { lazy, Suspense } from 'react';
import { LoadingState } from '@/components/common/LoadingState';

const DashboardView = lazy(() => import('@/features/dashboard/DashboardView'));
const OrganizationSettingsView = lazy(() => import('@/features/organization/OrganizationSettingsView'));
const ReceiptUploadView = lazy(() => import('@/features/receipts/ReceiptUploadView'));

function LazyRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<LoadingState fullScreen />}>
      <Component />
    </Suspense>
  );
}

// Usage
<Route path="/dashboard/*" element={<LazyRoute component={DashboardView} />} />
```

### 5.4 AG Grid Performance
**Priority**: MEDIUM | **Effort**: Small

**File: `InvoicesTable.tsx`**

```typescript
// Before - Refreshes on every hover
onCellMouseOver: (event) => {
  api?.refreshCells({ force: true }); // Very expensive!
}

// After - Debounce or remove unnecessary refresh
const debouncedRefresh = useMemo(
  () => debounce(() => api?.refreshCells({ force: true }), 300),
  [api]
);

onCellMouseOver: (event) => {
  debouncedRefresh();
}
```

### 5.5 Bundle Optimization
**Priority**: LOW | **Effort**: Medium

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-popover'],
          query: ['@tanstack/react-query'],
          grid: ['ag-grid-react', 'ag-grid-community'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
```

---

## Phase 6: Accessibility & UX

### 6.1 Add ARIA Labels
**Priority**: HIGH | **Effort**: Medium

**File: `BommelTreeComponent.tsx`**

```typescript
// Before
<button onClick={toggleExpand}>
  <ChevronDown />
</button>

// After
<button
  onClick={toggleExpand}
  aria-label={isExpanded ? t('bommel.collapse') : t('bommel.expand')}
  aria-expanded={isExpanded}
>
  <ChevronDown aria-hidden="true" />
</button>
```

**File: `InvoiceUploadFormBommelSelector.tsx`**

```typescript
// Before - div acting as button
<div onClick={openPopover}>Select Bommel</div>

// After - Proper button element
<button
  type="button"
  onClick={openPopover}
  aria-haspopup="listbox"
  aria-expanded={isOpen}
  aria-label={t('bommel.select')}
>
  {selectedBommel?.name ?? t('bommel.selectPlaceholder')}
</button>
```

### 6.2 Keyboard Navigation
**Priority**: MEDIUM | **Effort**: Medium

**Tree Navigation:**
```typescript
// Add keyboard support to tree component
const handleKeyDown = (e: KeyboardEvent, node: TreeNode) => {
  switch (e.key) {
    case 'ArrowRight':
      if (!node.isExpanded) expandNode(node.id);
      break;
    case 'ArrowLeft':
      if (node.isExpanded) collapseNode(node.id);
      else if (node.parentId) focusNode(node.parentId);
      break;
    case 'ArrowDown':
      focusNextNode();
      break;
    case 'ArrowUp':
      focusPreviousNode();
      break;
    case 'Enter':
    case ' ':
      selectNode(node.id);
      break;
  }
};
```

### 6.3 Focus Management
**Priority**: MEDIUM | **Effort**: Small

```typescript
// After delete, focus previous item
const handleDelete = async (id: number) => {
  const previousIndex = items.findIndex(i => i.id === id) - 1;
  await deleteItem(id);

  if (previousIndex >= 0) {
    itemRefs.current[previousIndex]?.focus();
  }
};
```

### 6.4 Screen Reader Announcements
**Priority**: LOW | **Effort**: Small

```typescript
// src/hooks/useAnnounce.ts
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', priority);
    el.className = 'sr-only';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }, []);

  return announce;
}

// Usage
const announce = useAnnounce();
await createCategory(data);
announce(t('categories.createdAnnouncement'));
```

---

## File-by-File Refactoring Priority

### Critical Priority (Fix Immediately)

| File | Issues | Actions |
|------|--------|---------|
| `eslint.config.mjs` | Disabled hook rules | Enable `exhaustive-deps` |
| `OrganizationRegistrationForm.tsx` | 12 hardcoded strings | Add i18n keys |
| `ReceiptUploadView.tsx` | 20+ hardcoded strings, hardcoded ID | Add i18n, fix bommelId |

### High Priority (Phase 1-2)

| File | Lines | Issues | Actions |
|------|-------|--------|---------|
| `BommelTreeComponent.tsx` | 601 | Large, inline styles, nested components | Split into modules |
| `OrganizationSettingsView.tsx` | 451 | Multiple concerns | Extract tabs, hooks |
| `useUploadForm.ts` | - | Incomplete memoization | Fix dependencies |

### Medium Priority (Phase 3-4)

| File | Issues | Actions |
|------|--------|---------|
| `CategoryForm.tsx` | Console.error only | Add error boundary, user feedback |
| `InvoicesTable.tsx` | Performance on hover | Debounce refresh |
| `BommelCellRenderer.tsx` | Missing dependencies, a11y | Fix hooks, add ARIA |
| `InvoiceUploadFormBommelSelector.tsx` | Not keyboard accessible | Use button element |

### Low Priority (Phase 5-6)

| File | Issues | Actions |
|------|--------|---------|
| `ReceiptsList.tsx` | Hardcoded "No receipts found" | Add i18n key |
| `InvoiceUploadFormDropzone.tsx` | URL.createObjectURL cleanup | Improve cleanup logic |
| `App.tsx` | Commented React Query code | Clean up or implement |

---

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Fix ESLint configuration
- [ ] Remove redundant dependencies
- [ ] Create ErrorBoundary component
- [ ] Add all missing translation keys
- [ ] Create .env.example file

### Phase 2: Component Architecture (Week 3-5)
- [ ] Refactor BommelTreeComponent
- [ ] Refactor OrganizationSettingsView
- [ ] Refactor ReceiptUploadView
- [ ] Create EmptyState and LoadingState components
- [ ] Establish feature-based folder structure

### Phase 3: State Management (Week 6-7)
- [ ] Set up React Query provider
- [ ] Create query hooks for categories
- [ ] Create query hooks for bommels
- [ ] Create query hooks for receipts
- [ ] Remove bommels Zustand store

### Phase 4: Testing (Week 8-10)
- [ ] Create test utilities
- [ ] Write critical path tests
- [ ] Write core component tests
- [ ] Set up integration tests
- [ ] Adjust coverage thresholds

### Phase 5: Performance (Week 11-12)
- [ ] Fix all memoization issues
- [ ] Remove forceUpdate anti-pattern
- [ ] Implement route lazy loading
- [ ] Optimize AG Grid
- [ ] Configure bundle splitting

### Phase 6: Accessibility (Week 13-14)
- [ ] Add all ARIA labels
- [ ] Implement keyboard navigation for tree
- [ ] Add focus management
- [ ] Set up screen reader announcements
- [ ] Accessibility audit with axe-core

---

## Metrics & Success Criteria

### Code Quality Metrics
| Metric | Current | Target |
|--------|---------|--------|
| i18n Compliance | ~90% | 100% |
| TypeScript Coverage | 99% | 100% |
| Test Coverage | ~5% | 60% |
| Max Component Lines | 601 | 200 |
| ESLint Errors | - | 0 |

### Performance Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse Performance | TBD | >80 |
| First Contentful Paint | TBD | <1.5s |
| Bundle Size (main) | TBD | <200KB |
| Bundle Size (total) | TBD | <500KB |

### Accessibility Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse A11y | TBD | >90 |
| axe-core Violations | TBD | 0 critical |
| WCAG 2.1 AA | Partial | Full |

---

## Conclusion

This refactoring plan addresses the core architectural and quality issues in the Hopps frontend SPA. The phased approach allows for incremental improvements while maintaining application stability. Priority should be given to:

1. **i18n compliance** - Critical for internationalization requirements
2. **Error boundaries** - Prevent application crashes
3. **Large component refactoring** - Improve maintainability
4. **React Query adoption** - Simplify data fetching
5. **Test coverage** - Enable safe refactoring

Following this plan will result in a more maintainable, performant, and accessible application that follows React best practices.