<script setup lang="ts">
import type { Component } from 'vue'
import { RouterLink } from 'vue-router'
import AppButton from './AppButton.vue'

const props = defineProps<{
  icon?: Component
  title?: string
  message: string
  actionLabel?: string
  actionTo?: string
}>()

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 py-12 text-center">
    <component
      v-if="props.icon"
      :is="props.icon"
      class="size-12 text-text-secondary"
      aria-hidden="true"
    />
    <div v-if="props.title" class="text-lg font-semibold text-text-primary">{{ props.title }}</div>
    <p class="text-text-secondary text-sm">{{ props.message }}</p>
    <RouterLink v-if="props.actionLabel && props.actionTo" :to="props.actionTo">
      <AppButton variant="secondary">{{ props.actionLabel }}</AppButton>
    </RouterLink>
    <AppButton
      v-else-if="props.actionLabel"
      variant="secondary"
      @click="emit('action')"
    >
      {{ props.actionLabel }}
    </AppButton>
  </div>
</template>
