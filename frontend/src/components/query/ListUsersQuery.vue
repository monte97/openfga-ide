<script setup lang="ts">
import { Users } from 'lucide-vue-next'
import { useQueryStore } from '@/stores/queries'
import { useConnectionStore } from '@/stores/connection'
import { useModelOptions } from '@/composables/useModelOptions'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppButton from '@/components/common/AppButton.vue'
import TypeBadge from '@/components/common/TypeBadge.vue'

const queryStore = useQueryStore()
const connectionStore = useConnectionStore()
const { relationOptions, typeOptions } = useModelOptions()

function handleSubmit() {
  queryStore.listUsers(connectionStore.storeId)
}

function extractTypeName(identifier: string): string {
  return identifier.split(':')[0] || identifier
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end gap-3">
      <div class="flex-1">
        <label class="text-sm text-text-secondary mb-1 block">Object Type</label>
        <AppSelect
          v-model="queryStore.listUsersInputs.objectType"
          :options="typeOptions"
          :placeholder="typeOptions.length ? 'Select type...' : 'Load model first'"
        />
      </div>
      <div class="flex-1">
        <label class="text-sm text-text-secondary mb-1 block">Object ID</label>
        <AppInput
          v-model="queryStore.listUsersInputs.objectId"
          :monospace="true"
          placeholder="roadmap"
          @keydown.enter="handleSubmit"
        />
      </div>
      <div class="flex-1">
        <label class="text-sm text-text-secondary mb-1 block">Relation</label>
        <AppSelect
          v-model="queryStore.listUsersInputs.relation"
          :options="relationOptions"
          :placeholder="relationOptions.length ? 'Select relation...' : 'Load model first'"
        />
      </div>
      <AppButton
        variant="primary"
        :loading="queryStore.listUsersLoading"
        :disabled="!queryStore.listUsersInputs.objectType || !queryStore.listUsersInputs.objectId || !queryStore.listUsersInputs.relation"
        @click="handleSubmit"
      >
        <Users class="size-4" />
        {{ queryStore.listUsersLoading ? 'Listing...' : 'List Users' }}
      </AppButton>
    </div>

    <div v-if="queryStore.listUsersResult !== null">
      <div v-if="queryStore.listUsersResult.length === 0" class="text-text-secondary text-sm">
        No users found
      </div>
      <div v-else class="flex flex-wrap gap-2">
        <div
          v-for="user in queryStore.listUsersResult"
          :key="user"
          class="flex items-center gap-1.5"
        >
          <TypeBadge :type-name="extractTypeName(user)" />
          <span class="font-mono text-sm text-text-primary">{{ user }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
