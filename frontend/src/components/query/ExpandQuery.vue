<script setup lang="ts">
import { Network } from 'lucide-vue-next'
import { useQueryStore } from '@/stores/queries'
import { useConnectionStore } from '@/stores/connection'
import { useModelOptions } from '@/composables/useModelOptions'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppButton from '@/components/common/AppButton.vue'
import ExpandTreeNode from './ExpandTreeNode.vue'

const queryStore = useQueryStore()
const connectionStore = useConnectionStore()
const { relationOptions } = useModelOptions()

function handleSubmit() {
  queryStore.expand(connectionStore.storeId)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end gap-3">
      <div class="flex-1">
        <label class="text-sm text-text-secondary mb-1 block">Relation</label>
        <AppSelect
          v-model="queryStore.expandInputs.relation"
          :options="relationOptions"
          :placeholder="relationOptions.length ? 'Select relation...' : 'Load model first'"
        />
      </div>
      <div class="flex-[2]">
        <label class="text-sm text-text-secondary mb-1 block">Object</label>
        <AppInput
          v-model="queryStore.expandInputs.object"
          :monospace="true"
          placeholder="document:roadmap"
          @keydown.enter="handleSubmit"
        />
      </div>
      <AppButton
        variant="primary"
        :loading="queryStore.expandLoading"
        :disabled="!queryStore.expandInputs.relation || !queryStore.expandInputs.object"
        @click="handleSubmit"
      >
        <Network class="size-4" />
        {{ queryStore.expandLoading ? 'Expanding...' : 'Expand' }}
      </AppButton>
    </div>

    <div v-if="queryStore.expandResult !== null">
      <div
        v-if="!queryStore.expandResult.root"
        class="text-text-secondary text-sm"
      >
        No expansion data
      </div>
      <div v-else role="tree" class="mt-2">
        <ExpandTreeNode :node="queryStore.expandResult.root" :default-expanded="true" />
      </div>
    </div>
  </div>
</template>
