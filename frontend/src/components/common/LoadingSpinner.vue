<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
  fullView?: boolean
}>(), {
  size: 'md',
  fullView: false,
})

const sizeClasses = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
}
</script>

<template>
  <div v-if="props.fullView" class="flex items-center justify-center w-full h-full min-h-32">
    <Loader2 :class="['animate-spin text-info', sizeClasses[props.size]]" aria-hidden="true" />
  </div>
  <Loader2 v-else :class="['animate-spin text-info inline-block', sizeClasses[props.size]]" aria-hidden="true" />
</template>
