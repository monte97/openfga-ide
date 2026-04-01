import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import type { RunSummary } from '@/stores/runs'
import type { ImportSuitePayload } from '@/schemas/suite'

export interface SuiteListItem {
  id: string
  name: string
  description: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  lastRun: { status: string; summary: RunSummary | null } | null
}

export interface CreateSuiteInput {
  name: string
  description?: string
  tags?: string[]
}

export interface TestCase {
  id: string
  name?: string
  user: string
  relation: string
  object: string
  expected: boolean
  description?: string
  tags?: string[]
  severity?: 'critical' | 'warning' | 'info'
}

export interface TestGroup {
  id: string
  name: string
  description?: string
  testCases: TestCase[]
}

export interface SuiteFixture {
  model?: unknown
  tuples?: unknown[]
}

export interface SuiteDefinition {
  fixture?: SuiteFixture
  groups: TestGroup[]
}

export interface Suite extends SuiteListItem {
  definition: SuiteDefinition
}

export const useSuiteStore = defineStore('suites', () => {
  const api = useApi()
  const toast = useToast()

  const suites = ref<SuiteListItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeSuite = ref<Suite | null>(null)
  const loadingSuite = ref(false)
  const errorSuite = ref<string | null>(null)

  async function fetchSuites(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const data = await api.get<{ suites: SuiteListItem[] }>('suites')
      suites.value = data.suites
    } catch (err) {
      error.value = (err as Error).message
    } finally {
      loading.value = false
    }
  }

  async function createSuite(input: CreateSuiteInput): Promise<SuiteListItem> {
    const suite = await api.post<SuiteListItem>('suites', input)
    suites.value = [suite, ...suites.value]
    toast.show({ type: 'success', message: 'Suite created' })
    return suite
  }

  async function deleteSuite(id: string): Promise<void> {
    await api.del<void>(`suites/${id}`)
    suites.value = suites.value.filter((s) => s.id !== id)
    if (activeSuite.value?.id === id) {
      activeSuite.value = null
    }
    toast.show({ type: 'success', message: 'Suite deleted' })
  }

  async function fetchSuite(id: string): Promise<void> {
    loadingSuite.value = true
    errorSuite.value = null
    try {
      const data = await api.get<Suite>(`suites/${id}`)
      // Backend does not persist group/testCase IDs — assign locally on load
      activeSuite.value = {
        ...data,
        definition: data.definition
          ? {
              fixture: data.definition.fixture,
              groups: (data.definition.groups ?? []).map((g) => ({
                ...g,
                id: (g as { id?: string }).id || crypto.randomUUID(),
                testCases: (g.testCases ?? []).map((t) => ({
                  ...t,
                  id: (t as { id?: string }).id || crypto.randomUUID(),
                })),
              })),
            }
          : { groups: [] },
      }
    } catch (err) {
      errorSuite.value = (err as Error).message
    } finally {
      loadingSuite.value = false
    }
  }

  async function saveDefinition(id: string, definition: SuiteDefinition): Promise<void> {
    await api.put<Suite>(`suites/${id}`, { definition })
    if (activeSuite.value?.id === id) {
      activeSuite.value = { ...activeSuite.value, definition }
    }
  }

  function addGroup(): void {
    if (!activeSuite.value) return
    const group: TestGroup = {
      id: crypto.randomUUID(),
      name: 'New Group',
      testCases: [],
    }
    activeSuite.value = {
      ...activeSuite.value,
      definition: {
        fixture: activeSuite.value.definition.fixture,
        groups: [...activeSuite.value.definition.groups, group],
      },
    }
  }

  function removeGroup(groupId: string): void {
    if (!activeSuite.value) return
    activeSuite.value = {
      ...activeSuite.value,
      definition: {
        fixture: activeSuite.value.definition.fixture,
        groups: activeSuite.value.definition.groups.filter((g) => g.id !== groupId),
      },
    }
  }

  function updateGroup(groupId: string, patch: Partial<Pick<TestGroup, 'name' | 'description'>>): void {
    if (!activeSuite.value) return
    activeSuite.value = {
      ...activeSuite.value,
      definition: {
        fixture: activeSuite.value.definition.fixture,
        groups: activeSuite.value.definition.groups.map((g) =>
          g.id === groupId ? { ...g, ...patch } : g
        ),
      },
    }
  }

  function addTestCase(groupId: string): TestCase {
    const testCase: TestCase = {
      id: crypto.randomUUID(),
      user: '',
      relation: '',
      object: '',
      expected: true,
    }
    if (activeSuite.value) {
      activeSuite.value = {
        ...activeSuite.value,
        definition: {
          fixture: activeSuite.value.definition.fixture,
          groups: activeSuite.value.definition.groups.map((g) =>
            g.id === groupId ? { ...g, testCases: [...g.testCases, testCase] } : g
          ),
        },
      }
    }
    return testCase
  }

  function updateTestCase(groupId: string, testCaseId: string, patch: Partial<TestCase>): void {
    if (!activeSuite.value) return
    activeSuite.value = {
      ...activeSuite.value,
      definition: {
        fixture: activeSuite.value.definition.fixture,
        groups: activeSuite.value.definition.groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                testCases: g.testCases.map((t) => (t.id === testCaseId ? { ...t, ...patch } : t)),
              }
            : g
        ),
      },
    }
  }

  function removeTestCase(groupId: string, testCaseId: string): void {
    if (!activeSuite.value) return
    activeSuite.value = {
      ...activeSuite.value,
      definition: {
        fixture: activeSuite.value.definition.fixture,
        groups: activeSuite.value.definition.groups.map((g) =>
          g.id === groupId
            ? { ...g, testCases: g.testCases.filter((t) => t.id !== testCaseId) }
            : g
        ),
      },
    }
  }

  async function importSuite(payload: ImportSuitePayload): Promise<SuiteListItem> {
    const suite = await api.post<SuiteListItem>('suites', payload)
    suites.value = [suite, ...suites.value]
    const groupCount = payload.definition?.groups.length ?? 0
    const testCount = payload.definition?.groups.reduce((s, g) => s + g.testCases.length, 0) ?? 0
    toast.show({ type: 'success', message: `Imported '${suite.name}' (${groupCount} groups, ${testCount} tests)` })
    return suite
  }

  async function exportSuite(suiteId: string, suiteName: string): Promise<void> {
    try {
      const payload = await api.get<{ name: string; description: string | null; tags: string[]; definition: unknown }>(`suites/${suiteId}/export`)
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${suiteName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.show({ type: 'success', message: `Suite '${suiteName}' exported` })
    } catch (err) {
      toast.show({ type: 'error', message: (err as Error).message || 'Export failed' })
    }
  }

  function patchDefinition(definition: SuiteDefinition): void {
    if (!activeSuite.value) return
    activeSuite.value = { ...activeSuite.value, definition }
  }

  function updateFixture(fixture: SuiteFixture | null): void {
    if (!activeSuite.value) return
    activeSuite.value = {
      ...activeSuite.value,
      definition: {
        ...activeSuite.value.definition,
        fixture: fixture ?? undefined,
      },
    }
  }

  return {
    suites,
    loading,
    error,
    activeSuite,
    loadingSuite,
    errorSuite,
    fetchSuites,
    createSuite,
    deleteSuite,
    fetchSuite,
    saveDefinition,
    addGroup,
    removeGroup,
    updateGroup,
    addTestCase,
    updateTestCase,
    removeTestCase,
    patchDefinition,
    updateFixture,
    exportSuite,
    importSuite,
  }
})
