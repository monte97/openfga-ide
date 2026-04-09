<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronRight, ChevronDown } from 'lucide-vue-next'
import type { UsersetTree } from '@/stores/queries'
import TypeBadge from '@/components/common/TypeBadge.vue'

const props = defineProps<{
  node: UsersetTree
  defaultExpanded?: boolean
}>()

const expanded = ref(props.defaultExpanded ?? false)

function extractTypeName(name: string): string {
  const base = name.includes('#') ? (name.split('#')[0] ?? name) : name
  return base.split(':')[0] ?? base
}

const nodeType = computed<string | null>(() => {
  if (props.node.union) return 'union'
  if (props.node.intersection) return 'intersection'
  if (props.node.difference) return 'difference'
  return null
})

const children = computed<UsersetTree[]>(() => {
  if (props.node.union?.nodes) return props.node.union.nodes
  if (props.node.intersection?.nodes) return props.node.intersection.nodes
  if (props.node.difference) return [props.node.difference.base, props.node.difference.subtract].filter((n): n is UsersetTree => n != null)
  return []
})

const hasChildren = computed(() => children.value.length > 0)

const leafUsers = computed<string[]>(() => props.node.leaf?.users?.users ?? [])
const leafComputed = computed<string | null>(() => props.node.leaf?.computed?.userset ?? null)
const leafTupleToUserset = computed(() => props.node.leaf?.tupleToUserset ?? null)
const isLeaf = computed(
  () => !hasChildren.value && (leafUsers.value.length > 0 || leafComputed.value || leafTupleToUserset.value),
)
const isUnknown = computed(() => !hasChildren.value && !isLeaf.value)

const leafTupleComputedItems = computed<string[]>(() => {
  const items = props.node.leaf?.tupleToUserset?.computed ?? []
  return items
    .map((c) => {
      const asUserset = c as unknown as { userset?: string }
      return asUserset.userset ?? (c as UsersetTree).name ?? ''
    })
    .filter(Boolean)
})
</script>

<template>
  <div class="pl-4" role="treeitem" :aria-expanded="hasChildren ? expanded : undefined">
    <div class="flex items-center gap-2 py-0.5">
      <button
        v-if="hasChildren"
        class="p-0.5 hover:bg-surface-elevated rounded flex-shrink-0"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <ChevronDown v-if="expanded" class="size-4 text-text-secondary" />
        <ChevronRight v-else class="size-4 text-text-secondary" />
      </button>
      <span v-else class="size-5 flex-shrink-0" />
      <TypeBadge :type-name="extractTypeName(node.name)" />
      <span class="font-mono text-sm text-text-primary">{{ node.name }}</span>
      <span v-if="nodeType" class="text-xs text-text-secondary">({{ nodeType }})</span>
    </div>

    <!-- Leaf: direct users -->
    <template v-if="isLeaf">
      <div v-if="leafUsers.length" class="pl-9 space-y-1 py-1">
        <div v-for="user in leafUsers" :key="user" class="flex items-center gap-2">
          <TypeBadge :type-name="user.split(':')[0] || user" />
          <span class="font-mono text-sm text-text-primary">{{ user }}</span>
        </div>
      </div>
      <div v-if="leafComputed" class="pl-9 flex items-center gap-2 py-1">
        <TypeBadge :type-name="leafComputed.split(':')[0] || leafComputed" />
        <span class="font-mono text-sm text-text-primary">{{ leafComputed }}</span>
        <span class="text-xs text-text-secondary">(computed)</span>
      </div>
      <div v-if="leafTupleToUserset" class="pl-9 py-1 space-y-1">
        <span class="font-mono text-xs text-text-secondary block">
          tupleset: {{ leafTupleToUserset.tupleset }}
        </span>
        <div
          v-for="(item, ci) in leafTupleComputedItems"
          :key="ci"
          class="flex items-center gap-2"
        >
          <TypeBadge :type-name="item.split(':')[0] || item" />
          <span class="font-mono text-xs text-text-primary">{{ item }}</span>
          <span class="text-xs text-text-secondary">(computed)</span>
        </div>
      </div>
    </template>

    <!-- Unknown node: JSON fallback -->
    <div v-if="isUnknown" class="pl-9 py-1">
      <pre class="font-mono text-xs text-text-secondary overflow-auto max-h-32">{{ JSON.stringify(node, null, 2) }}</pre>
    </div>

    <!-- Children (union / intersection / difference) -->
    <div v-if="hasChildren && expanded" role="group">
      <ExpandTreeNode
        v-for="(child, i) in children"
        :key="i"
        :node="child"
        :default-expanded="false"
      />
    </div>
  </div>
</template>
