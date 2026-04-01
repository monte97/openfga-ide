<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useSuiteStore, type SuiteFixture, type SuiteListItem } from '@/stores/suites'
import { useConnectionStore } from '@/stores/connection'
import { useToast } from '@/composables/useToast'
import SuiteJsonEditor from './SuiteJsonEditor.vue'

const props = defineProps<{
  suite: SuiteListItem
}>()

const suiteStore = useSuiteStore()
const connectionStore = useConnectionStore()
const toast = useToast()

const fixture = computed(() => suiteStore.activeSuite?.definition?.fixture ?? null)
const fixtureString = computed(() => JSON.stringify(fixture.value ?? {}, null, 2))

const fixtureValidationError = ref<string | null>(null)
const importing = ref(false)
let fixtureSaveTimer: ReturnType<typeof setTimeout> | null = null

onUnmounted(() => {
  if (fixtureSaveTimer !== null) clearTimeout(fixtureSaveTimer)
})

// Clear validation error when suite changes — prevents stale banner on suite switch
watch(() => props.suite.id, () => {
  fixtureValidationError.value = null
  if (fixtureSaveTimer !== null) clearTimeout(fixtureSaveTimer)
})

function validateFixtureStructure(parsed: unknown): string | null {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return 'Fixture must be a JSON object'
  }
  const f = parsed as Record<string, unknown>
  if ('tuples' in f && !Array.isArray(f.tuples)) return '"tuples" must be an array'
  if ('model' in f && (typeof f.model !== 'object' || f.model === null || Array.isArray(f.model))) {
    return '"model" must be an object'
  }
  return null
}

function onJsonChange(val: string) {
  try {
    const parsed = JSON.parse(val)
    const validationError = validateFixtureStructure(parsed)
    if (validationError) {
      fixtureValidationError.value = validationError
      if (fixtureSaveTimer !== null) clearTimeout(fixtureSaveTimer)
      return
    }
    fixtureValidationError.value = null
    // Immediate in-memory update for UI responsiveness
    suiteStore.updateFixture(parsed as SuiteFixture)
    // Debounce the API save to avoid concurrent requests on rapid edits
    if (suiteStore.activeSuite) {
      if (fixtureSaveTimer !== null) clearTimeout(fixtureSaveTimer)
      fixtureSaveTimer = setTimeout(async () => {
        fixtureSaveTimer = null
        if (suiteStore.activeSuite) {
          try {
            await suiteStore.saveDefinition(props.suite.id, suiteStore.activeSuite.definition)
          } catch (err) {
            toast.show({ type: 'error', message: (err as Error).message || 'Failed to save' })
          }
        }
      }, 600)
    }
  } catch {
    // JSON parse errors shown by SuiteJsonEditor's lintGutter — clear structural error so banner doesn't persist
    fixtureValidationError.value = null
    if (fixtureSaveTimer !== null) clearTimeout(fixtureSaveTimer)
  }
}

async function onImportCurrentStore() {
  if (!connectionStore.storeId) return
  importing.value = true
  try {
    const res = await fetch(`/api/stores/${connectionStore.storeId}/export`)
    if (!res.ok) throw new Error(await res.text())
    const payload = await res.json() as { model: unknown; tuples: unknown[] }
    const newFixture: SuiteFixture = { model: payload.model, tuples: payload.tuples }
    suiteStore.updateFixture(newFixture)
    if (suiteStore.activeSuite) {
      await suiteStore.saveDefinition(props.suite.id, suiteStore.activeSuite.definition)
      toast.show({ type: 'success', message: 'Fixture imported from current store' })
    }
  } catch (err) {
    toast.show({ type: 'error', message: (err as Error).message || 'Import failed' })
  } finally {
    importing.value = false
  }
}

async function onAddEmptyFixture() {
  suiteStore.updateFixture({})
  if (suiteStore.activeSuite) {
    try {
      await suiteStore.saveDefinition(props.suite.id, suiteStore.activeSuite.definition)
    } catch (err) {
      toast.show({ type: 'error', message: (err as Error).message || 'Failed to save' })
    }
  }
}
</script>

<template>
  <div class="flex flex-col h-full p-4 gap-3 overflow-y-auto">
    <!-- Import button (always shown) -->
    <button
      :disabled="!connectionStore.storeId || importing"
      class="self-start px-3 py-1.5 text-xs font-medium rounded border border-surface-border
             text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors
             disabled:opacity-40 disabled:cursor-not-allowed"
      data-testid="import-fixture-button"
      @click="onImportCurrentStore"
    >
      {{ importing ? 'Importing…' : 'Import current store as fixture' }}
    </button>

    <!-- Empty state -->
    <div
      v-if="!fixture"
      class="flex flex-col items-center justify-center flex-1 text-center py-16"
      data-testid="fixture-empty-state"
    >
      <p class="text-sm text-text-secondary mb-1">No fixture defined</p>
      <p class="text-xs text-text-secondary/60 mb-4">
        Add a fixture to define the model and tuples your test suite runs against.
      </p>
      <button
        class="px-4 py-2 text-sm font-medium rounded bg-info text-white hover:bg-info/90 transition-colors"
        data-testid="add-empty-fixture-button"
        @click="onAddEmptyFixture"
      >
        Add empty fixture
      </button>
    </div>

    <!-- Fixture editor -->
    <div v-else class="flex-1 overflow-hidden flex flex-col min-h-0">
      <div
        v-if="fixtureValidationError"
        role="alert"
        class="mb-3 px-3 py-2 rounded-md bg-error/10 border border-error/30 text-sm text-error shrink-0"
        data-testid="fixture-validation-banner"
      >
        {{ fixtureValidationError }}
      </div>
      <div class="flex-1 overflow-hidden">
        <SuiteJsonEditor
          :model-value="fixtureString"
          @update:model-value="onJsonChange"
        />
      </div>
    </div>
  </div>
</template>
