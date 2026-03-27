<script setup lang="ts">
import { ref, computed } from 'vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppButton from '@/components/common/AppButton.vue'
import { useModelStore } from '@/stores/model'
import { useTupleStore } from '@/stores/tuples'
import { useConnectionStore } from '@/stores/connection'

const emit = defineEmits<{ added: [] }>()

const modelStore = useModelStore()
const tupleStore = useTupleStore()
const connectionStore = useConnectionStore()

const user = ref('')
const relation = ref<string | null>(null)
const object = ref('')
const submitting = ref(false)

const userError = ref('')
const objectError = ref('')

const relationOptions = computed(() => {
  const json = modelStore.json as { type_definitions?: Array<{ relations?: Record<string, unknown> }> } | null
  if (!json?.type_definitions) return []
  const relations = new Set<string>()
  for (const typeDef of json.type_definitions) {
    if (typeDef.relations) {
      Object.keys(typeDef.relations).forEach((r) => relations.add(r))
    }
  }
  return Array.from(relations).sort().map((r) => ({ value: r, label: r }))
})

function validateField(field: 'user' | 'object') {
  const val = field === 'user' ? user.value : object.value
  const errorRef = field === 'user' ? userError : objectError
  if (!val.trim()) {
    errorRef.value = 'Required'
  } else if (!val.includes(':')) {
    errorRef.value = 'Must be in type:id format'
  } else {
    errorRef.value = ''
  }
}

async function submit() {
  validateField('user')
  validateField('object')
  if (!relation.value) return
  if (userError.value || objectError.value) return

  submitting.value = true
  try {
    await tupleStore.addTuple(connectionStore.storeId, {
      user: user.value,
      relation: relation.value,
      object: object.value,
    })
    user.value = ''
    relation.value = null
    object.value = ''
    emit('added')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="rounded-lg border border-surface-border bg-surface-card p-4 mb-4">
    <div class="flex items-start gap-3">
      <div class="flex-1">
        <AppInput
          v-model="user"
          :monospace="true"
          placeholder="user:alice"
          :error="userError"
          @blur="validateField('user')"
        />
      </div>
      <div class="flex-1">
        <AppSelect
          v-model="relation"
          :options="relationOptions"
          :placeholder="relationOptions.length ? 'Select relation...' : 'Load model first'"
        />
      </div>
      <div class="flex-1">
        <AppInput
          v-model="object"
          :monospace="true"
          placeholder="document:roadmap"
          :error="objectError"
          @blur="validateField('object')"
        />
      </div>
      <AppButton
        :loading="submitting"
        :disabled="!user || !relation || !object"
        @click="submit"
      >
        Add Tuple
      </AppButton>
    </div>
  </div>
</template>
