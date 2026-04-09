# Deferred Work

## Deferred from: code review of 11-1-suite-switch-async-safety-and-state-reset (2026-04-03)

- **`isAbortError` helper not exported from `useApi.ts`** — `suites.ts` uses inline `err instanceof DOMException && err.name === 'AbortError'` checks instead of the shared helper. Low-impact cosmetic duplication; inline checks are correct and readable.

## Deferred from: code review of 10-2-import-suite-with-validation-preview (2026-04-01)

- **`ZodIssue` type alias duplicated** — `ImportJsonEditor.vue` and `ImportPreview.vue` both define the same local type; extract to shared `schemas/` in a future refactor.
- **`hasSyntaxError` computed decoupled from CodeMirror linter** — computes an independent `JSON.parse` rather than reading from CM linter state; risk of transient divergence on fast edits; pre-existing redundancy pattern.
- **Drop zone not keyboard accessible** — file picker only triggered by click/drag; no keyboard path; future accessibility enhancement.
- **Empty `testCases` array passes validation** — `z.array(...).max(500)` has no `.min(1)`; empty groups currently allowed; tighten if spec changes.
- **`tupleCount` cast `as unknown[]` in `summaryInfo` computed** — minor type-safety gap; safe for well-formed JSON but bypasses type system.
- **No MIME type validation on drag-and-drop** — non-JSON files fail at parse stage with an error message; add `accept` check on drop for earlier feedback.

## Deferred from: code review of 9-3-results-display-and-suite-list-integration (2026-03-31)

- **fetchSuite last-write-wins race** — no cancellation of in-flight API calls on suite change; pre-existing pattern across all stores.
- ~~**Polling leaks on permanent network loss**~~ — fixed in Epic 11: circuit breaker stops polling after 5 consecutive errors (`MAX_POLL_ERRORS`).
- **groupRatio() called 3× per render** — minor perf, benign for typical suite sizes.
- **`created_at` cast without Date guard in repositories** — `(row.created_at as Date).toISOString()` assumes pg driver type parsing; pre-existing.
- **`SuiteLastRun.status` untyped string** — should be a union type; nice-to-have.
- **pass/fail icon data-testids not unique per test case** — both rows use `"tc-result-pass"` / `"tc-result-fail"`; cosmetic.
- **Map key collision risk in SuiteTreePanel** — `${user}:${relation}:${object}:${expected}` separator collides if fields contain `:`; extremely low probability with valid OpenFGA data.

## Deferred from: code review of 9-2-run-ui-and-phase-timeline (2026-03-31)

- **"Loading fixtures" failure unreachable in RunPhaseTimeline** — backend emits only `failed` status without granular phase info; `results.length > 0` heuristic cannot distinguish provisioning failure from fixture-loading failure. Resolving requires a backend data-model change.
- **`pollInterval` exposed in public store API** — internal implementation detail included in `useRunStore` return object; no functional impact, clean up in a future refactor.

## Deferred from: code review of 8-1-suite-tree-and-form-editor (2026-03-31)

- **AC3: autocomplete-on-focus not implemented** — Headless UI Combobox opens only on typing; AC3 says "autocomplete triggers on focus"; future UX enhancement.
- **AC4: tags field is plain text input, not multi-select** — comma-separated text per dev notes; AC4 says "multi-select input"; accepted deviation.
- **`SuiteTreePanel` `focusedNodeId` stale after collapse** — ArrowLeft silently no-ops when focused node's group is externally collapsed; low UX impact.
- **`document.querySelector` in `focusNode` unscoped** — would find the first matching `[data-node-id]` in the document; breaks if two tree instances exist simultaneously.
- ~~**`onTagsBlur`/`onDescriptionBlur` fire on every blur without dirty-check**~~ — already fixed; both functions guard with equality check before emitting.
- **`useAutocompleteOptions` no null guard on `tuple.key.user/relation/object`** — malformed backend response could push `{ value: undefined, label: undefined }` options into SearchableSelect.

## Deferred from: code review of 8-3-fixture-editor (2026-03-31)

- ~~**No debounce on `FixtureEditor.onJsonChange`**~~ — fixed: `fixtureSaveTimer` debounce already present in `FixtureEditor.vue`.
- ~~**`editorMode` not reset when `suite.id` changes**~~ — fixed 2026-04-08: `setEditorMode('form')` added to `onMounted` in `SuiteEditor.vue`.
- **Validation error banner persists across tab switches** — `fixtureValidationError` is not cleared when user leaves and returns to Fixture tab; stale structural error may still show.
- **Import does not validate fetched payload structure** — `onImportCurrentStore` trusts the backend export format; if the endpoint returns unexpected shape, invalid fixture is saved silently.
- **Success/error toasts not asserted in import test** — `useToast` is not mocked in `FixtureEditor.test.ts`; toast calls are exercised but not verified.

