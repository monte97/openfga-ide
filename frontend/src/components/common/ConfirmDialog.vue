<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import AppButton from './AppButton.vue'

const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  variant?: 'danger' | 'info'
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Dialog :open="props.open" aria-modal="true" @close="emit('cancel')">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/60" aria-hidden="true" @click="emit('cancel')" />
      <DialogPanel class="relative bg-surface-card border border-surface-border rounded-lg p-6 w-full max-w-md shadow-xl">
        <DialogTitle class="text-text-emphasis font-semibold text-base mb-2">
          {{ props.title }}
        </DialogTitle>
        <p class="text-text-secondary text-sm mb-6">{{ props.message }}</p>
        <div class="flex justify-end gap-3">
          <AppButton variant="secondary" @click="emit('cancel')">
            Cancel
          </AppButton>
          <AppButton :variant="props.variant === 'danger' ? 'danger' : 'primary'" @click="emit('confirm')">
            {{ props.confirmLabel }}
          </AppButton>
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>
