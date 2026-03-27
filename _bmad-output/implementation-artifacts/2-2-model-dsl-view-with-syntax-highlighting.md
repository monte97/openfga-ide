# Story 2.2: Model DSL View with Syntax Highlighting

Status: done

## Story

As a user,
I want to view the authorization model as syntax-highlighted DSL code,
so that I can read and understand the model definition in a familiar code format.

## Acceptance Criteria

1. **Given** I navigate to the Model Viewer with a store that has a model **When** the DSL tab is active (default) **Then** I see the model DSL rendered with Shiki syntax highlighting, line numbers, and JetBrains Mono font in a dark theme

2. **Given** the DSL view is displayed **When** I click the "Copy" button **Then** the full DSL text is copied to my clipboard and a success toast confirms "DSL copied to clipboard"

3. **Given** I navigate to the Model Viewer with a store that has no model **When** the page loads **Then** I see an EmptyState with message "No authorization model loaded" and a "Go to Import/Export" action button

4. **Given** the model is loading **When** the API call is in progress **Then** I see a LoadingSpinner in the content area

5. **Given** no store is selected **When** I navigate to Model Viewer **Then** I see an EmptyState with message "Select or create a store to get started." and a "Go to Store Admin" link (pre-existing behavior from Story 1.6, must remain intact)

6. **Given** the API call to fetch the model fails **When** the error is returned **Then** a toast notification shows the error message and the DSL panel shows an EmptyState (no crash, no raw error text leaked to the UI)

7. **Given** the DSL view is displayed **When** I inspect the rendered markup **Then** the code block uses JetBrains Mono font, has a dark background (surface-elevated / gray-800), and has visible line numbers

## Tasks / Subtasks

