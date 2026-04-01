<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { lintGutter, linter } from '@codemirror/lint'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'has-errors': [hasErrors: boolean]
}>()

const container = ref<HTMLElement | null>(null)
let view: EditorView | null = null

function hasParseErrors(value: string): boolean {
  try {
    JSON.parse(value)
    return false
  } catch {
    return true
  }
}

const errorCount = ref(hasParseErrors(props.modelValue) ? 1 : 0)

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
      editorTheme,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const value = update.state.doc.toString()
          const errors = hasParseErrors(value)
          errorCount.value = errors ? 1 : 0
          emit('update:modelValue', value)
          emit('has-errors', errors)
        }
      }),
    ],
  })

  view = new EditorView({
    state: startState,
    parent: container.value,
  })

  // Emit initial error state
  const initialErrors = hasParseErrors(props.modelValue)
  errorCount.value = initialErrors ? 1 : 0
  emit('has-errors', initialErrors)
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (!view) return
    const currentVal = view.state.doc.toString()
    // Skip update if JSON is semantically equivalent (avoids cursor jumping)
    try {
      if (JSON.stringify(JSON.parse(currentVal)) === JSON.stringify(JSON.parse(newVal))) return
    } catch {
      // If either is invalid JSON, fall through and update the editor
    }
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
    <div ref="container" data-testid="json-editor" class="flex-1 overflow-hidden" />
    <div
      class="px-3 py-1 text-xs border-t border-surface-border flex items-center gap-2 shrink-0"
    >
      <span v-if="errorCount > 0" class="text-error" data-testid="json-error-count">
        {{ errorCount }} error
      </span>
      <span v-else class="text-success" data-testid="json-valid">Valid JSON</span>
    </div>
  </div>
</template>
