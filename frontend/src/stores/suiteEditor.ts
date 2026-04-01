import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useSuiteEditorStore = defineStore('suiteEditor', () => {
  const selectedTestCaseId = ref<string | null>(null)
  const expandedGroupIds = ref<Set<string>>(new Set())
  const metadataExpanded = ref(false)

  function selectTestCase(id: string | null) {
    selectedTestCaseId.value = id
  }

  function toggleGroup(id: string) {
    const updated = new Set(expandedGroupIds.value)
    if (updated.has(id)) {
      updated.delete(id)
    } else {
      updated.add(id)
    }
    expandedGroupIds.value = updated
  }

  function expandGroup(id: string) {
    const updated = new Set(expandedGroupIds.value)
    updated.add(id)
    expandedGroupIds.value = updated
  }

  function collapseGroup(id: string) {
    const updated = new Set(expandedGroupIds.value)
    updated.delete(id)
    expandedGroupIds.value = updated
  }

  const editorMode = ref<'form' | 'json' | 'fixture'>('form')

  function setEditorMode(mode: 'form' | 'json' | 'fixture') {
    editorMode.value = mode
  }

  function clearExpandedGroups() {
    expandedGroupIds.value = new Set()
  }

  function toggleMetadata() {
    metadataExpanded.value = !metadataExpanded.value
  }

  return {
    selectedTestCaseId,
    expandedGroupIds,
    metadataExpanded,
    editorMode,
    selectTestCase,
    toggleGroup,
    expandGroup,
    collapseGroup,
    clearExpandedGroups,
    toggleMetadata,
    setEditorMode,
  }
})
