<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { lintGutter, linter, type Diagnostic } from '@codemirror/lint'
import { importSuiteSchema, type ImportSuitePayload, type ZodIssue } from '@/schemas/suite'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'validation-result': [result: { valid: boolean; errors: ZodIssue[]; parsed: ImportSuitePayload | null }]
}>()

const container = ref<HTMLElement | null>(null)
let view: EditorView | null = null

function findPathOffset(text: string, path: (string | number)[]): number {
  // Walk path in order, advancing the search cursor after each matched key.
  // This prevents matching an earlier occurrence of the same key name.
  let cursor = 0
  for (const key of path) {
    if (typeof key === 'string') {
      const idx = text.indexOf(`"${key}"`, cursor)
      if (idx !== -1) cursor = idx
    }
  }
  return cursor
}

function zodLinter(editorView: EditorView): Diagnostic[] {
  const text = editorView.state.doc.toString()
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { return [] }

  const result = importSuiteSchema.safeParse(parsed)
  if (result.success) return []

  return result.error.issues.map((issue) => {
    const pathStr = issue.path.join('.')
    const offset = findPathOffset(text, issue.path)
    return {
      from: offset,
      to: offset + 1,
      severity: 'error' as const,
      message: `${pathStr}: ${issue.message}`,
    }
  })
}

function computeValidationResult(value: string): { valid: boolean; errors: ZodIssue[]; parsed: ImportSuitePayload | null } {
  let parsed: unknown = null
  try { parsed = JSON.parse(value) } catch {
    return { valid: false, errors: [], parsed: null }
  }
  const result = importSuiteSchema.safeParse(parsed)
  if (result.success) {
    return { valid: true, errors: [], parsed: result.data }
  }
  return { valid: false, errors: result.error.issues, parsed: null }
}

const schemaErrorCount = ref(0)

const editorTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '0.875rem' },
  '.cm-scroller': { overflow: 'auto', fontFamily: 'JetBrains Mono, monospace' },
  '.cm-content': { padding: '8px 0', minHeight: '200px' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none' },
  '.cm-lintRange-error': { borderBottom: '2px solid #ef4444' },
  '.cm-tooltip.cm-tooltip-lint': {
    backgroundColor: '#1e1e2e',
    color: '#cdd6f4',
    border: '1px solid #45475a',
  },
})

onMounted(() => {
  if (!container.value) return

  const startState = EditorState.create({
    doc: props.modelValue,
    extensions: [
      json(),
      lintGutter(),
      linter(jsonParseLinter()),
      linter((editorView) => zodLinter(editorView)),
      editorTheme,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return
        const value = update.state.doc.toString()
        emit('update:modelValue', value)
        const validationResult = computeValidationResult(value)
        schemaErrorCount.value = validationResult.errors.length
        emit('validation-result', validationResult)
      }),
    ],
  })

  view = new EditorView({ state: startState, parent: container.value })

  // Emit initial validation state
  const initial = computeValidationResult(props.modelValue)
  schemaErrorCount.value = initial.errors.length
  emit('validation-result', initial)
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (!view) return
    const currentVal = view.state.doc.toString()
    if (currentVal === newVal) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newVal },
    })
  },
)

onUnmounted(() => {
  view?.destroy()
  view = null
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div ref="container" data-testid="import-json-editor" class="flex-1 overflow-hidden" />
    <div class="px-3 py-1 text-xs border-t border-surface-border flex items-center gap-2 shrink-0">
      <span v-if="schemaErrorCount > 0" class="text-error" data-testid="import-schema-error-count">
        {{ schemaErrorCount }} schema error{{ schemaErrorCount !== 1 ? 's' : '' }}
      </span>
      <span v-else class="text-success" data-testid="import-schema-valid">Valid</span>
    </div>
  </div>
</template>
