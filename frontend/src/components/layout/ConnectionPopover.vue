<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { Check, X } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useConnectionStore } from '@/stores/connection'
import ConnectionBadge from '@/components/common/ConnectionBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'

const connectionStore = useConnectionStore()
const { url, status } = storeToRefs(connectionStore)

const editing = ref(false)
const newUrl = ref('')
const testResult = ref<'success' | 'error' | null>(null)
const testError = ref('')
const testing = ref(false)
const saving = ref(false)

function startEdit() {
  newUrl.value = url.value
  testResult.value = null
  testError.value = ''
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  testResult.value = null
  testError.value = ''
}

async function runTest() {
  testing.value = true
  testResult.value = null
  testError.value = ''
  const ok = await connectionStore.testConnection(newUrl.value)
  if (ok) {
    testResult.value = 'success'
  } else {
    testResult.value = 'error'
    testError.value = 'Could not reach the OpenFGA instance'
  }
  testing.value = false
}

async function save() {
  saving.value = true
  await connectionStore.updateConnection(newUrl.value)
  saving.value = false
  editing.value = false
  testResult.value = null
}

const badgeStatus = computed(() => {
  if (status.value === 'connected') return 'connected'
  if (status.value === 'error') return 'error'
  return 'disconnected'
})

// Reset testResult when URL changes so stale test does not enable Save on a different URL
watch(newUrl, () => {
  testResult.value = null
  testError.value = ''
})

function onPanelClose() {
  cancelEdit()
}
</script>

<template>
  <Popover class="relative">
    <PopoverButton
      class="focus:outline-none focus:ring-2 focus:ring-info rounded bg-transparent border-0 p-0 cursor-pointer"
      aria-label="Toggle connection settings"
    >
      <ConnectionBadge :status="badgeStatus" />
    </PopoverButton>

    <PopoverPanel
      class="absolute right-0 top-full mt-2 w-80 bg-surface-card border border-surface-border rounded-lg shadow-xl z-50 p-4"
      @vue:unmounted="onPanelClose"
    >
      <div v-if="!editing" class="space-y-3">
        <div>
          <p class="text-xs text-text-secondary mb-1">OpenFGA URL</p>
          <p class="text-sm text-text-primary font-mono break-all">{{ url }}</p>
        </div>
        <div>
          <p class="text-xs text-text-secondary mb-1">Status</p>
          <ConnectionBadge :status="badgeStatus" />
        </div>
        <AppButton variant="secondary" class="w-full justify-center" @click="startEdit">
          Edit Connection
        </AppButton>
      </div>

      <div v-else class="space-y-3">
        <AppInput
          v-model="newUrl"
          placeholder="http://localhost:8080"
          :error="testResult === 'error' ? testError : ''"
          monospace
        />

        <div v-if="testResult === 'success'" class="flex items-center gap-2 text-success text-sm">
          <Check class="size-4" aria-hidden="true" />
          Connected successfully
        </div>

        <div class="flex gap-2">
          <AppButton
            variant="secondary"
            :loading="testing"
            :disabled="!newUrl || saving"
            @click="runTest"
          >
            Test
          </AppButton>
          <AppButton
            variant="primary"
            :loading="saving"
            :disabled="testResult !== 'success' || testing"
            @click="save"
          >
            Save
          </AppButton>
          <AppButton variant="secondary" :disabled="testing || saving" @click="cancelEdit">
            <X class="size-4" aria-hidden="true" />
          </AppButton>
        </div>
      </div>
    </PopoverPanel>
  </Popover>
</template>
