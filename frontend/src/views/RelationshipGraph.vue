<script setup lang="ts">
import { GitBranch } from 'lucide-vue-next'
import EmptyState from '@/components/common/EmptyState.vue'
</script>

<template>
  <EmptyState
    :icon="GitBranch"
    title="Relationship Graph"
    message="No tuples to visualize"
    action-label="Go to Tuple Manager"
    action-to="/tuple-manager"
  />
</template>
