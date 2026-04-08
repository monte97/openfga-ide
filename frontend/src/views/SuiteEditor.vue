<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref } from 'vue'
import type { SuiteListItem, TestCase } from '@/stores/suites'
import type { RunResult } from '@/stores/runs'
import { useSuiteStore } from '@/stores/suites'
import { useSuiteEditorStore } from '@/stores/suiteEditor'
import { useRunStore } from '@/stores/runs'
import { useToast } from '@/composables/useToast'
import SuiteTreePanel from '@/components/test-suites/SuiteTreePanel.vue'
import SuiteJsonEditor from '@/components/test-suites/SuiteJsonEditor.vue'
import TestCaseForm from '@/components/test-suites/TestCaseForm.vue'
import FixtureEditor from '@/components/test-suites/FixtureEditor.vue'
import RunPhaseTimeline from '@/components/test-suites/RunPhaseTimeline.vue'
import RunSummaryBadge from '@/components/test-suites/RunSummaryBadge.vue'
import AppButton from '@/components/common/AppButton.vue'

const props = defineProps<{
  suite: SuiteListItem
}>()

const suiteStore = useSuiteStore()
const editorStore = useSuiteEditorStore()
const runsStore = useRunStore()
const toast = useToast()

const jsonHasErrors = ref(false)
let jsonSaveTimer: ReturnType<typeof setTimeout> | null = null

const EDITOR_TABS = [
  { key: 'form', label: 'Form' },
  { key: 'json', label: 'JSON' },
  { key: 'fixture', label: 'Fixture' },
]

const hasFixture = computed(() => !!suiteStore.activeSuite?.definition?.fixture)

const totalTestCases = computed(() =>
  suiteStore.activeSuite?.definition.groups.reduce((sum, g) => sum + g.testCases.length, 0) ?? 0
)

const isRunning = computed(() =>
  ['pending', 'provisioning', 'running'].includes(runsStore.currentRun?.status ?? '')
)

async function runSuite(): Promise<void> {
  if (!hasFixture.value || isRunning.value) return
  try {
    await runsStore.triggerRun(props.suite.id)
  } catch {
    // error already surfaced via useApi toast
  }
}

async function onRunTestCase(groupId: string, testCaseId: string): Promise<void> {
  if (!hasFixture.value || isRunning.value) return
  try {
    await runsStore.triggerRun(props.suite.id, testCaseId)
  } catch {
    // error already surfaced via useApi toast
  }
}

function onKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    void runSuite()
  }
}

onMounted(async () => {
  await suiteStore.fetchSuite(props.suite.id)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (jsonSaveTimer !== null) clearTimeout(jsonSaveTimer)
  // Do NOT call stopPolling here — polling must survive tab navigation (AC4).
  // Polling stops automatically on terminal status, or via clearRun on suite change.
})

// Re-fetch when suite changes and reset editor state
watch(() => props.suite.id, async (id) => {
  if (jsonSaveTimer !== null) { clearTimeout(jsonSaveTimer); jsonSaveTimer = null }
  suiteStore.cancelSave()
  editorStore.selectTestCase(null)
  editorStore.setEditorMode('form')
  editorStore.clearExpandedGroups()
  runsStore.clearRun()
  await suiteStore.fetchSuite(id)
})

// Toast on run completion
watch(
  () => runsStore.currentRun?.status,
  (status, prevStatus) => {
    if (!status || !prevStatus) return
    if (prevStatus === 'completed' || prevStatus === 'failed') return
    if (status === 'completed') {
      const s = runsStore.currentRun?.summary
      toast.show({
        type: 'success',
        message: `Suite '${props.suite.name}' passed (${s?.passed ?? 0}/${s?.total ?? 0})`,
      })
    } else if (status === 'failed') {
      const s = runsStore.currentRun?.summary
      const failCount = s ? s.failed + s.errored : 1
      toast.show({
        type: 'error',
        message: `Suite '${props.suite.name}': ${failCount} failures`,
      })
    }
  },
)

const definition = computed(() => suiteStore.activeSuite?.definition ?? { groups: [] })

const jsonString = computed(() => JSON.stringify(definition.value, null, 2))

const selectedTestCase = computed(() => {
  if (!editorStore.selectedTestCaseId) return null
  for (const group of definition.value.groups) {
    const tc = group.testCases.find((t) => t.id === editorStore.selectedTestCaseId)
    if (tc) return { tc, groupId: group.id }
  }
  return null
})

const selectedTestCaseResult = computed((): RunResult | null => {
  const tc = selectedTestCase.value?.tc
  if (!tc || !runsStore.currentRun?.results?.length) return null
  return (
    runsStore.currentRun.results.find(
      (r) =>
        r.testCase.user === tc.user &&
        r.testCase.relation === tc.relation &&
        r.testCase.object === tc.object &&
        r.testCase.expected === tc.expected,
    ) ?? null
  )
})

