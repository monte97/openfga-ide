<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVueTable, getCoreRowModel, createColumnHelper, FlexRender } from '@tanstack/vue-table'
import { Trash2 } from 'lucide-vue-next'
import TypeBadge from '@/components/common/TypeBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import { useTupleStore, type TupleEntry } from '@/stores/tuples'
import { useConnectionStore } from '@/stores/connection'

const tupleStore = useTupleStore()
const connectionStore = useConnectionStore()

const rowSelection = ref<Record<string, boolean>>({})
const deletingRow = ref<string | null>(null)

function extractType(identifier: string): string {
  return identifier.split(':')[0]
}

function tupleId(entry: TupleEntry): string {
  return `${entry.key.user}|${entry.key.relation}|${entry.key.object}`
}

const columnHelper = createColumnHelper<TupleEntry>()

const columns = [
  columnHelper.display({
    id: 'select',
    header: ({ table }) => table,
    cell: ({ row }) => row,
  }),
  columnHelper.accessor((row) => row.key.user, { id: 'user', header: 'User' }),
  columnHelper.accessor((row) => row.key.relation, { id: 'relation', header: 'Relation' }),
  columnHelper.accessor((row) => row.key.object, { id: 'object', header: 'Object' }),
  columnHelper.display({ id: 'actions', header: '' }),
]

const table = useVueTable({
  get data() { return tupleStore.tuples },
  columns,
  getCoreRowModel: getCoreRowModel(),
  manualPagination: true,
  enableRowSelection: true,
  state: {
    get rowSelection() { return rowSelection.value },
  },
  onRowSelectionChange: (updater) => {
    rowSelection.value = typeof updater === 'function' ? updater(rowSelection.value) : updater
  },
  getRowId: (row) => tupleId(row),
})

function getSelectedTuples(): Array<{ user: string; relation: string; object: string }> {
  return table.getSelectedRowModel().rows.map((r) => r.original.key)
}

function clearSelection() {
  rowSelection.value = {}
}

async function onDeleteRow(entry: TupleEntry) {
  const id = tupleId(entry)
  deletingRow.value = id
  try {
    await tupleStore.deleteTuple(connectionStore.storeId, entry.key)
  } finally {
    deletingRow.value = null
  }
}

function loadMore() {
  if (connectionStore.storeId) {
    tupleStore.fetchNextPage(connectionStore.storeId)
  }
}

const selectedCount = computed(() => Object.keys(rowSelection.value).filter((k) => rowSelection.value[k]).length)

defineExpose({ getSelectedTuples, clearSelection, selectedCount })
</script>

<template>
  <div>
    <div class="overflow-auto rounded-lg border border-surface-border">
      <table class="w-full">
        <thead>
          <tr class="bg-surface-elevated">
            <th class="px-2 py-2 w-10">
              <input
                type="checkbox"
                :checked="table.getIsAllRowsSelected()"
                :indeterminate="table.getIsSomeRowsSelected()"
                class="accent-info"
                @change="table.toggleAllRowsSelected()"
              />
            </th>
            <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-text-secondary">User</th>
            <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-text-secondary">Relation</th>
            <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-text-secondary">Object</th>
            <th class="px-2 py-2 w-10" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            class="border-t border-surface-border hover:bg-surface-elevated/50"
          >
            <td class="px-2 py-2">
              <input
                type="checkbox"
                :checked="row.getIsSelected()"
                class="accent-info"
                @change="row.toggleSelected()"
              />
            </td>
            <td class="px-4 py-2 font-mono text-sm">
              <TypeBadge :type-name="extractType(row.original.key.user)" />
              <span class="ml-1 text-text-primary">{{ row.original.key.user }}</span>
            </td>
            <td class="px-4 py-2 font-mono text-sm text-text-primary">
              {{ row.original.key.relation }}
            </td>
            <td class="px-4 py-2 font-mono text-sm">
              <TypeBadge :type-name="extractType(row.original.key.object)" />
              <span class="ml-1 text-text-primary">{{ row.original.key.object }}</span>
            </td>
            <td class="px-2 py-2">
              <button
                class="text-text-secondary hover:text-error focus:outline-none focus:ring-2 focus:ring-error rounded p-1"
                :aria-label="`Delete tuple ${row.original.key.user} ${row.original.key.relation} ${row.original.key.object}`"
                :disabled="deletingRow === row.id"
                @click="onDeleteRow(row.original)"
              >
                <Trash2 class="size-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="mt-3 flex items-center justify-between text-sm text-text-secondary">
      <span>Showing {{ tupleStore.tuples.length }} tuples</span>
      <AppButton
        v-if="tupleStore.hasMore"
        variant="secondary"
        :loading="tupleStore.loading"
        @click="loadMore"
      >
        Load More
      </AppButton>
    </div>
  </div>
</template>
