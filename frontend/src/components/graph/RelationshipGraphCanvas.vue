<script setup lang="ts">
import { markRaw } from 'vue'
import { VueFlow } from '@vue-flow/core'
import type { NodeMouseEvent } from '@vue-flow/core'
import { Background, BackgroundVariant } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { GitBranch } from 'lucide-vue-next'
import { useRelationshipGraphStore } from '@/stores/relationshipGraph'
import EntityNode from './EntityNode.vue'
import GraphTypeFilter from './GraphTypeFilter.vue'
import GraphNodeDetail from './GraphNodeDetail.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const store = useRelationshipGraphStore()
const nodeTypes = markRaw({ entityNode: EntityNode })

function onNodeClick(event: NodeMouseEvent) {
  store.setSelectedNode(event.node.id)
}
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <!-- Type filter panel (shown when data is loaded) -->
    <GraphTypeFilter />

    <!-- Canvas area -->
    <div class="relative flex-1 min-h-0">
      <!-- Fetching data from API -->
      <LoadingSpinner v-if="store.loading" :full-view="true" />

      <!-- No tuples after successful fetch -->
      <EmptyState
        v-else-if="store.nodes.length === 0"
        :icon="GitBranch"
        title="No tuples to visualize"
        message="Add tuples to see the relationship graph"
        action-label="Go to Tuple Manager"
        action-to="/tuple-manager"
      />

      <!-- Computing dagre layout -->
      <LoadingSpinner v-else-if="!store.layoutDone" :full-view="true" />

      <!-- Graph ready -->
      <VueFlow
        v-else
        :nodes="store.visibleNodes"
        :edges="store.visibleEdges"
        :node-types="nodeTypes"
        fit-view-on-init
        :min-zoom="0.2"
        :max-zoom="2"
        class="vue-flow-dark"
        @node-click="onNodeClick"
      >
        <Background :variant="BackgroundVariant.Dots" color="#374151" />
        <Controls />
      </VueFlow>

      <!-- Inspector overlay -->
      <GraphNodeDetail />
    </div>
  </div>
</template>

<style scoped>
.vue-flow-dark {
  --vf-node-bg: #111827;
  --vf-node-text: #f3f4f6;
  --vf-edge-stroke: #9ca3af;
  --vf-handle-bg: #4b5563;
  --vf-controls-bg: #1f2937;
  --vf-controls-color: #f3f4f6;
  --vf-controls-border: #374151;
  background-color: #030712;
}
</style>
