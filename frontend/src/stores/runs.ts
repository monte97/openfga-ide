import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'

export type RunStatus = 'pending' | 'provisioning' | 'running' | 'completed' | 'failed'

export interface RunSummary {
  total: number
  passed: number
  failed: number
  errored: number
  durationMs: number
}

export interface RunResultTestCase {
  user: string
  relation: string
  object: string
  expected: boolean
}

export interface RunResult {
  testCase: RunResultTestCase
  actual: boolean | null
  passed: boolean
  durationMs: number
  error: string | null
}

export interface Run {
  id: string
  suiteId: string
  status: RunStatus
  startedAt: string | null
  completedAt: string | null
  error: string | null
  summary: RunSummary | null
  createdAt: string
  results: RunResult[]
}

const MAX_POLL_ERRORS = 5

export const useRunStore = defineStore('runs', () => {
  const api = useApi()
  const currentRun = ref<Run | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pollInterval = ref<ReturnType<typeof setInterval> | null>(null)
  const consecutiveErrors = ref(0)
  const pollingError = ref<string | null>(null)

  async function triggerRun(suiteId: string, testCaseId?: string): Promise<string> {
    loading.value = true
    error.value = null
    consecutiveErrors.value = 0
    pollingError.value = null
    try {
      currentRun.value = null
      const body = testCaseId ? { testCaseId } : {}
      const data = await api.post<{ runId: string }>(`suites/${suiteId}/run`, body)
      startPolling(data.runId)
      return data.runId
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchRun(runId: string): Promise<void> {
    // Use raw fetch (not useApi) to avoid toasting on every polling error.
    try {
      const res = await fetch(`/api/runs/${runId}`)
      if (!res.ok) {
        consecutiveErrors.value++
        if (consecutiveErrors.value >= MAX_POLL_ERRORS) {
          stopPolling()
          pollingError.value = 'Polling stopped after repeated failures. Check network and retry.'
        }
        return
      }
      const run = (await res.json()) as Run
      currentRun.value = run
      consecutiveErrors.value = 0
      if (run.status === 'completed' || run.status === 'failed') {
        stopPolling()
      }
    } catch {
      consecutiveErrors.value++
      if (consecutiveErrors.value >= MAX_POLL_ERRORS) {
        stopPolling()
        pollingError.value = 'Polling stopped after repeated failures. Check network and retry.'
      }
    }
  }

  function retryPolling(): void {
    consecutiveErrors.value = 0
    pollingError.value = null
    if (currentRun.value?.id) startPolling(currentRun.value.id)
  }

  function startPolling(runId: string): void {
    stopPolling()
    // Assign interval BEFORE the immediate fetch so stopPolling() can clear it
    // if the run completes synchronously on the first call.
    pollInterval.value = setInterval(() => {
      void fetchRun(runId)
    }, 2000)
    void fetchRun(runId)
  }

  function stopPolling(): void {
    if (pollInterval.value !== null) {
      clearInterval(pollInterval.value)
      pollInterval.value = null
    }
  }

  function clearRun(): void {
    currentRun.value = null
    error.value = null
    consecutiveErrors.value = 0
    pollingError.value = null
    stopPolling()
  }

  return { currentRun, loading, error, pollInterval, consecutiveErrors, pollingError, triggerRun, fetchRun, startPolling, stopPolling, clearRun, retryPolling }
})
