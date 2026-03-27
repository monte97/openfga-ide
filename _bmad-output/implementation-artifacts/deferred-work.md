# Deferred Work

## Deferred from: code review of 1-1-project-scaffolding-and-dev-environment (2026-03-27)

- **Vite proxy `localhost:3000` fails inside Docker** [frontend/vite.config.ts] — inside the frontend container, `localhost` resolves to the container itself, not the backend service. Vite proxy target would need to be `http://backend:3000` for Docker. Low priority: Docker runtime was explicitly deferred in story notes; affects Docker-only workflows, not bare-host dev.

## Deferred from: code review of 1-6-store-administration (2026-03-27)

- **`storeList` non azzerato su errore `fetchStores`** [stores.ts] — in caso di refetch fallito, `storeList` mantiene dati stale in memoria. Aggiungere `storeList.value = []` nel catch per garantire stato consistente.
- **TOCTOU su `openfgaClient.storeId` in `deleteStore`** [store-service.ts:11] — la comparazione + assegnazione su singleton non è atomica. Basso rischio per tool interno mono-utente, ma da risolvere se si aggiunge concorrenza.
- **`hasNavigatedThisSession`: ri-selezione dello store attivo scatena redirect** [stores.ts:selectStore] — se l'utente è già su `/model-viewer` e ri-seleziona lo store (es. torna a Store Admin e clicca lo stesso store), `hasNavigatedThisSession=false` causa un redirect inatteso. Considerare di controllare anche la route corrente.
- **Cancel durante DELETE in-flight** [StoreAdmin.vue + stores.ts] — se l'utente cancella il dialog mentre il DELETE è in volo, il delete completa comunque e rimuove lo store dalla lista senza che l'utente veda il dialog. Edge case raro, da gestire con un flag di abort.
- **ConfirmDialog message wording** [StoreAdmin.vue:122] — il messaggio include `'...'` e "This action cannot be undone." che non è nel testo esatto dell'AC#3. Puramente cosmetic.

## Deferred from: code review of 1-5-connection-status-and-runtime-configuration (2026-03-27)

- **testConnection toast indesiderato** [connection.ts + useApi.ts] — `useApi.post()` mostra sempre un toast su errore di rete. Durante `testConnection`, l'UI già mostra feedback inline; il toast è rumore. Fix richiede un'opzione `silent` in `useApi` o uso di fetch diretto.
- **Error toast illimitati** [useToast.ts + AppHeader.vue] — toast di tipo error non hanno auto-dismiss e si impilano su retry multipli. Considerare un cap (es. max 3 toast contemporanei) o rimpiazzare toast esistente con stessa chiave.
- **fetchStores concorrente last-write-wins** [connection.ts:85-92] — chiamate parallele a `fetchStores()` (da mount + updateConnection) sovrascrivono `stores.value` in ordine non deterministico. Aggiungere un flag in-flight guard.
- **loading flag condiviso** [connection.ts] — `loading` usato sia da `fetchConnection` che da `updateConnection`. Spinner sparisce mentre la seconda operazione è ancora in corso. Considerare flag separati o un contatore.
- **StoreSelector usa Combobox raw** [StoreSelector.vue] — non usa il componente `SearchableSelect` (Story 1.3). Uniformare per consistenza del design system.
- **Nessun messaggio "no results"** [StoreSelector.vue] — quando la ricerca non trova store, il dropdown scompare senza feedback. Aggiungere messaggio "No stores found".

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
- **`validate` middleware coverage on future routes** [routes/stores.ts] — stores route does not yet exist; reminder to apply `validate()` middleware when it is created in Story 1.6.
- **`updateApiKey` dead code** [openfga-client.ts:23-25] — method is declared but no route calls it. Will become live when/if an API key update endpoint is added; low priority until then.
