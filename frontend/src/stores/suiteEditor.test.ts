import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSuiteEditorStore } from './suiteEditor'

describe('useSuiteEditorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has empty initial state', () => {
    const store = useSuiteEditorStore()
    expect(store.selectedTestCaseId).toBeNull()
    expect(store.expandedGroupIds.size).toBe(0)
    expect(store.metadataExpanded).toBe(false)
  })

  describe('selectTestCase()', () => {
    it('sets selectedTestCaseId', () => {
      const store = useSuiteEditorStore()
      store.selectTestCase('test-1')
      expect(store.selectedTestCaseId).toBe('test-1')
    })

    it('clears selectedTestCaseId when passed null', () => {
      const store = useSuiteEditorStore()
      store.selectTestCase('test-1')
      store.selectTestCase(null)
      expect(store.selectedTestCaseId).toBeNull()
    })
  })

  describe('toggleGroup()', () => {
    it('expands a collapsed group', () => {
      const store = useSuiteEditorStore()
      store.toggleGroup('group-1')
      expect(store.expandedGroupIds.has('group-1')).toBe(true)
    })

    it('collapses an expanded group', () => {
      const store = useSuiteEditorStore()
      store.toggleGroup('group-1')
      store.toggleGroup('group-1')
      expect(store.expandedGroupIds.has('group-1')).toBe(false)
    })

    it('replacing Set triggers reactivity', () => {
      const store = useSuiteEditorStore()
      const before = store.expandedGroupIds
      store.toggleGroup('group-1')
      expect(store.expandedGroupIds).not.toBe(before)
    })
  })

  describe('expandGroup()', () => {
    it('adds group id to expandedGroupIds', () => {
      const store = useSuiteEditorStore()
      store.expandGroup('group-1')
      expect(store.expandedGroupIds.has('group-1')).toBe(true)
    })
  })

  describe('collapseGroup()', () => {
    it('removes group id from expandedGroupIds', () => {
      const store = useSuiteEditorStore()
      store.expandGroup('group-1')
      store.collapseGroup('group-1')
      expect(store.expandedGroupIds.has('group-1')).toBe(false)
    })
  })

  describe('toggleMetadata()', () => {
    it('toggles metadataExpanded', () => {
      const store = useSuiteEditorStore()
      store.toggleMetadata()
      expect(store.metadataExpanded).toBe(true)
      store.toggleMetadata()
      expect(store.metadataExpanded).toBe(false)
    })
  })

  describe('setEditorMode()', () => {
    it('defaults to form mode', () => {
      const store = useSuiteEditorStore()
      expect(store.editorMode).toBe('form')
    })

    it('sets editorMode to json', () => {
      const store = useSuiteEditorStore()
      store.setEditorMode('json')
      expect(store.editorMode).toBe('json')
    })

    it('sets editorMode to fixture', () => {
      const store = useSuiteEditorStore()
      store.setEditorMode('fixture')
      expect(store.editorMode).toBe('fixture')
    })

    it('sets editorMode back to form', () => {
      const store = useSuiteEditorStore()
      store.setEditorMode('json')
      store.setEditorMode('form')
      expect(store.editorMode).toBe('form')
    })
  })
})
