<script setup lang="ts">
const props = defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="bg-surface-card border border-surface-border rounded-lg p-4">
    <div v-if="props.title" class="mb-3">
      <h3 class="text-text-emphasis font-medium text-sm">{{ props.title }}</h3>
    </div>
    <slot />
  </div>
</template>