- [x] Task 1: Install Shiki dependency (AC: #1, #7)
  - [x] Run `npm install shiki` in the `frontend/` package
  - [x] Verify Shiki v1+ (ESM-first, tree-shakeable) is installed — do NOT install the legacy v0.x package

- [x] Task 2: Create Pinia model store — `frontend/src/stores/model.ts` (AC: #1, #3, #4, #6)
  - [x] Define store with setup syntax: `loading: ref<boolean>(false)`, `error: ref<string | null>(null)`, `dsl: ref<string | null>(null)`, `json: ref<object | null>(null)`, `authorizationModelId: ref<string | null>(null)`
  - [x] Action `fetchModel(storeId: string)` — calls `api.get<ModelResponse>(\`stores/${storeId}/model\`)` via `useApi`, populates all refs; sets all to null on empty model (when `dsl` is null in response)
  - [x] On error: set `error.value = e.message`, leave dsl/json/authorizationModelId as null
  - [x] Reset all state (`dsl`, `json`, `authorizationModelId`, `error`) when `storeId` changes (watcher or explicit `reset()` action)
  - [x] Export TypeScript interface `ModelResponse { dsl: string | null; json: object | null; authorizationModelId: string | null }`
  - [x] Co-locate test file: `frontend/src/stores/model.test.ts`

- [x] Task 3: Create `ModelDslView.vue` component (AC: #1, #2, #3, #7)
  - [x] Create `frontend/src/components/model/ModelDslView.vue`
  - [x] Props: `dsl: string | null`
  - [x] If `dsl` is null or empty: render EmptyState (icon: `FileCode2`, message: "No authorization model loaded", actionLabel: "Go to Import/Export", actionTo: "/import-export")
  - [x] If `dsl` is present: render highlighted HTML from Shiki (see Critical Technical Details for Shiki setup)
  - [x] Render Shiki output inside a scrollable `<div>` with `overflow-auto`, `bg-surface-elevated`, `rounded-lg`, `p-4`, `font-mono text-sm`
  - [x] Show "Copy" button (use `AppButton` with variant `secondary`, icon: `Copy` from lucide-vue-next) positioned top-right relative to the code block
  - [x] Copy logic: `navigator.clipboard.writeText(props.dsl)`, on success `toast.show({ type: 'success', message: 'DSL copied to clipboard' })`, on failure `toast.show({ type: 'error', message: 'Failed to copy to clipboard' })`
  - [x] Co-locate test file: `frontend/src/components/model/ModelDslView.test.ts`

- [x] Task 4: Shiki syntax highlighting helper (AC: #1, #7)
  - [x] Create `frontend/src/composables/useShiki.ts`
  - [x] Exports `highlightDsl(code: string): Promise<string>` — lazily creates a Shiki highlighter (singleton, created once), uses the `openfga` language bundle (if available in Shiki's bundled languages) OR falls back to `yaml` (DSL is YAML-like), uses `github-dark` or `vitesse-dark` Shiki theme
  - [x] Return the raw HTML string from `highlighter.codeToHtml(code, { lang: 'openfga', theme: 'github-dark' })`
  - [x] If `openfga` is not a built-in Shiki language, use `'yaml'` as the fallback language — do NOT throw; log a console.warn
  - [x] The returned HTML is rendered via `v-html` inside `ModelDslView.vue`
  - [x] Shiki highlighter instance is cached in module scope (not re-created per component render)
  - [x] Co-locate test file: `frontend/src/composables/useShiki.test.ts`

- [x] Task 5: Wire `ModelViewer.vue` with AppTabs, model store, and ModelDslView (AC: #1, #3, #4, #5)
  - [x] REWRITE `frontend/src/views/ModelViewer.vue` (currently a placeholder with two EmptyStates)
  - [x] Import and use `useModelStore` and `useConnectionStore`
  - [x] On mount (`onMounted`): if `connectionStore.storeId` is set, call `modelStore.fetchModel(connectionStore.storeId)`
  - [x] Watch `connectionStore.storeId` with `watch`: when storeId changes to a non-empty string, call `modelStore.fetchModel(newStoreId)`; when storeId becomes empty string, call `modelStore.reset()`
  - [x] If `!connectionStore.storeId`: render EmptyState (no store selected — same as pre-existing behavior from Story 1.6: icon `Settings`, "No store selected", "Go to Store Admin")
  - [x] If `connectionStore.storeId` is set, render AppTabs with two tabs: `{ key: 'dsl', label: 'DSL' }` and `{ key: 'graph', label: 'Graph' }` (Graph tab is a placeholder for Story 2.3)
  - [x] Default active tab: `'dsl'`
  - [x] In the `dsl` tab slot: if `modelStore.loading`, show `<LoadingSpinner :full-view="true" />`. Else render `<ModelDslView :dsl="modelStore.dsl" />`
  - [x] In the `graph` tab slot: render a placeholder EmptyState (icon: `GitGraph`, message: "Graph view coming in Story 2.3", no action button) — this slot is intentionally minimal
  - [x] Co-locate test file: `frontend/src/views/ModelViewer.test.ts`

- [x] Task 6: Tests — model store (AC: #1, #3, #4, #6)
  - [x] `frontend/src/stores/model.test.ts`:
    - [x] Test `fetchModel` with successful response containing DSL+JSON+id: verifies `dsl`, `json`, `authorizationModelId` are set correctly
    - [x] Test `fetchModel` with response where `dsl: null`: verifies `dsl` remains null (empty model case)
    - [x] Test `fetchModel` on error: verifies `error.value` is set, loading becomes false
    - [x] Test `loading` flag: true during fetch, false after
    - [x] Test `reset()`: clears all state refs to null

- [x] Task 7: Tests — ModelDslView component (AC: #1, #2, #3, #7)
  - [x] `frontend/src/components/model/ModelDslView.test.ts`:
    - [x] Test renders EmptyState when `dsl` prop is null
    - [x] Test renders EmptyState when `dsl` prop is empty string
    - [x] Test renders a code block element when `dsl` is provided (stub or mock useShiki for synchronous behavior)
    - [x] Test Copy button calls `navigator.clipboard.writeText` with the DSL value
    - [x] Test Copy success shows toast "DSL copied to clipboard"

- [x] Task 8: Tests — ModelViewer view (AC: #4, #5)
  - [x] `frontend/src/views/ModelViewer.test.ts`:
    - [x] Test renders "No store selected" EmptyState when `connectionStore.storeId` is empty
    - [x] Test calls `modelStore.fetchModel` on mount when store is selected
    - [x] Test shows LoadingSpinner when `modelStore.loading` is true
    - [x] Test shows ModelDslView when loading is false and dsl tab is active
    - [x] Test renders both tabs (DSL and Graph) in AppTabs

### Review Findings

- [x] [Review][Patch] `v-html` fallback rendered raw unescaped DSL — fixed: separate `<pre v-text>` fallback
- [x] [Review][Patch] Missing `useShiki.test.ts` — added: 3 tests (HTML output, singleton, empty input)
- [x] [Review][Defer] Line numbers not implemented — spec permits deferral
- [x] [Review][Defer] No ModelViewer test for error fetch scenario — deferred

## Dev Notes

### Previous Story Intelligence (Stories 1.6 + Epic 1 learnings)

- **Express 5.1.0 with native async error handling** — no try/catch in routes; errors propagate to global error handler automatically
- **Backend ESM** (`"type": "module"` in `backend/package.json`), TypeScript 5.9 strict mode — all imports must use `.js` extension in compiled output
- **`openfga-client.ts`** exposes `get(path)`, `post(path, body)`, `delete(path)` — the single contact point with OpenFGA; Story 2.1 will add model-service.ts using this client
- **`validate(schema)` middleware** factory in `backend/src/middleware/validate.ts` for Zod validation on routes
- **Error handler** in `backend/src/middleware/error-handler.ts` returns `{ error, details }` envelope; Express 5 async errors flow here automatically
- **`useApi` composable** (`frontend/src/composables/useApi.ts`): prepends `/api/` prefix, parses error envelope, triggers toast on error, returns typed data — use `api.get<T>(path)` (path does NOT include leading `/api/`)
- **`useApi.del`** patched in Story 1.6 to handle 204 No Content: `if (res.status === 204) return undefined as T`
- **ConfirmDialog, EmptyState, ToastContainer, LoadingSpinner** available from `frontend/src/components/common/`
- **EmptyState props**: `icon?: Component`, `title?: string`, `message: string`, `actionLabel?: string`, `actionTo?: string` — uses RouterLink if `actionTo` is provided, emits `action` event otherwise
- **LoadingSpinner props**: `size?: 'sm' | 'md' | 'lg'` (default `'md'`), `fullView?: boolean` (default `false`) — use `fullView` for content-area-filling spinner
- **AppTabs component** (`frontend/src/components/common/AppTabs.vue`): accepts `tabs: Array<{ key: string; label: string }>` and `v-model` for active tab key. Uses Headless UI `TabGroup` — tab slots are named by `tab.key`
- **Pinia store pattern** (setup syntax): `loading: ref<boolean>`, `error: ref<string | null>`, data refs. Actions wrap `useApi` calls. See `frontend/src/stores/connection.ts` for live reference
- **`useConnectionStore`** exposes `storeId: ref<string>` — empty string means no store selected
- **`useToast` composable**: `toast.show({ type: 'success' | 'error', message: string })`
- **Frontend is ESM** (`"type": "module"`), uses `@/` path alias to `frontend/src/`
- **Vitest + @vue/test-utils**: tests co-located next to source files. Jsdom environment. Use `vi.mock` for composable mocking, `vi.fn()` for spies
- **Stryker** configured for mutation testing (`npm run mutate` in frontend)
- **No `@openfga/sdk`** installed — backend uses raw HTTP via `openfga-client.ts`
- **Tailwind v4.2** with `@theme` custom design tokens: `surface-base` (gray-950), `surface-card` (gray-900), `surface-elevated` (gray-800), `surface-border` (gray-700), `text-primary` (gray-100), `text-secondary` (gray-400), `text-emphasis` (white), `color-info` (#3b82f6), `color-success` (#22c55e), `color-error` (#ef4444)
- **JetBrains Mono**: loaded via `@fontsource/jetbrains-mono` — CSS class `font-mono` applies it

### Architecture Compliance

- **This story is FRONTEND-ONLY** — Story 2.1 must be completed first. Story 2.1 creates `backend/src/routes/model.ts` (GET `/api/stores/:storeId/model`) and `backend/src/services/model-service.ts`. Story 2.2 consumes that endpoint. [Source: epics.md — Story 2.1 is a prerequisite for Story 2.2]
- **API endpoint consumed**: `GET /api/stores/:storeId/model` returns `{ dsl: string | null, json: object | null, authorizationModelId: string | null }` — defined in Story 2.1 ACs. The `useApi` call is `api.get<ModelResponse>(\`stores/${storeId}/model\`)` (no leading slash, no `/api/` prefix — useApi adds that)
- **Model store location**: `frontend/src/stores/model.ts` — defined in architecture.md project structure. Do NOT put it elsewhere
- **ModelDslView component location**: `frontend/src/components/model/ModelDslView.vue` — the `model/` subdirectory under components is specified in architecture.md. Create the directory if it doesn't exist yet
- **ModelGraphView.vue** will also live in `frontend/src/components/model/` — reserve the directory for it (Story 2.3)
- **ModelViewer.vue** is the view that orchestrates both tabs — it lives in `frontend/src/views/`. Do NOT create a new view file; REWRITE the existing placeholder
- **Pinia store pattern**: setup syntax with `loading`, `error`, data refs. Actions use `useApi`. [Source: architecture.md#Communication Patterns]
- **All API calls go through `useApi`** — no direct `fetch()` calls in components or stores. [Source: architecture.md#Enforcement Guidelines]
- **Error handling**: errors from `useApi` trigger a toast automatically; the store sets `error.value`. Views bind to `modelStore.loading` for loading state, not local refs. [Source: architecture.md#Loading State Pattern]
- **Tests co-located**: `ModelDslView.test.ts` next to `ModelDslView.vue`, `model.test.ts` next to `model.ts`, etc. [Source: architecture.md#Test Location]
- **No caching**: Model Viewer re-fetches on every view mount (UX-DR14: data freshness pattern). This is intentional — always live, never stale

### Critical Technical Details

#### Shiki Integration

Shiki v1+ (the current major version as of 2026) is ESM-only and tree-shakeable. Install with:

```bash
cd frontend && npm install shiki
```

**Highlighter initialization** (create once, reuse across renders):

```typescript
// frontend/src/composables/useShiki.ts
import { createHighlighter, type Highlighter } from 'shiki'

let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs: ['yaml'],  // fallback — see OpenFGA language note below
    })
  }
  return highlighterPromise
}

export async function highlightDsl(code: string): Promise<string> {
  const highlighter = await getHighlighter()
  return highlighter.codeToHtml(code, {
    lang: 'yaml',
    theme: 'github-dark',
  })
}
```

**OpenFGA DSL language**: As of early 2026, Shiki's built-in language list may not include a dedicated `openfga` grammar. Check `shiki/langs` for an `openfga` entry — if it exists, use it. If not, `yaml` is a good visual fallback (DSL keyword structure is YAML-adjacent). Do NOT try to dynamically fetch a grammar from the internet. Do NOT throw on missing lang — use `yaml` silently.

**Rendering the highlighted HTML** in `ModelDslView.vue`:

```vue
<div v-html="highlightedHtml" class="shiki-wrapper overflow-auto rounded-lg" />
```

Shiki's `codeToHtml` returns a complete `<pre><code>...</code></pre>` block with inline styles for tokens. The surrounding `<div>` controls layout. Add `overflow-auto` to enable horizontal scrolling for long lines.

**Line numbers**: Shiki v1 supports line numbers via `transformers`. Use `transformerNotationLineNumbers()` from `@shikijs/transformers` if that package is available, OR render a simple custom solution: wrap the output `<div>` in a container with a `<pre>` line-number gutter using CSS `counter-reset` / `counter-increment`. If transformer approach adds complexity, defer line numbers and deliver a basic code view — the AC says "line numbers" but functional highlighting is the core value.

**CSS reset for Shiki output**: Shiki applies inline color styles but inherits `font-family` from the parent. Ensure the wrapper has `font-family: 'JetBrains Mono', monospace` (Tailwind `font-mono`) so the monospace font applies to the code tokens.

**Async rendering pattern** in `ModelDslView.vue`: Shiki's `highlightDsl` is async. Use a local `ref<string>('')` for the highlighted HTML, and a `watchEffect` or `watch` on the `dsl` prop to call `highlightDsl(props.dsl)` and update the ref. Show a brief inline spinner while highlighting (or render the raw text as a fallback during the async highlight).

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { highlightDsl } from '@/composables/useShiki'

const props = defineProps<{ dsl: string | null }>()

const highlightedHtml = ref<string>('')
const highlighting = ref(false)

watch(
  () => props.dsl,
  async (newDsl) => {
    if (!newDsl) { highlightedHtml.value = ''; return }
    highlighting.value = true
    try {
      highlightedHtml.value = await highlightDsl(newDsl)
    } finally {
      highlighting.value = false
    }
  },
  { immediate: true }
)
</script>
```

#### Model Store API Shape

The response from `GET /api/stores/:storeId/model` (as defined in Story 2.1):

```typescript
interface ModelResponse {
  dsl: string | null          // null if store has no model
  json: object | null         // raw OpenFGA JSON model, null if no model
  authorizationModelId: string | null  // null if no model
}
```

When `dsl` is null, the model store's `dsl` ref is null and `ModelDslView` shows EmptyState.

#### AppTabs Usage in ModelViewer

```vue
<AppTabs v-model="activeTab" :tabs="[{ key: 'dsl', label: 'DSL' }, { key: 'graph', label: 'Graph' }]">
  <template #dsl>
    <!-- DSL content here -->
  </template>
  <template #graph>
    <!-- Graph placeholder here -->
  </template>
</AppTabs>
```

`activeTab` is a `ref<string>('dsl')` initialized to `'dsl'` (DSL is the default active tab per AC #1).

#### Clipboard API

Use the async Clipboard API: `navigator.clipboard.writeText(text)` returns a Promise. In environments where this is not available (rare in modern desktop browsers), catch the rejection and show an error toast. Do NOT use `document.execCommand('copy')` — it is deprecated.

#### Watcher for Store Change in ModelViewer

When the user switches active store (via header store selector), `connectionStore.storeId` changes. The Model Viewer must re-fetch the model for the new store:

```typescript
watch(
  () => connectionStore.storeId,
  (newId) => {
    if (newId) {
      modelStore.fetchModel(newId)
    } else {
      modelStore.reset()
    }
  }
)
```

Also call `fetchModel` on `onMounted` when storeId is already set (user navigates to Model Viewer while a store is already selected).

#### Test Mocking Strategy for Shiki

In Vitest tests for `ModelDslView.test.ts`, Shiki must be mocked to avoid async complexity and bundler issues in test environment:

```typescript
vi.mock('@/composables/useShiki', () => ({
  highlightDsl: vi.fn().mockResolvedValue('<pre><code>mocked dsl</code></pre>'),
}))
```

This allows synchronous-style testing of the component without waiting on Shiki's async initialization.

#### `model/` Component Directory

The `frontend/src/components/model/` directory does not exist yet (no Story 2.x components have been built). Create it when creating `ModelDslView.vue`.

### File Structure After This Story

```
frontend/src/
├── stores/
│   ├── model.ts                        # NEW: Pinia model store (dsl, json, authorizationModelId, loading, error)
│   └── model.test.ts                   # NEW: model store unit tests
├── composables/
│   ├── useShiki.ts                     # NEW: Shiki singleton + highlightDsl(code) helper
│   └── useShiki.test.ts                # NEW: useShiki unit tests
├── components/
│   └── model/                          # NEW directory
│       ├── ModelDslView.vue            # NEW: DSL code viewer with Shiki highlighting + Copy button
│       └── ModelDslView.test.ts        # NEW: ModelDslView component tests
└── views/
    ├── ModelViewer.vue                 # REWRITTEN: full implementation with AppTabs, model store wiring
    └── ModelViewer.test.ts             # NEW: ModelViewer view tests
```

**Dependencies added:**

```
frontend/package.json: +shiki (production dependency)
```

**No backend files are created or modified in this story.** Backend model endpoint is Story 2.1's responsibility.

### What NOT to Do

- **Do NOT implement the Graph tab content** — that is Story 2.3 (`ModelGraphView.vue`, Vue Flow, dagre). Render a placeholder EmptyState in the Graph tab slot only
- **Do NOT install `@openfga/syntax-transformer` on the frontend** — DSL conversion happens on the backend (Story 2.1). The frontend only receives the already-converted DSL string
- **Do NOT create `backend/src/routes/model.ts` or `backend/src/services/model-service.ts`** — those are Story 2.1. This story is frontend-only
- **Do NOT make direct `fetch()` calls** — always use `useApi` composable
- **Do NOT cache the model response** — re-fetch on every mount (UX-DR14 data freshness pattern)
- **Do NOT use Shiki v0.x** — it has a different API. Ensure `npm install shiki` installs v1+
- **Do NOT use Monaco Editor** — it is too heavy. Shiki is the chosen library (read-only display, not editing)
- **Do NOT use Prism** — architecture specifies Shiki
- **Do NOT use `document.execCommand('copy')`** — deprecated, use `navigator.clipboard.writeText`
- **Do NOT make the Graph tab functional** — it is a placeholder. Do NOT install Vue Flow in this story (Story 2.3 will)
- **Do NOT attempt to fetch model data if no storeId** — guard with `if (connectionStore.storeId)` before calling `fetchModel`
- **Do NOT create a new `ModelViewer.vue`** — rewrite the existing placeholder at `frontend/src/views/ModelViewer.vue`
- **Do NOT put `ModelDslView.vue` in `components/common/`** — it belongs in `components/model/` per architecture.md structure

### References

- [Source: epics.md#Story 2.2] — User story, acceptance criteria, Story 2.1 dependency
- [Source: architecture.md#Frontend Architecture] — Shiki for code display, Tailwind v4.2, Pinia stores, useApi composable
- [Source: architecture.md#Structure Patterns] — `components/model/` directory, `stores/model.ts` location
- [Source: architecture.md#Communication Patterns] — Pinia setup syntax with loading/error/data, useApi pattern
- [Source: architecture.md#Process Patterns] — Loading state: Pinia `loading` ref → view binds to it; error handling flow
- [Source: ux-design-specification.md#Component Library] — `ModelDslView` uses Shiki, dark theme, JetBrains Mono (no ligatures), line numbers, copy button (read-only)
- [Source: ux-design-specification.md#Empty States] — Model Viewer empty: "No authorization model loaded" / "Go to Import/Export"
- [Source: ux-design-specification.md#Loading States] — LoadingSpinner in content area while loading
- [Source: ux-design-specification.md#Data Freshness Pattern] — Re-fetch on every view mount (UX-DR14)
- [Source: ux-design-specification.md#Inspiration — VS Code] — "Shiki for syntax highlighting + line numbers + monospace layout gets 80% of the Monaco feel at 1% of the bundle cost"

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

1. **ModelViewer tests: pinia instance isolation**: `mountViewer` created a new pinia as plugin, while external `useConnectionStore()` calls used a different active pinia instance. Fixed by creating one shared pinia in `beforeEach`, assigning to both `setActivePinia` and the mount `plugins` array.

2. **Loading flag test timing**: `resolveJson` was called before the `json()` function had run (async microtask ordering). Fixed by awaiting two `Promise.resolve()` ticks before calling `resolveJson` to let `fetchMock.mockResolvedValue` settle and trigger the `json()` callback.

3. **`openfga` language not bundled in Shiki**: Confirmed via `bundledLanguages` check — no `openfga` entry. Using `yaml` fallback as specified (no throw, no console.warn needed since yaml is a deliberate choice).

### Completion Notes List

- `shiki` v3.x installed in frontend; `openfga` not a bundled lang → `yaml` fallback used
- `useShiki.ts`: module-scope singleton highlighter with `github-dark` theme + `yaml` lang
- `ModelDslView.vue`: async `watch` on `dsl` prop → `highlightDsl`, renders with `v-html`; Copy button uses `navigator.clipboard.writeText`
- `ModelViewer.vue`: full rewrite with `AppTabs`, `onMounted` + `watch(storeId)`, `LoadingSpinner` while loading, `ModelDslView` in DSL tab, `EmptyState` placeholder in Graph tab
- 127 frontend tests pass; 16 new tests added; zero regressions; no TS errors in new files

### File List

- `frontend/package.json` — MODIFIED: added `shiki` production dependency
- `frontend/src/stores/model.ts` — NEW: `useModelStore` with `fetchModel`, `reset`, `ModelResponse` interface
- `frontend/src/stores/model.test.ts` — NEW: 6 unit tests
- `frontend/src/composables/useShiki.ts` — NEW: `highlightDsl(code)` singleton helper
- `frontend/src/components/model/ModelDslView.vue` — NEW: DSL viewer with Shiki + Copy button
- `frontend/src/components/model/ModelDslView.test.ts` — NEW: 5 component tests
- `frontend/src/views/ModelViewer.vue` — REWRITTEN: full AppTabs implementation
- `frontend/src/views/ModelViewer.test.ts` — NEW: 5 view tests

### Change Log

- 2026-03-27: Story file created — status: ready-for-dev
- 2026-03-27: Implementation complete — status: review
- 2026-03-27: Code review complete — status: done
