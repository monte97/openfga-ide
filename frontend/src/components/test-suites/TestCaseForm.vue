<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'
import type { TestCase } from '@/stores/suites'
import { useSuiteEditorStore } from '@/stores/suiteEditor'
import { useAutocompleteOptions } from '@/composables/useAutocompleteOptions'
import SearchableSelect from '@/components/common/SearchableSelect.vue'
import SentenceView from './SentenceView.vue'
import AppSelect from '@/components/common/AppSelect.vue'

const props = defineProps<{
  testCase: TestCase
  groupId: string
  result?: { passed: boolean; actual: boolean | null; durationMs?: number | null } | null
}>()

const emit = defineEmits<{
  'update': [groupId: string, testCaseId: string, patch: Partial<TestCase>]
}>()

const editorStore = useSuiteEditorStore()
const { userOptions, relationOptions, objectOptions } = useAutocompleteOptions()

// Local mirror — synced from prop; update triggers save
const localUser = ref(props.testCase.user)
const localRelation = ref(props.testCase.relation)
const localObject = ref(props.testCase.object)
const localExpected = ref<boolean>(props.testCase.expected)
const localDescription = ref(props.testCase.description ?? '')
const localTags = ref(props.testCase.tags?.join(', ') ?? '')
const localSeverity = ref<'critical' | 'warning' | 'info' | ''>(props.testCase.severity ?? '')

// Re-sync local state when the selected test case changes
watch(
  () => props.testCase,
  (tc) => {
    localUser.value = tc.user
    localRelation.value = tc.relation
    localObject.value = tc.object
    localExpected.value = tc.expected
    localDescription.value = tc.description ?? ''
    localTags.value = tc.tags?.join(', ') ?? ''
    localSeverity.value = tc.severity ?? ''
  }
)

function save(patch: Partial<TestCase>) {
  emit('update', props.groupId, props.testCase.id, patch)
}

function onUserUpdate(v: string) {
  localUser.value = v
  save({ user: v })
}

function onRelationUpdate(v: string) {
  localRelation.value = v
  save({ relation: v })
}

function onObjectUpdate(v: string) {
  localObject.value = v
  save({ object: v })
}

function toggleExpected() {
  localExpected.value = !localExpected.value
  save({ expected: localExpected.value })
}

function onDescriptionBlur() {
  const val = localDescription.value || undefined
  if (val === (props.testCase.description || undefined)) return
  save({ description: val })
}

function onTagsBlur() {
  const tags = localTags.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const newTags = tags.length > 0 ? tags : undefined
  const currentTags = props.testCase.tags?.filter(Boolean)
  const currentNormalized = currentTags && currentTags.length > 0 ? currentTags : undefined
  if (JSON.stringify(newTags) === JSON.stringify(currentNormalized)) return
  save({ tags: newTags })
}

function onSeverityChange(v: string | null) {
  localSeverity.value = (v as 'critical' | 'warning' | 'info') ?? ''
  save({ severity: (v as 'critical' | 'warning' | 'info') || undefined })
}

const severityOptions = [
  { value: '', label: 'None' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
]

const metadataExpanded = computed(() => editorStore.metadataExpanded)
</script>

<template>
  <div class="flex flex-col gap-4" aria-label="Test case form">
    <!-- User field -->
    <div>
      <label class="block text-xs text-text-secondary mb-1">User</label>
      <SearchableSelect
        :model-value="localUser"
        :options="userOptions"
        placeholder="e.g. user:alice"
        allow-free-text
        @update:model-value="onUserUpdate"
      />
    </div>

    <!-- Relation field -->
    <div>
      <label class="block text-xs text-text-secondary mb-1">Relation</label>
      <SearchableSelect
        :model-value="localRelation"
        :options="relationOptions"
        placeholder="e.g. viewer"
        allow-free-text
        @update:model-value="onRelationUpdate"
      />
    </div>

    <!-- Object field -->
    <div>
      <label class="block text-xs text-text-secondary mb-1">Object</label>
      <SearchableSelect
        :model-value="localObject"
        :options="objectOptions"
        placeholder="e.g. document:budget"
        allow-free-text
        @update:model-value="onObjectUpdate"
      />
    </div>

    <!-- Expected toggle -->
    <div>
      <label class="block text-xs text-text-secondary mb-1">Expected</label>
      <button
        :class="[
          'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors',
          'border focus:outline-none focus:ring-2 focus:ring-info',
          localExpected
            ? 'bg-success/10 border-success/30 text-success'
            : 'bg-error/10 border-error/30 text-error',
        ]"
        aria-label="Toggle expected result"
        @click="toggleExpected"
      >
        <span>{{ localExpected ? 'Allowed' : 'Denied' }}</span>
        <span class="text-xs opacity-60">click to toggle</span>
      </button>
    </div>

    <!-- Live sentence preview -->
    <SentenceView
      :user="localUser"
      :relation="localRelation"
      :object="localObject"
      :expected="localExpected"
      :result="result"
    />

    <!-- Metadata toggle -->
    <button
      class="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
      @click="editorStore.toggleMetadata()"
    >
      <component :is="metadataExpanded ? ChevronUp : ChevronDown" class="size-3" aria-hidden="true" />
      {{ metadataExpanded ? 'Hide metadata' : 'Show metadata ▾' }}
    </button>

    <!-- Metadata section -->
    <div v-show="metadataExpanded" class="flex flex-col gap-3 border-t border-surface-border pt-3">
      <!-- Description -->
      <div>
        <label class="block text-xs text-text-secondary mb-1">Description</label>
        <textarea
          v-model="localDescription"
          placeholder="Optional description"
          rows="2"
          class="w-full px-3 py-2 rounded-md text-sm bg-surface-card border border-surface-border text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-info resize-none"
          @blur="onDescriptionBlur"
        />
      </div>

      <!-- Tags -->
      <div>
        <label class="block text-xs text-text-secondary mb-1">Tags <span class="opacity-60">(comma-separated)</span></label>
        <input
          v-model="localTags"
          type="text"
          placeholder="e.g. auth, critical"
          class="w-full px-3 py-2 rounded-md text-sm bg-surface-card border border-surface-border text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-info"
          @blur="onTagsBlur"
        />
      </div>

      <!-- Severity -->
      <div>
        <label class="block text-xs text-text-secondary mb-1">Severity</label>
        <AppSelect
          :model-value="localSeverity || null"
          :options="severityOptions"
          placeholder="None"
          @update:model-value="onSeverityChange"
        />
      </div>
    </div>
  </div>
</template>
