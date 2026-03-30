<script setup lang="ts">
import { Play, CircleCheck, CircleX } from 'lucide-vue-next'
import { useQueryStore } from '@/stores/queries'
import { useConnectionStore } from '@/stores/connection'
import { useModelOptions } from '@/composables/useModelOptions'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppButton from '@/components/common/AppButton.vue'
import WhyButton from './WhyButton.vue'

const queryStore = useQueryStore()
const connectionStore = useConnectionStore()
const { relationOptions } = useModelOptions()

function handleCheck() {
  queryStore.runCheck(connectionStore.storeId)
}
</script>

<template>
  <div class="space-y-6" @keydown.enter="handleCheck">
    <div class="flex items-end gap-3">
      <div class="flex-1">
        <label class="text-sm text-text-secondary mb-1 block">User</label>
        <AppInput v-model="queryStore.checkUser" :monospace="true" placeholder="user:alice" />
      </div>
      <div class="flex-1">
        <label class="text-sm text-text-secondary mb-1 block">Relation</label>
        <AppSelect
          v-model="queryStore.checkRelation"
          :options="relationOptions"
          :placeholder="relationOptions.length ? 'Select relation...' : 'Load model first'"
        />
      </div>
      <div class="flex-1">
        <label class="text-sm text-text-secondary mb-1 block">Object</label>
        <AppInput v-model="queryStore.checkObject" :monospace="true" placeholder="document:roadmap" />
      </div>
      <AppButton
        variant="primary"
        :loading="queryStore.loading"
        :disabled="!queryStore.checkUser || !queryStore.checkRelation || !queryStore.checkObject"
        @click="handleCheck"
      >
        <Play class="size-4" />
        Check
      </AppButton>
    </div>

    <div v-if="queryStore.checkResult" class="flex flex-col items-center gap-2 py-6">
      <CircleCheck v-if="queryStore.checkResult.allowed" class="size-16 text-success" />
      <CircleX v-else class="size-16 text-error" />
      <span
        :class="[
          'text-2xl font-semibold',
          queryStore.checkResult.allowed ? 'text-success' : 'text-error',
        ]"
      >
        {{ queryStore.checkResult.allowed ? 'Allowed' : 'Denied' }}
      </span>
      <span class="text-text-secondary text-sm">
        Response: {{ queryStore.checkResult.responseTime }}ms
      </span>
      <WhyButton />
    </div>
  </div>
</template>