## Deferred from: code review of 8-2-json-editor-and-dual-mode-sync (2026-03-31)

- **Direct mutation of `suiteStore.activeSuite` from view** — `SuiteEditor.vue` assigns `suiteStore.activeSuite = {...}` directly; bypasses Pinia actions. Pre-existing pattern in codebase; refactor would need a dedicated `patchActiveSuite` store action.
- **No rollback on `saveDefinition` failure after optimistic update** — `onJsonChange` sets in-memory `activeSuite` before the API call resolves; on failure only a toast fires, leaving UI state diverged from server. Intentional optimistic-update pattern; rollback logic would need a dedicated story.
- ~~**No debounce on `onJsonChange`**~~ — fixed: `jsonSaveTimer` 600ms debounce already present in `SuiteEditor.vue`.
- **Suite switch race: concurrent `fetchSuite` calls** — if parent changes `suite.id` while first fetch is still in flight, two concurrent fetches can race and leave `activeSuite` set to the wrong suite. Pre-existing async pattern; needs AbortController or derived fetch key.
- **`watch(modelValue)` in SuiteJsonEditor destroys in-progress invalid JSON edits** — if parent's `jsonString` recomputes during mid-edit invalid state, the editor content is replaced. Known CodeMirror v-model round-trip limitation; full fix requires debouncing the emit or not round-tripping invalid content back.
- **Shallow watch on `props.testCase` in `TestCaseForm`** — correct because Pinia replaces objects on mutation; would silently break if `updateTestCase` ever mutated in place.
- **Suite-switch does not clear `expandedGroupIds`** — previous suite's expanded group IDs persist in session store when navigating to a new suite.
- **ArrowDown/ArrowUp keyboard nav tests trivially assert `emitted().toBeDefined()`** — tests pass but verify nothing about actual focus movement.

## Deferred from: code review of 7-2-suite-list-ui-with-create-delete-and-empty-state (2026-03-31)

- **SuiteCard counts hardcoded "— groups · — tests"** — by design per dev notes, SuiteListItem carries no count fields; to be populated in Epic 8 when definition is loaded.
- **`fetchSuite` has no error state tracking** — `try/finally` only; Epic 8 scope to add `errorSuite` ref and UI feedback.
- **Tags input has no format/length validation** — plain comma-split; not spec'd for this story; future UX enhancement.
- **`AppTabs` slot naming couples tab key to slot name** — renaming a tab key is a silent breaking change; pre-existing design pattern across the codebase.
- **`crypto.randomUUID()` no polyfill for non-secure contexts** — dev tooling serves over HTTPS; low risk; add polyfill if ever served over HTTP.

## Deferred from: code review of 7-1-suite-crud-api-and-postgresql-infrastructure (2026-03-31)

- **Hardcoded credentials in docker-compose** [docker-compose.yml] — `openfga_viewer`/`openfga_viewer` plaintext; dev-only concern but no env-var fallback.
- **`suiteId` param not validated as UUID format** [backend/src/test-suites/routes/suites.ts] — parameterized queries prevent injection; wasteful round-trip for invalid IDs but cosmetic.
- **Migration filename uses sequential integer prefix, not timestamp** [backend/src/test-suites/migrations/001_create-suites.sql] — risks ordering conflicts in parallel branches; team-scale concern.
- **`updated_at = NOW()` latent defect in dynamic builder** [backend/src/test-suites/repositories/suite-repository.ts] — parameter index would collide if `updated_at` is ever converted to a bound parameter; latent only.
- **`listSuites` returns `{ suites: [...] }` envelope** — verify against frontend store expectations; no violation found but worth confirming.

## Deferred from: code review of 1-1-project-scaffolding-and-dev-environment (2026-03-27)

- ~~**Vite proxy `localhost:3000` fails inside Docker**~~ — fixed: `VITE_API_TARGET=http://backend:3000` env var in `docker-compose.yml`; `vite.config.ts` reads it via `process.env.VITE_API_TARGET`.

## Deferred from: code review of 1-6-store-administration (2026-03-27)

## Deferred from: code review of 4-1-backend-query-endpoints (2026-03-27)

