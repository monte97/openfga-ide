<script setup lang="ts">
import { ArrowUpDown } from 'lucide-vue-next'
import EmptyState from '@/components/common/EmptyState.vue'
</script>

<template>
  <EmptyState
    :icon="ArrowUpDown"
    title="Import / Export"
    message="Select a store to import or export data"
    action-label="Go to Store Admin"
    action-to="/store-admin"
  />
</template>
