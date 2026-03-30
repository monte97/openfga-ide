<script setup lang="ts">
import { ref, markRaw } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Background, BackgroundVariant } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { Share2 } from 'lucide-vue-next'
import { useModelStore } from '@/stores/model'
import { useModelGraph } from '@/composables/useModelGraph'
import type { ModelNodeData } from '@/composables/useModelGraph'
import ModelTypeNode from './ModelTypeNode.vue'
import GraphNodeDetail from './GraphNodeDetail.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const modelStore = useModelStore()

const nodeTypes = markRaw({ typeNode: ModelTypeNode })
const { nodes, edges, layoutDone } = useModelGraph(modelStore.json)

const selectedNode = ref<ModelNodeData | null>(null)

function onNodeClick(_: unknown, node: { data: ModelNodeData }) {
  selectedNode.value = node.data
}
</script>

<template>
  <div class="relative w-full h-full min-h-96">
    <EmptyState
      v-if="!modelStore.json"
      :icon="Share2"
      message="No authorization model loaded"
      action-label="Go to Import/Export"
      action-to="/import-export"
    />
    <template v-else>
      <LoadingSpinner v-if="!layoutDone" :full-view="true" />
      <div v-else class="relative w-full h-full">
        <VueFlow
          :nodes="nodes"
          :edges="edges"
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
        <GraphNodeDetail
          :node="selectedNode"
          @close="selectedNode = null"
        />
      </div>
    </template>
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
