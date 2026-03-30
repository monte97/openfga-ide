<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import type { ExpandTree, UsersetTree } from '@/stores/queries'
import TypeBadge from '@/components/common/TypeBadge.vue'

const props = defineProps<{
  expandTree: ExpandTree
  allowed: boolean
}>()

const router = useRouter()

interface ChainNode {
  entity: string
}

// Collects leaf users and computed userset hops from the tree (excluding root name)
function collectEntities(node: UsersetTree): string[] {
  if (node.leaf?.users?.users?.length) {
    return [...node.leaf.users.users]
  }
  if (node.leaf?.computed?.userset) {
    return [node.leaf.computed.userset]
  }
  if (node.union?.nodes?.length) {
    const seen = new Set<string>()
    const result: string[] = []
    for (const child of node.union.nodes) {
      for (const e of collectEntities(child)) {
        if (!seen.has(e)) {
          seen.add(e)
          result.push(e)
        }
      }
    }
    return result
  }
  return []
}

// Builds hop chain: [leaf_users / computed_hops...] → root_relation
const chainNodes = computed<ChainNode[]>(() => {
  const rootName = props.expandTree.root.name
  const entities = collectEntities(props.expandTree.root)
  const seen = new Set<string>()
  const chain: ChainNode[] = []
  for (const entity of entities) {
    if (!seen.has(entity)) {
      seen.add(entity)
      chain.push({ entity })
    }
  }
  if (!seen.has(rootName)) {
    chain.push({ entity: rootName })
  }
  return chain
})

function navigateTo(entity: string) {
  router.push(`/relationship-graph?entity=${encodeURIComponent(entity)}`)
}
</script>

<template>
  <div class="mt-4 flex flex-wrap items-center gap-2 p-4 bg-surface-card rounded-lg border border-surface-border">
    <template v-for="(node, i) in chainNodes" :key="node.entity">
      <button class="focus:outline-none" @click="navigateTo(node.entity)">
        <TypeBadge :type-name="node.entity" />
      </button>
      <ArrowRight v-if="i < chainNodes.length - 1" class="size-4 text-text-secondary" />
    </template>
    <span v-if="!allowed && chainNodes.length > 0" class="text-error text-sm font-medium">
      — denied here
    </span>
    <div v-if="chainNodes.length === 0" class="text-text-secondary text-sm">
      No resolution path found
    </div>
  </div>
</template>
