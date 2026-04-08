<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, Plus, Trash2, CheckCircle2, XCircle, Play } from 'lucide-vue-next'
import type { SuiteDefinition, TestGroup, TestCase } from '@/stores/suites'
import type { RunResult } from '@/stores/runs'

const props = defineProps<{
  definition: SuiteDefinition
  selectedTestCaseId: string | null
  expandedGroupIds: Set<string>
  results?: RunResult[]
}>()

const emit = defineEmits<{
  'select': [testCase: TestCase, groupId: string]
  'toggle-group': [groupId: string]
  'add-group': []
  'add-test-case': [groupId: string]
  'remove-group': [groupId: string]
  'remove-test-case': [groupId: string, testCaseId: string]
  'run-test-case': [groupId: string, testCaseId: string]
}>()

type FlatNode =
  | { type: 'group'; id: string; group: TestGroup }
  | { type: 'test'; id: string; groupId: string; testCase: TestCase }

function resultKey(user: string, relation: string, object: string, expected: boolean): string {
  return `${user}:${relation}:${object}:${expected}`
}

const resultByKey = computed(() => {
  const map = new Map<string, RunResult>()
  for (const r of props.results ?? []) {
    map.set(resultKey(r.testCase.user, r.testCase.relation, r.testCase.object, r.testCase.expected), r)
  }
  return map
})

function getResult(tc: TestCase): RunResult | undefined {
  return resultByKey.value.get(resultKey(tc.user, tc.relation, tc.object, tc.expected))
}

function sortedTestCases(group: TestGroup): TestCase[] {
  if ((props.results ?? []).length === 0) return group.testCases
  return [...group.testCases].sort((a, b) => {
    const ra = getResult(a)
    const rb = getResult(b)
    const score = (r?: RunResult) => (!r ? 1 : r.passed ? 2 : 0)
    return score(ra) - score(rb)
  })
}

const groupRatioMap = computed(() => {
  const map = new Map<string, { passed: number; total: number } | null>()
  if ((props.results ?? []).length === 0) return map
  for (const group of props.definition.groups) {
    const relevant = group.testCases.filter((tc) => getResult(tc) !== undefined)
    map.set(group.id, relevant.length === 0 ? null : {
      passed: relevant.filter((tc) => getResult(tc)?.passed).length,
      total: relevant.length,
    })
  }
  return map
})

function groupRatio(group: TestGroup): { passed: number; total: number } | null {
  return groupRatioMap.value.get(group.id) ?? null
}

const flatNodes = computed((): FlatNode[] => {
  const nodes: FlatNode[] = []
  for (const group of props.definition.groups) {
    nodes.push({ type: 'group', id: group.id, group })
    if (props.expandedGroupIds.has(group.id)) {
      for (const tc of sortedTestCases(group)) {
        nodes.push({ type: 'test', id: tc.id, groupId: group.id, testCase: tc })
      }
    }
  }
  return nodes
})

const focusedNodeId = ref<string | null>(null)
const treeRoot = ref<HTMLElement | null>(null)

function focusNode(id: string) {
  focusedNodeId.value = id
  const el = treeRoot.value?.querySelector(`[data-node-id="${id}"]`) as HTMLElement | null
  el?.focus()
}

function onKeydown(event: KeyboardEvent) {
  const nodes = flatNodes.value
  if (nodes.length === 0) return

  const currentIndex = focusedNodeId.value
    ? nodes.findIndex((n) => n.id === focusedNodeId.value)
    : -1

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    const next = currentIndex < nodes.length - 1 ? currentIndex + 1 : 0
    focusNode(nodes[next].id)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    const prev = currentIndex > 0 ? currentIndex - 1 : nodes.length - 1
    focusNode(nodes[prev].id)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    const node = currentIndex >= 0 ? nodes[currentIndex] : null
    if (node?.type === 'group' && !props.expandedGroupIds.has(node.id)) {
      emit('toggle-group', node.id)
    }
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    const node = currentIndex >= 0 ? nodes[currentIndex] : null
    if (!node) return
    if (node.type === 'group' && props.expandedGroupIds.has(node.id)) {
      emit('toggle-group', node.id)
    } else if (node.type === 'test') {
      focusNode(node.groupId)
    }
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const node = currentIndex >= 0 ? nodes[currentIndex] : null
    if (node?.type === 'test') {
      emit('select', node.testCase, node.groupId)
    } else if (node?.type === 'group') {
      emit('toggle-group', node.id)
    }
  }
}

function getGroupTestCount(group: TestGroup): string {
  const count = group.testCases.length
  return count === 1 ? '1 test' : `${count} tests`
}

function getTestCaseLabel(tc: TestCase): string {
  if (tc.name) return tc.name
  if (tc.user || tc.relation || tc.object) {
    return [tc.user, tc.relation, tc.object].filter(Boolean).join(' → ')
  }
  return 'Untitled test'
}
</script>

