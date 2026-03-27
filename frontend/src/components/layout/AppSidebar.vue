<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  FileCode2,
  Database,
  Search,
  GitBranch,
  Settings,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'

const route = useRoute()

const navItems = [
  { key: 'model-viewer', label: 'Model Viewer', icon: FileCode2, to: '/model-viewer' },
  { key: 'tuple-manager', label: 'Tuple Manager', icon: Database, to: '/tuple-manager' },
  { key: 'query-console', label: 'Query Console', icon: Search, to: '/query-console' },
  { key: 'relationship-graph', label: 'Relationship Graph', icon: GitBranch, to: '/relationship-graph' },
  { key: 'store-admin', label: 'Store Admin', icon: Settings, to: '/store-admin' },
  { key: 'import-export', label: 'Import / Export', icon: ArrowUpDown, to: '/import-export' },
]

const STORAGE_KEY = 'sidebar-collapsed'

function readCollapsed(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

const collapsed = ref<boolean>(false)

function toggle() {
  collapsed.value = !collapsed.value
  localStorage.setItem(STORAGE_KEY, String(collapsed.value))
  window.dispatchEvent(new CustomEvent('sidebar-toggle'))
}

function handleKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === 'b') {
    e.preventDefault()
    toggle()
  }
}

onMounted(() => {
  if (window.innerWidth < 1280) {
    collapsed.value = true
  } else {
    collapsed.value = readCollapsed()
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <nav
    :class="[
      'fixed left-0 top-14 bottom-0 bg-surface-card border-r border-surface-border z-20',
      'flex flex-col transition-all duration-200',
      collapsed ? 'w-16' : 'w-60',
    ]"
    aria-label="Main navigation"
  >
    <!-- Nav items -->
    <ul class="flex-1 py-2 list-none m-0 p-0">
      <li v-for="item in navItems" :key="item.key">
        <RouterLink
          :to="item.to"
          :title="collapsed ? item.label : undefined"
          :class="[
            'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-info focus:ring-inset',
            route.path === item.to
              ? 'border-l-2 border-info text-info bg-surface-elevated/50'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/30 border-l-2 border-transparent',
            collapsed ? 'justify-center px-0' : '',
          ]"
        >
          <component :is="item.icon" class="size-5 shrink-0" aria-hidden="true" />
          <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
        </RouterLink>
      </li>
    </ul>

    <!-- Collapse toggle -->
    <button
      :class="[
        'flex items-center justify-center h-10 border-t border-surface-border',
        'text-text-secondary hover:text-text-primary transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-info focus:ring-inset',
      ]"
      :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      @click="toggle"
    >
      <ChevronLeft v-if="!collapsed" class="size-4" aria-hidden="true" />
      <ChevronRight v-else class="size-4" aria-hidden="true" />
    </button>
  </nav>
</template>
