# Story 1.3: Design System Foundation and Base Components

Status: review

## Story

As a developer,
I want a complete set of themed, accessible base components and design tokens,
so that all views can be built with a consistent visual language and behavior.

## Acceptance Criteria

1. **Given** the frontend package **When** I inspect the Tailwind v4.2 configuration **Then** @theme tokens are defined for: surface colors (gray-950 base, gray-900 cards, gray-800 elevated, gray-700 borders), semantic colors (success #22c55e, error #ef4444, warning #f59e0b, info #3b82f6), text colors (gray-100 primary, gray-400 secondary, white emphasis)

2. **Given** the design system is configured **When** I inspect the font setup **Then** JetBrains Mono is loaded via @fontsource/jetbrains-mono (weights 400/700, ligatures OFF) and Inter/system sans-serif is the default UI font

3. **Given** the base components are implemented **When** I import and render each component **Then** all 13 base components are available: AppButton, AppInput, AppTabs, AppBadge, AppCard, AppSelect, SearchableSelect, ConfirmDialog, ToastContainer, ConnectionBadge, EmptyState, LoadingSpinner, TypeBadge

4. **Given** any interactive base component is rendered **When** I navigate with keyboard (Tab, Enter, Space, Esc, arrow keys) **Then** the component has a visible focus ring (ring-2 ring-info) and responds to the appropriate keyboard interactions

5. **Given** the useToast composable is implemented **When** I call useToast().show({ type: 'success', message: 'Test' }) **Then** a toast notification appears in the ToastContainer, auto-dismisses after 5 seconds, and supports error toasts that persist until dismissed

## Tasks / Subtasks

- [x] Task 1: Install design system dependencies (AC: #1, #2)
  - [x] Install Tailwind CSS v4.2 and @tailwindcss/vite plugin
  - [x] Install @headlessui/vue (TabGroup, Listbox, Combobox, Dialog)
  - [x] Install lucide-vue-next (tree-shakeable icons)
  - [x] Install @fontsource/jetbrains-mono (weights 400, 700)
  - [x] Verify all packages resolve in frontend workspace

- [x] Task 2: Configure Tailwind dark theme with @theme design tokens (AC: #1, #2)
  - [x] Create `frontend/src/assets/main.css` with Tailwind v4 `@import "tailwindcss"` and `@theme` block
  - [x] Define surface color tokens: `--color-surface-base: #030712` (gray-950), `--color-surface-card: #111827` (gray-900), `--color-surface-elevated: #1f2937` (gray-800), `--color-surface-border: #374151` (gray-700)
  - [x] Define semantic color tokens: `--color-success: #22c55e`, `--color-error: #ef4444`, `--color-warning: #f59e0b`, `--color-info: #3b82f6`
  - [x] Define text color tokens: `--color-text-primary: #f3f4f6` (gray-100), `--color-text-secondary: #9ca3af` (gray-400), `--color-text-emphasis: #ffffff`
  - [x] Define graph node 8-color palette: `--color-node-0` through `--color-node-7` (#3b82f6, #8b5cf6, #f59e0b, #10b981, #ec4899, #06b6d4, #f97316, #84cc16)
  - [x] Configure font-family: Inter/system sans-serif as `--font-sans`, JetBrains Mono as `--font-mono`
  - [x] Import `@fontsource/jetbrains-mono/400.css` and `@fontsource/jetbrains-mono/700.css` in main.css
  - [x] Add global CSS: `font-feature-settings: "liga" 0` on `.font-mono` to disable ligatures
  - [x] Set body defaults: `bg-surface-base text-text-primary font-sans`
  - [x] Register `@tailwindcss/vite` plugin in `frontend/vite.config.ts`

- [x] Task 3: Create base components — AppButton, AppInput, AppBadge, AppCard, LoadingSpinner, EmptyState, TypeBadge (AC: #3, #4)
  - [x] Create `frontend/src/components/common/` directory
  - [x] **AppButton.vue** — Props: `variant` (primary/secondary/danger), `loading` (boolean), `disabled` (boolean). Primary: bg-info hover:bg-info/80. Secondary: bg-surface-elevated hover:bg-surface-border. Danger: bg-error hover:bg-error/80. Loading state shows LoadingSpinner inline, disables click. Focus: ring-2 ring-info.
  - [x] **AppInput.vue** — Props: `modelValue`, `monospace` (boolean), `error` (string). Emits: `update:modelValue`. Dark input: bg-surface-card border-surface-border. Monospace variant applies font-mono. Error state: border-error + error message with `aria-describedby` pointing to error element id. Focus: ring-2 ring-info.
  - [x] **AppBadge.vue** — Props: `variant` (success/error/warning/info), `label` (string for aria-label). Renders small pill with semantic bg color at 20% opacity + text in full semantic color. Includes `aria-label` prop.
  - [x] **AppCard.vue** — Props: `title` (optional string). Wrapper div: bg-surface-card border border-surface-border rounded-lg p-4. Optional header with title in text-text-emphasis.
  - [x] **LoadingSpinner.vue** — Props: `size` ('sm' | 'md' | 'lg'), `fullView` (boolean). Inline: animated spinning circle icon (Loader2 from lucide). Full-view: centered in parent with backdrop.
  - [x] **EmptyState.vue** — Props: `icon` (component), `message` (string), `actionLabel` (optional string). Emits: `action`. Centered layout with muted icon, message text, optional AppButton.
  - [x] **TypeBadge.vue** — Props: `typeName` (string). Computes `hash(typeName) % 8` to index into node color palette. Renders pill with deterministic bg color at 20% opacity + text in full node color. Hash function: simple string char-code sum.

- [x] Task 4: Create Headless UI components — AppTabs, AppSelect, SearchableSelect, ConfirmDialog (AC: #3, #4)
  - [x] **AppTabs.vue** — Props: `tabs` (array of { key, label }), `modelValue` (selected key). Emits: `update:modelValue`. Uses Headless UI `TabGroup`, `TabList`, `Tab`, `TabPanels`, `TabPanel`. Arrow key navigation handled by Headless UI. Active tab: border-b-2 border-info text-text-emphasis. Inactive: text-text-secondary. Focus: ring-2 ring-info.
  - [x] **AppSelect.vue** — Props: `modelValue`, `options` (array of { value, label }), `placeholder`. Emits: `update:modelValue`. Uses Headless UI `Listbox`, `ListboxButton`, `ListboxOptions`, `ListboxOption`. For lists with < 10 items. Focus: ring-2 ring-info.
  - [x] **SearchableSelect.vue** — Props: `modelValue`, `options` (array of { value, label }), `placeholder`. Emits: `update:modelValue`. Uses Headless UI `Combobox`, `ComboboxInput`, `ComboboxOptions`, `ComboboxOption`. Type-to-filter behavior. For lists with >= 10 items. Focus: ring-2 ring-info.
  - [x] **ConfirmDialog.vue** — Props: `open` (boolean), `title` (string), `message` (string), `confirmLabel` (string), `variant` ('danger' | 'info'). Emits: `confirm`, `cancel`. Uses Headless UI `Dialog`, `DialogPanel`, `DialogTitle`. Focus trap and `aria-modal` handled by Headless UI. Confirm button uses AppButton with matching variant. Cancel button uses AppButton secondary.

- [x] Task 5: Create ConnectionBadge component (AC: #3)
  - [x] **ConnectionBadge.vue** — Props: `status` ('connected' | 'error' | 'disconnected'). Connected: green dot + "Connected" text. Error: red dot + "Connection Error". Disconnected: gray dot + "Not Connected". Uses AppBadge internally for color variants.

- [x] Task 6: Create useToast composable + ToastContainer component (AC: #5)
  - [x] **frontend/src/composables/useToast.ts** — Singleton reactive state (array of toasts). `show({ type, message })` adds toast with unique id. Success toasts auto-dismiss after 5000ms via setTimeout. Error toasts persist until `dismiss(id)` called. Returns `{ show, dismiss, toasts }`.
  - [x] **ToastContainer.vue** — Renders in bottom-right corner (`fixed bottom-4 right-4 z-50 flex flex-col gap-2`). Each toast: bg-surface-elevated border-l-4 with semantic border color. Close button on each toast. `aria-live="polite"` on container. TransitionGroup for enter/leave animations.
  - [x] Export barrel: `frontend/src/composables/index.ts`

- [x] Task 7: Tests for base components and useToast (AC: #1-5)
  - [x] **frontend/src/components/common/__tests__/AppButton.spec.ts** — Test: renders with variants, emits click, loading state disables click, disabled state
  - [x] **frontend/src/components/common/__tests__/AppInput.spec.ts** — Test: v-model binding, monospace class applied, error message rendered with aria-describedby
  - [x] **frontend/src/components/common/__tests__/AppBadge.spec.ts** — Test: renders all 4 variants, aria-label applied
  - [x] **frontend/src/components/common/__tests__/TypeBadge.spec.ts** — Test: same typeName always produces same color, different names can produce different colors
  - [x] **frontend/src/components/common/__tests__/ToastContainer.spec.ts** — Test: toast appears on show(), success auto-dismisses (use vi.useFakeTimers), error persists, dismiss removes toast
  - [x] **frontend/src/composables/__tests__/useToast.spec.ts** — Test: show adds to toasts array, dismiss removes by id, singleton behavior across calls

## Dev Notes

### Architecture Compliance

- **Tailwind v4.2:** Use `@theme` block in CSS for design tokens — NOT `tailwind.config.js` (Tailwind v4 uses CSS-first configuration). [Source: architecture.md]
- **Headless UI:** @headlessui/vue handles ARIA attributes, focus traps, keyboard navigation. Do NOT reimplement these behaviors manually. [Source: architecture.md#Component Library Strategy]
- **Component naming:** PascalCase `.vue` files in `frontend/src/components/common/`. [Source: architecture.md#Frontend File Structure]
- **No component CSS files:** All styling via inline Tailwind utility classes. No `<style>` blocks in SFCs unless absolutely necessary. [Source: architecture.md]
- **Icons:** Import individual icons from `lucide-vue-next` (e.g., `import { Loader2 } from 'lucide-vue-next'`). Tree-shakeable, do NOT import the entire library. [Source: architecture.md]
- **Tests:** Co-located in `__tests__/` directories adjacent to source. Use Vitest 4.1.2 + @vue/test-utils. [Source: architecture.md#Testing Strategy]

### Critical Technical Details

- **Tailwind v4 @theme syntax:** Tokens defined as CSS custom properties inside `@theme { }` block — NOT in a JS config file. Example: `@theme { --color-success: #22c55e; }`
- **JetBrains Mono ligatures OFF:** Must add `font-feature-settings: "liga" 0` globally for `.font-mono` elements. This prevents code ligatures that reduce readability in authorization model text.
- **TypeBadge hash function:** Simple deterministic hash — sum of char codes modulo 8. Must be pure (no randomness) so the same type name always gets the same color.
- **useToast singleton:** Use module-level `reactive()` state so all components share the same toast queue. The composable returns a reference to this shared state.
- **Toast auto-dismiss timing:** `setTimeout(5000)` for success/warning/info. Error toasts have NO timeout — they require explicit user dismiss. Store timeout IDs to clear on manual dismiss.
- **Focus ring consistency:** All interactive components must apply `focus:ring-2 focus:ring-info focus:outline-none` (or `focus-visible:` variant).
- **Contrast ratios:** All text on dark backgrounds must meet WCAG AA (4.5:1 minimum). The defined token colors are pre-validated against gray-950/gray-900 backgrounds.

### File Structure

```
frontend/
  src/
    assets/
      main.css                          # Tailwind v4 imports + @theme tokens + font imports
    components/
      common/
        AppButton.vue
        AppInput.vue
        AppTabs.vue
        AppBadge.vue
        AppCard.vue
        AppSelect.vue
        SearchableSelect.vue
        ConfirmDialog.vue
        ToastContainer.vue
        ConnectionBadge.vue
        EmptyState.vue
        LoadingSpinner.vue
        TypeBadge.vue
        __tests__/
          AppButton.spec.ts
          AppInput.spec.ts
          AppBadge.spec.ts
          TypeBadge.spec.ts
          ToastContainer.spec.ts
    composables/
      useToast.ts
      index.ts
      __tests__/
        useToast.spec.ts
  vite.config.ts                        # Add @tailwindcss/vite plugin
```

### What NOT to Do

- Do **NOT** create layout components (AppHeader, AppSidebar) — that is Story 1.4
- Do **NOT** create Vue Router routes — that is Story 1.4
- Do **NOT** create the useApi composable — that is Story 1.4
- Do **NOT** create Pinia stores — those come in later stories
- Do **NOT** install Vue Flow, TanStack Table, or Shiki — later stories
- Do **NOT** create a `tailwind.config.js` — Tailwind v4 uses CSS-first config via `@theme`
- Do **NOT** manually implement focus traps or ARIA for Headless UI components — the library handles it
- Do **NOT** use `<style scoped>` blocks — use inline Tailwind classes only

### References

- Tailwind CSS v4 theme configuration: https://tailwindcss.com/docs/theme
- Headless UI Vue: https://headlessui.com/v1/vue
- Lucide Vue Next: https://lucide.dev/guide/packages/lucide-vue-next
- @fontsource/jetbrains-mono: https://fontsource.org/fonts/jetbrains-mono

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- tailwindcss 4.2.2, @tailwindcss/vite 4.2.2, @headlessui/vue 1.7.23, lucide-vue-next 0.511.0, @fontsource/jetbrains-mono 5.2.8 installed
- Tailwind v4 CSS-first config via @theme block in main.css confirmed (no tailwind.config.js)
- @tailwindcss/vite plugin registered in vite.config.ts before @vitejs/plugin-vue
- vitest merges with viteConfig — @/ alias resolves correctly in tests
- 38 frontend tests pass across 7 files in 3.63s
- Pre-existing HelloWorld test: no regressions

### Completion Notes List

- Tailwind v4 @theme tokens: surface colors, semantic colors, text colors, 8-node graph palette, font families
- JetBrains Mono imported via @fontsource, ligatures disabled via font-feature-settings on .font-mono
- body defaults set: bg-surface-base text-text-primary font-sans
- AppButton: 3 variants (primary/secondary/danger), loading spinner, disabled state, focus ring
- AppInput: v-model, monospace, error with aria-describedby
- AppBadge: 4 semantic variants at 20% bg opacity
- AppCard: optional title header
- LoadingSpinner: Loader2 from lucide, 3 sizes, fullView mode
- EmptyState: icon + message + optional action button
- TypeBadge: deterministic char-code-sum hash % 8 → node color palette
- AppTabs: Headless UI TabGroup, arrow key navigation, v-model
- AppSelect: Headless UI Listbox, ChevronDown + Check icons
- SearchableSelect: Headless UI Combobox, type-to-filter
- ConfirmDialog: Headless UI Dialog, focus trap, danger/info variants
- ConnectionBadge: colored dot + label for connected/error/disconnected states
- useToast: module-level singleton reactive state, 5s auto-dismiss for non-error, timeout cleared on dismiss
- ToastContainer: fixed bottom-right, TransitionGroup animations, aria-live="polite"
- composables/index.ts barrel export

### Change Log

- 2026-03-26: Story implemented — all 7 tasks complete, 38 tests passing

### File List

- frontend/package.json (modified — added tailwindcss, @tailwindcss/vite, @headlessui/vue, lucide-vue-next, @fontsource/jetbrains-mono)
- frontend/vite.config.ts (modified — added @tailwindcss/vite plugin)
- frontend/src/assets/main.css (modified — replaced with Tailwind v4 @theme config + font imports)
- frontend/src/components/common/AppButton.vue (new)
- frontend/src/components/common/AppInput.vue (new)
- frontend/src/components/common/AppBadge.vue (new)
- frontend/src/components/common/AppCard.vue (new)
- frontend/src/components/common/AppTabs.vue (new)
- frontend/src/components/common/AppSelect.vue (new)
- frontend/src/components/common/SearchableSelect.vue (new)
- frontend/src/components/common/ConfirmDialog.vue (new)
- frontend/src/components/common/ToastContainer.vue (new)
- frontend/src/components/common/ConnectionBadge.vue (new)
- frontend/src/components/common/EmptyState.vue (new)
- frontend/src/components/common/LoadingSpinner.vue (new)
- frontend/src/components/common/TypeBadge.vue (new)
- frontend/src/components/common/__tests__/AppButton.spec.ts (new)
- frontend/src/components/common/__tests__/AppInput.spec.ts (new)
- frontend/src/components/common/__tests__/AppBadge.spec.ts (new)
- frontend/src/components/common/__tests__/TypeBadge.spec.ts (new)
- frontend/src/components/common/__tests__/ToastContainer.spec.ts (new)
- frontend/src/composables/useToast.ts (new)
- frontend/src/composables/index.ts (new)
- frontend/src/composables/__tests__/useToast.spec.ts (new)