<template>
  <div
    ref="treeRoot"
    role="tree"
    aria-label="Suite tree"
    class="flex flex-col h-full overflow-y-auto py-2 focus:outline-none"
    tabindex="-1"
    @keydown="onKeydown"
  >
    <!-- Groups -->
    <template v-for="group in definition.groups" :key="group.id">
      <!-- Group header -->
      <div
        role="treeitem"
        :aria-expanded="expandedGroupIds.has(group.id)"
        :data-node-id="group.id"
        tabindex="-1"
        :class="[
          'flex items-center gap-1 px-2 py-1.5 cursor-pointer select-none',
          'text-xs font-semibold text-text-secondary uppercase tracking-wide',
          'hover:bg-surface-border rounded mx-1 group/item',
          'focus:outline-none focus:bg-surface-border',
        ]"
        @click="emit('toggle-group', group.id)"
        @focus="focusedNodeId = group.id"
      >
        <ChevronRight
          :class="[
            'size-3 shrink-0 transition-transform',
            expandedGroupIds.has(group.id) ? 'rotate-90' : '',
          ]"
          aria-hidden="true"
        />
        <span class="flex-1 truncate">{{ group.name }}</span>
        <!-- Group result ratio badge -->
        <span
          v-if="groupRatio(group)"
          :class="[
            'font-normal normal-case tracking-normal px-1.5 py-0.5 rounded text-xs',
            groupRatio(group)!.passed === groupRatio(group)!.total ? 'text-success' : 'text-error',
          ]"
          :data-testid="`group-result-badge-${group.id}`"
        >
          {{ groupRatio(group)!.passed }}/{{ groupRatio(group)!.total }}
        </span>
        <span v-else class="text-text-secondary/60 font-normal normal-case tracking-normal">
          {{ getGroupTestCount(group) }}
        </span>
        <!-- Group actions -->
        <button
          :aria-label="`Add test case to ${group.name}`"
          class="opacity-0 group-hover/item:opacity-100 p-0.5 rounded hover:text-info focus:opacity-100 focus:outline-none"
          @click.stop="emit('add-test-case', group.id)"
        >
          <Plus class="size-3" aria-hidden="true" />
        </button>
        <button
          :aria-label="`Remove group ${group.name}`"
          class="opacity-0 group-hover/item:opacity-100 p-0.5 rounded hover:text-error focus:opacity-100 focus:outline-none"
          @click.stop="emit('remove-group', group.id)"
        >
          <Trash2 class="size-3" aria-hidden="true" />
        </button>
      </div>

      <!-- Test cases (visible when group expanded) -->
      <template v-if="expandedGroupIds.has(group.id)">
        <div
          v-for="tc in sortedTestCases(group)"
          :key="tc.id"
          role="treeitem"
          :data-node-id="tc.id"
          tabindex="-1"
          :class="[
            'flex items-center gap-2 pl-6 pr-2 py-1.5 cursor-pointer select-none',
            'text-sm rounded mx-1 group/item',
            'hover:bg-surface-border',
            'focus:outline-none focus:bg-surface-border',
            selectedTestCaseId === tc.id
              ? 'bg-info/10 text-text-emphasis font-medium'
              : 'text-text-primary',
          ]"
          @click="emit('select', tc, group.id)"
          @focus="focusedNodeId = tc.id"
        >
          <!-- Result icon or expected dot -->
          <CheckCircle2
            v-if="getResult(tc)?.passed === true"
            class="size-3.5 shrink-0 text-success"
            aria-hidden="true"
            :data-testid="`tc-result-pass-${tc.id}`"
          />
          <XCircle
            v-else-if="getResult(tc) && !getResult(tc)!.passed"
            class="size-3.5 shrink-0 text-error"
            aria-hidden="true"
            :data-testid="`tc-result-fail-${tc.id}`"
          />
          <span
            v-else
            :class="[
              'size-2 rounded-full shrink-0',
              tc.expected === true ? 'bg-success' : 'bg-error',
            ]"
            aria-hidden="true"
          />
          <span class="flex-1 truncate">{{ getTestCaseLabel(tc) }}</span>
          <!-- Run test case button -->
          <button
            :aria-label="`Run test case`"
            class="opacity-0 group-hover/item:opacity-100 p-0.5 rounded hover:text-info focus:opacity-100 focus:outline-none"
            data-testid="run-tc-button"
            @click.stop="emit('run-test-case', group.id, tc.id)"
          >
            <Play class="size-3" aria-hidden="true" />
          </button>
          <button
            :aria-label="`Remove test ${getTestCaseLabel(tc)}`"
            class="opacity-0 group-hover/item:opacity-100 p-0.5 rounded hover:text-error focus:opacity-100 focus:outline-none"
            @click.stop="emit('remove-test-case', group.id, tc.id)"
          >
            <Trash2 class="size-3" aria-hidden="true" />
          </button>
        </div>
      </template>
    </template>

    <!-- Empty state -->
    <div
      v-if="definition.groups.length === 0"
      class="px-3 py-4 text-sm text-text-secondary text-center"
    >
      No groups yet. Click "+ Group" to add one.
    </div>

    <!-- Add group button -->
    <button
      class="flex items-center gap-1.5 px-3 py-2 mt-1 mx-1 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-border rounded transition-colors focus:outline-none focus:bg-surface-border"
      @click="emit('add-group')"
    >
      <Plus class="size-3" aria-hidden="true" />
      Group
    </button>
  </div>
</template>