- ~~**`validate` middleware does not reassign `req.params`/`req.query` after Zod parse**~~ — fixed 2026-04-08: `Object.assign` propagates trimmed values for params/query targets; `req.body` replaced as before.
- ~~**Whitespace-only strings pass `z.string().min(1)` validation**~~ — fixed 2026-04-08: `.trim()` added to all `z.string().min(1)` across 7 backend schema files.
- **400 response `details` field is Zod issue array, not human-readable string** [middleware/validate.ts] — spec implies string description; actual shape is `ZodIssue[]`. Pre-existing pattern.
- **No NFR performance test for 1-second end-to-end response time (AC6)** — openfga-client AbortSignal timeout enforces a ceiling; no active assertion in tests.
- **`storeId` not validated for path-traversal characters** [schemas/query.ts] — `z.string().min(1)` only; value interpolated directly into URL path. Pre-existing pattern across all route schemas.
- **`req.params['storeId'] as string` cast after Zod validation** [routes/queries.ts] — redundant cast; mergeParams misconfiguration would silently pass `"undefined"`. Pre-existing pattern.

## Deferred from: code review of 4-3-list-objects-list-users-and-expand-queries (2026-03-27)

- **Duplicate `CheckResponse` type in frontend store vs backend types** [stores/queries.ts, backend/types/openfga.ts] — expected in monorepo without shared contract layer; no runtime impact.
- **`ExpandTreeNode` keys children by array index** [components/query/ExpandTreeNode.vue:84] — stale `expanded` ref possible when tree is reused across different expand calls; low risk since `expandResult` is fully replaced.
- **`useModelOptions` uses inline `as` casts** [composables/useModelOptions.ts:8,18] — bypasses model store's declared type; risk of silent divergence if model store type is updated.
- **`CheckQuery.vue` `@keydown.enter` on outer div** [components/query/CheckQuery.vue:21] — double-submit risk if a focused button inside the form receives Enter; pre-existing from story 4.2.
- **No `userFilters` in `listUsers` store action** [stores/queries.ts:136] — backend hardcodes `user_filters: [{ type: 'user' }]`, silently limiting results to `user` type; enhancement beyond spec scope.
- ~~**Backend `check`: `allowed` undefined if OpenFGA omits field**~~ — fixed 2026-04-04: `data.allowed ?? false` in query-service.ts.
- ~~**Backend `expand`: crash if tree has no `root` field**~~ — fixed 2026-04-04: `data.tree ?? null` in query-service.ts.
- **Backend routes: Express async errors** — not applicable; project uses Express 5 which auto-catches async handler rejections.
- **`isLeaf` false for `leaf: {}`** [components/query/ExpandTreeNode.vue:38-40] — empty leaf object results in no leaf content rendered; unusual edge case for well-formed OpenFGA responses.
- **Shared `expandResult` between `runExpand` (WhyButton) and `expand` tab** [stores/queries.ts:48] — WhyButton overwrites Expand tab result and vice-versa; intentional per dev notes ("same tab area, no conflict").
- **`QueryConsole.vue` shows tabs when model has no `type_definitions`** [views/QueryConsole.vue:51] — model is non-null but empty; all AppSelects show placeholder, buttons stay disabled; edge case UX.

- **`storeList` non azzerato su errore `fetchStores`** [stores.ts] — in caso di refetch fallito, `storeList` mantiene dati stale in memoria. Aggiungere `storeList.value = []` nel catch per garantire stato consistente.
- **TOCTOU su `openfgaClient.storeId` in `deleteStore`** [store-service.ts:11] — la comparazione + assegnazione su singleton non è atomica. Basso rischio per tool interno mono-utente, ma da risolvere se si aggiunge concorrenza.
- **`hasNavigatedThisSession`: ri-selezione dello store attivo scatena redirect** [stores.ts:selectStore] — se l'utente è già su `/model-viewer` e ri-seleziona lo store (es. torna a Store Admin e clicca lo stesso store), `hasNavigatedThisSession=false` causa un redirect inatteso. Considerare di controllare anche la route corrente.
- **Cancel durante DELETE in-flight** [StoreAdmin.vue + stores.ts] — se l'utente cancella il dialog mentre il DELETE è in volo, il delete completa comunque e rimuove lo store dalla lista senza che l'utente veda il dialog. Edge case raro, da gestire con un flag di abort.
- **ConfirmDialog message wording** [StoreAdmin.vue:122] — il messaggio include `'...'` e "This action cannot be undone." che non è nel testo esatto dell'AC#3. Puramente cosmetic.

