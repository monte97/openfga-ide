<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'

const showViewportWarning = ref(false)
const warningDismissed = ref(false)

function checkViewport() {
  showViewportWarning.value = !warningDismissed.value && window.innerWidth < 1024
}

onMounted(() => {
  checkViewport()
  window.addEventListener('resize', checkViewport)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkViewport)
})

function dismissWarning() {
  warningDismissed.value = true
  showViewportWarning.value = false
}

// Keep content margin in sync with sidebar collapsed state
// Sidebar width: 64px collapsed (w-16), 240px expanded (w-60)
const sidebarCollapsed = ref(
  typeof window !== 'undefined' && window.innerWidth < 1280
    ? true
    : localStorage.getItem('sidebar-collapsed') === 'true'
)

// Listen to sidebar toggle via storage events (cross-tab) + custom event
function syncSidebar() {
  sidebarCollapsed.value = localStorage.getItem('sidebar-collapsed') === 'true'
}

onMounted(() => {
  window.addEventListener('storage', syncSidebar)
  // Also sync from sidebar keydown toggle — poll localStorage on keydown
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'b') {
      // Defer to next tick so sidebar has updated localStorage first
      setTimeout(syncSidebar, 50)
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('storage', syncSidebar)
})
</script>

<template>
  <a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-surface-card focus:text-text-emphasis focus:rounded focus:ring-2 focus:ring-info"
  >
    Skip to content
  </a>

  <AppHeader />
  <AppSidebar />

  <main
    id="main-content"
    :class="[
      'min-h-screen pt-14 transition-all duration-200',
      sidebarCollapsed ? 'pl-16' : 'pl-60',
    ]"
  >
    <div
      v-if="showViewportWarning"
      class="flex items-center justify-between px-4 py-2 bg-warning/10 text-warning text-sm"
      role="alert"
    >
      <span>OpenFGA Viewer is designed for desktop browsers (1280px+)</span>
      <button
        class="ml-4 text-warning hover:text-warning/80 focus:outline-none focus:ring-2 focus:ring-warning rounded"
        aria-label="Dismiss viewport warning"
        @click="dismissWarning"
      >
        ×
      </button>
    </div>

    <div class="p-6">
      <RouterView />
    </div>
  </main>

  <ToastContainer />
</template>
