<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { X } from 'lucide-vue-next'
import { useRelationshipGraphStore } from '@/stores/relationshipGraph'
import { useQueryStore } from '@/stores/queries'
import TypeBadge from '@/components/common/TypeBadge.vue'
import AppButton from '@/components/common/AppButton.vue'

const store = useRelationshipGraphStore()
const queryStore = useQueryStore()
const router = useRouter()

const panelRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

watch(
  () => store.selectedNodeId,
  async (val) => {
    if (val) {
      await nextTick()
      isOpen.value = true
    } else {
      isOpen.value = false
    }
  },
)

interface Relationship {
  relation: string
  connectedEntity: string
}

const nodeDetail = computed(() => {
  const id = store.selectedNodeId
  if (!id) return null

  const colonIdx = id.indexOf(':')
  const typeName = colonIdx > 0 ? id.slice(0, colonIdx) : id
  const entityLocalId = colonIdx > 0 ? id.slice(colonIdx + 1) : id

  const relationships: Relationship[] = store.edges
    .filter((e) => e.source === id || e.target === id)
    .map((e) => ({
      relation: String(e.label ?? ''),
      connectedEntity: e.source === id ? e.target : e.source,
    }))

  return { entityId: id, typeName, entityLocalId, relationships }
})

function queryThisEntity() {
  const id = store.selectedNodeId
  if (!id) return

  const asSource = store.edges.filter((e) => e.source === id).length
  const asTarget = store.edges.filter((e) => e.target === id).length
  const isUserSide = asSource >= asTarget || id.includes('#') || id.endsWith(':*')

  queryStore.activeTab = 'check'
  if (isUserSide) {
    queryStore.checkUser = id
  } else {
    queryStore.checkObject = id
  }

  store.setSelectedNode(null)
  router.push('/query-console')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && store.selectedNodeId !== null) {
    store.setSelectedNode(null)
  }
}

function onClickOutside(e: MouseEvent) {
  if (store.selectedNodeId !== null && panelRef.value && !panelRef.value.contains(e.target as Node)) {
    store.setSelectedNode(null)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('mousedown', onClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('mousedown', onClickOutside)
})
</script>

<template>
  <aside
    v-show="store.selectedNodeId !== null"
    ref="panelRef"
    role="complementary"
    aria-label="Entity details"
    :class="[
      'inspector-panel absolute top-0 right-0 h-full w-80 bg-surface-card border-l border-surface-border z-20 overflow-y-auto',
      { 'is-open': isOpen },
    ]"
  >
    <template v-if="nodeDetail">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-surface-border">
        <div class="flex items-center gap-2 min-w-0">
          <TypeBadge :type-name="nodeDetail.typeName" />
          <span class="font-mono text-sm text-text-primary truncate">{{ nodeDetail.entityLocalId }}</span>
        </div>
        <button
          class="shrink-0 text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-info rounded"
          aria-label="Close panel"
          @click="store.setSelectedNode(null)"
        >
          <X class="size-4" />
        </button>
      </div>

      <!-- Relationships -->
      <div class="p-4 border-b border-surface-border">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Relationships
        </h3>
        <div v-if="nodeDetail.relationships.length === 0" class="text-xs text-text-secondary">
          No relationships
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="(rel, i) in nodeDetail.relationships"
            :key="i"
            class="flex items-center gap-2"
          >
            <span class="text-xs text-text-secondary font-mono shrink-0">{{ rel.relation }}</span>
            <TypeBadge :type-name="rel.connectedEntity.split(':')[0]" />
            <span class="text-xs text-text-primary font-mono truncate">
              {{ rel.connectedEntity.split(':').slice(1).join(':') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4">
        <AppButton variant="primary" class="w-full" @click="queryThisEntity">
          Query this entity
        </AppButton>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.inspector-panel {
  transform: translateX(100%);
  transition: transform 0.2s ease;
}

.inspector-panel.is-open {
  transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
  .inspector-panel {
    transition: none;
  }
}
</style>