## Deferred from: code review of 1-5-connection-status-and-runtime-configuration (2026-03-27)

- **testConnection toast indesiderato** [connection.ts + useApi.ts] — `useApi.post()` mostra sempre un toast su errore di rete. Durante `testConnection`, l'UI già mostra feedback inline; il toast è rumore. Fix richiede un'opzione `silent` in `useApi` o uso di fetch diretto.
- ~~**Error toast illimitati**~~ — fixed 2026-04-08: error toasts auto-dismiss after 8s; cap at 3 concurrent error toasts (`MAX_ERROR_TOASTS`).
- **fetchStores concorrente last-write-wins** [connection.ts:85-92] — chiamate parallele a `fetchStores()` (da mount + updateConnection) sovrascrivono `stores.value` in ordine non deterministico. Aggiungere un flag in-flight guard.
- **loading flag condiviso** [connection.ts] — `loading` usato sia da `fetchConnection` che da `updateConnection`. Spinner sparisce mentre la seconda operazione è ancora in corso. Considerare flag separati o un contatore.
- **StoreSelector usa Combobox raw** [StoreSelector.vue] — non usa il componente `SearchableSelect` (Story 1.3). Uniformare per consistenza del design system.
- ~~**Nessun messaggio "no results"**~~ — fixed in Epic 11: StoreSelector shows "No stores found" when search has no matches.

## Deferred from: code review of 1-3-design-system-foundation-and-base-components (2026-03-26)

- **`aria-live="polite"` per tutti i toast** [ToastContainer.vue] — i toast di tipo error dovrebbero usare `assertive` per essere annunciati immediatamente dagli screen reader.
- **Inter non caricato via @fontsource** [main.css / package.json] — la font Inter è elencata in `--font-sans` ma non installata come pacchetto. Solo fallback di sistema. Basso impatto su tool interno.

## Deferred from: code review of 1-4-app-shell-layout-and-navigation (2026-03-26)

- **AppTabs selectedIndex=-1** [AppTabs.vue] — se il genitore passa un `modelValue` che non corrisponde a nessuna tab, `findIndex` restituisce -1 e il comportamento di Headless UI TabGroup è indefinito. Aggiungere un fallback a index 0.
- **Route lazy-loaded senza error boundary** [router/index.ts] — import dinamici falliti (network error, mismatch hash al deploy) producono una route bianca senza feedback utente. Aggiungere `router.onError()` o `errorComponent` nelle route.

## Deferred from: code review of 1-2-backend-proxy-core-and-connection-management (2026-03-26)

- **Pagination / continuation_token** [openfga-client.ts:37] — `get()` returns the full response body as-is; pagination via `continuation_token` is not handled. Low priority until paginated endpoints (e.g. list tuples) are implemented.
- **`req.body` cast redundancy** [connection.ts:17,30] — `req.body as { url: string }` is redundant because Zod validation already narrowed the type. Cosmetic cleanup only.
- **Stack trace not in error handler logs** [middleware/error-handler.ts:14] — error log payload omits `err.stack`. Adds value for production debugging but increases log verbosity.
- **Empty storeId in GET /api/connection** [connection.ts:11] — when `OPENFGA_STORE_ID` is not set, response includes `storeId: ""`. Could return `null` or omit the field. Frontend already handles this case.
- ~~**`validate` middleware coverage on future routes**~~ — obsolete: Story 1.6 (Store Administration) is complete.
- **`updateApiKey` dead code** [openfga-client.ts:23-25] — method is declared but no route calls it. Will become live when/if an API key update endpoint is added; low priority until then.

## Deferred from: code review of 11-2-connection-store-robustness-and-ux-polish (2026-04-03)

- **"No stores found" li lacks ARIA role** [StoreSelector.vue] — plain `<li>` inside `role="listbox"` is technically non-conformant (no `role="option"`). Intentional to prevent HeadlessUI treating it as selectable. Low priority for internal tool; consider `role="none"` on the `<li>` if accessibility audit is required.
- **Inconsistent error behavior: stores.ts clears storeList, connection.ts keeps stale stores** [stores.ts / connection.ts] — two separate store systems manage overlapping data (OpenFGA store list) with different failure policies. Pre-existing architectural split; would require a shared stores-state layer to resolve cleanly.
- **storeList reset on retry failure causes empty-state flash** [stores.ts] — when fetchStores fails after a prior success, StoreAdmin shows "No stores" immediately. Intentional per AC3 but jarring UX. Consider optimistic keep + error banner as an alternative policy in a future UX pass.
