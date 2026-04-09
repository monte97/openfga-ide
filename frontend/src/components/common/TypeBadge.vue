<script setup lang="ts">
const props = defineProps<{
  typeName: string
}>()

function hashTypeName(name: string): number {
  let sum = 0
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i)
  }
  return sum % 8
}

const nodeColorClasses: Record<number, { bg: string; text: string }> = {
  0: { bg: 'bg-node-0/20', text: 'text-node-0' },
  1: { bg: 'bg-node-1/20', text: 'text-node-1' },
  2: { bg: 'bg-node-2/20', text: 'text-node-2' },
  3: { bg: 'bg-node-3/20', text: 'text-node-3' },
  4: { bg: 'bg-node-4/20', text: 'text-node-4' },
  5: { bg: 'bg-node-5/20', text: 'text-node-5' },
  6: { bg: 'bg-node-6/20', text: 'text-node-6' },
  7: { bg: 'bg-node-7/20', text: 'text-node-7' },
}

const colorIndex = hashTypeName(props.typeName)
const colors = nodeColorClasses[colorIndex]!
</script>

<template>
  <span
    :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-mono', colors.bg, colors.text]"
  >
    {{ props.typeName }}
  </span>
</template>