const selectedGroupId = computed(() => selectedTestCase.value?.groupId ?? null)

function onSelectTestCase(tc: TestCase, groupId: string) {
  editorStore.selectTestCase(tc.id)
  editorStore.expandGroup(groupId)
}

function onJsonChange(val: string) {
  try {
    const parsed = JSON.parse(val)
    jsonHasErrors.value = false
    if (suiteStore.activeSuite) {
      // Optimistic in-memory update immediately so Form mode stays in sync
      suiteStore.patchDefinition(parsed)
      // Debounce the API save to avoid concurrent requests on rapid edits
      if (jsonSaveTimer !== null) clearTimeout(jsonSaveTimer)
      jsonSaveTimer = setTimeout(async () => {
        jsonSaveTimer = null
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
    jsonHasErrors.value = true
    if (jsonSaveTimer !== null) clearTimeout(jsonSaveTimer)
  }
}

async function onTestCaseUpdate(groupId: string, testCaseId: string, patch: Partial<TestCase>) {
  suiteStore.updateTestCase(groupId, testCaseId, patch)
  if (suiteStore.activeSuite) {
    try {
      await suiteStore.saveDefinition(props.suite.id, suiteStore.activeSuite.definition)
    } catch (err) {
      toast.show({ type: 'error', message: (err as Error).message || 'Failed to save' })
    }
  }
}

async function onAddGroup() {
  suiteStore.addGroup()
  const groups = suiteStore.activeSuite?.definition.groups ?? []
  if (groups.length > 0) {
    editorStore.expandGroup(groups[groups.length - 1].id)
  }
  if (suiteStore.activeSuite) {
    try {
      await suiteStore.saveDefinition(props.suite.id, suiteStore.activeSuite.definition)
    } catch (err) {
      toast.show({ type: 'error', message: (err as Error).message || 'Failed to save' })
    }
  }
}

async function onAddTestCase(groupId: string) {
  const tc = suiteStore.addTestCase(groupId)
  editorStore.selectTestCase(tc.id)
  editorStore.expandGroup(groupId)
  if (suiteStore.activeSuite) {
    try {
      await suiteStore.saveDefinition(props.suite.id, suiteStore.activeSuite.definition)
    } catch (err) {
      toast.show({ type: 'error', message: (err as Error).message || 'Failed to save' })
    }
  }
}

async function onRemoveGroup(groupId: string) {
  const group = definition.value.groups.find((g) => g.id === groupId)
  if (group?.testCases.some((t) => t.id === editorStore.selectedTestCaseId)) {
    editorStore.selectTestCase(null)
  }
  editorStore.collapseGroup(groupId)
  suiteStore.removeGroup(groupId)
  if (suiteStore.activeSuite) {
    try {
      await suiteStore.saveDefinition(props.suite.id, suiteStore.activeSuite.definition)
    } catch (err) {
      toast.show({ type: 'error', message: (err as Error).message || 'Failed to save' })
    }
  }
}

async function onRemoveTestCase(groupId: string, testCaseId: string) {
  if (editorStore.selectedTestCaseId === testCaseId) {
    editorStore.selectTestCase(null)
  }
  suiteStore.removeTestCase(groupId, testCaseId)
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
  <div class="flex h-full" aria-label="Suite editor">
    <!-- Tree panel -->
    <div
      class="shrink-0 border-r border-surface-border flex flex-col overflow-hidden"
      style="width: 280px"
      aria-label="Suite tree panel"
    >
      <div class="px-3 py-2 border-b border-surface-border">
        <span class="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          {{ suite.name }}
        </span>
      </div>
      <div class="flex-1 overflow-hidden">
        <SuiteTreePanel
          :definition="definition"
          :selected-test-case-id="editorStore.selectedTestCaseId"
          :expanded-group-ids="editorStore.expandedGroupIds"
          :results="runsStore.currentRun?.results ?? []"
          @select="onSelectTestCase"
          @toggle-group="editorStore.toggleGroup"
          @add-group="onAddGroup"
          @add-test-case="onAddTestCase"
          @remove-group="onRemoveGroup"
          @remove-test-case="onRemoveTestCase"
          @run-test-case="onRunTestCase"
        />
      </div>
    </div>

    <!-- Editor panel -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- Fetch error -->
      <div
        v-if="suiteStore.errorSuite"
        role="alert"
        class="m-4 px-3 py-2 rounded-md bg-error/10 border border-error/30 text-sm text-error"
      >
        {{ suiteStore.errorSuite }}
      </div>

      <!-- Loading state -->
      <div v-if="suiteStore.loadingSuite" class="p-4 text-sm text-text-secondary">
        Loading suite...
      </div>

      <!-- Dual-mode editor -->
      <div v-else class="flex-1 overflow-hidden flex flex-col">
        <!-- Editor action header: Run Suite button + RunSummaryBadge -->
        <div
          class="flex items-center justify-end gap-2 px-3 py-2 border-b border-surface-border shrink-0"
          aria-label="Editor actions"
        >
          <RunSummaryBadge :run="runsStore.currentRun" />
          <AppButton
            variant="primary"
            :loading="isRunning"
            :disabled="!hasFixture"
            :title="!hasFixture ? 'No fixture — add one to run tests' : undefined"
            aria-label="Run Suite"
            data-testid="run-suite-button"
            @click="runSuite"
          >
            Run Suite
          </AppButton>
        </div>

        <!-- Phase timeline — shown whenever there is an active/completed run -->
        <div
          v-if="runsStore.currentRun !== null"
          class="border-b border-surface-border shrink-0"
          data-testid="phase-timeline-container"
        >
          <RunPhaseTimeline :run="runsStore.currentRun" :total-test-cases="totalTestCases" />
        </div>

        <!-- Polling error banner -->
        <div
          v-if="runsStore.pollingError"
          role="alert"
          class="mx-3 mt-2 px-3 py-2 rounded-md bg-warning/10 border border-warning/30 text-sm text-warning flex items-center gap-2 shrink-0"
          data-testid="polling-error-banner"
        >
          <span class="flex-1">{{ runsStore.pollingError }}</span>
          <button
            class="text-xs font-medium underline hover:no-underline"
            data-testid="polling-retry-button"
            @click="runsStore.retryPolling()"
          >
            Retry
          </button>
        </div>

        <!-- Tab header (manual, to keep both panels mounted via v-show) -->
        <div class="flex border-b border-surface-border shrink-0" role="tablist">
          <button
            v-for="tab in EDITOR_TABS"
            :key="tab.key"
            role="tab"
            :aria-selected="editorStore.editorMode === tab.key"
            :class="[
              'px-4 py-2 text-sm font-medium transition-colors -mb-px',
              'focus:outline-none focus:ring-2 focus:ring-info focus:ring-inset',
              editorStore.editorMode === tab.key
                ? 'border-b-2 border-info text-text-emphasis'
                : 'text-text-secondary hover:text-text-primary',
            ]"
            @click="editorStore.setEditorMode(tab.key as 'form' | 'json' | 'fixture')"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Form panel (v-show to keep JSON editor mounted) -->
        <div
          v-show="editorStore.editorMode === 'form'"
          role="tabpanel"
          class="flex flex-col flex-1 overflow-y-auto p-4"
        >
          <!-- JSON has errors banner -->
          <div
            v-if="jsonHasErrors"
            role="alert"
            class="mb-4 px-3 py-2 rounded-md bg-error/10 border border-error/30 text-sm text-error"
            data-testid="json-errors-banner"
          >
            JSON has errors — fix in JSON tab
          </div>

          <!-- Test case form -->
          <div v-else-if="selectedTestCase" class="max-w-lg">
            <TestCaseForm
              :test-case="selectedTestCase.tc"
              :group-id="selectedGroupId!"
              :result="selectedTestCaseResult"
              @update="onTestCaseUpdate"
            />
          </div>

          <!-- No selection -->
          <div
            v-else
            class="flex flex-col items-center justify-center h-full text-center py-16"
          >
            <p class="text-sm text-text-secondary mb-1">No test case selected</p>
            <p class="text-xs text-text-secondary/60">
              Select a test case from the tree, or add a group to get started.
            </p>
          </div>

          <!-- JSON synced indicator -->
          <div
            v-if="!jsonHasErrors"
            class="mt-auto pt-4 text-xs text-success"
            data-testid="json-synced"
          >
            JSON synced ✓
          </div>
        </div>

        <!-- JSON panel (v-show keeps SuiteJsonEditor mounted → no CodeMirror re-init on tab switch) -->
        <div
          v-show="editorStore.editorMode === 'json'"
          role="tabpanel"
          class="flex-1 overflow-hidden"
        >
          <SuiteJsonEditor
            :model-value="jsonString"
            @update:model-value="onJsonChange"
            @has-errors="jsonHasErrors = $event"
          />
        </div>

        <!-- Fixture panel -->
        <div
          v-show="editorStore.editorMode === 'fixture'"
          role="tabpanel"
          class="flex-1 overflow-hidden"
        >
          <FixtureEditor :suite="suite" />
        </div>
      </div>
    </div>
  </div>
</template>
