<script setup>
import { computed, useId } from 'vue'
import OptionChip from '@/components/common/OptionChip.vue'
import QuantityStepper from '@/components/common/QuantityStepper.vue'
import DoctolIcon from '@/components/common/DoctolIcon.vue'

const props = defineProps({
  service: { type: Object, required: true },
  config: { type: Object, required: true },
})
const emit = defineEmits(['update'])
const uid = useId()
const groups = computed(() => props.service.config.groups ?? [])
const counters = computed(() => groups.value.filter((group) => group.inputType === 'counter'))
const choices = computed(() => groups.value.filter((group) => group.inputType !== 'counter' && group.key !== 'kitchen_cabinet'))
const cabinet = computed(() => groups.value.find((group) => group.key === 'kitchen_cabinet'))
const propertyDetailsTitle = computed(() => String(props.service.name).includes('فيلا') ? 'تفاصيل الفيلا' : 'تفاصيل الشقة')
const iconFor = (key) => ({ bedrooms: 'bed', living_rooms: 'sofa', bathrooms: 'sparkle', kitchens: 'home' }[key] ?? 'list')
</script>

<template>
  <div class="dynamic-config dynamic-config--property">
    <fieldset v-for="group in choices" :key="group.key" class="dynamic-config__group">
      <legend class="dynamic-config__label">
        {{ group.label }}
        <span v-if="group.required" aria-hidden="true">*</span>
      </legend>
      <div class="dynamic-config__options" :class="`dynamic-config__options--${group.values.length}`">
        <OptionChip
          v-for="option in group.values"
          :key="option.key"
          :name="`${uid}-${group.key}`"
          :value="option.key"
          :label="option.label"
          :selected="String(config[group.key]) === String(option.key)"
          @select="(value) => emit('update', { [group.key]: value })"
        />
      </div>
      <p v-if="group.helpText" class="dynamic-config__help">{{ group.helpText }}</p>
    </fieldset>

    <section v-if="counters.length" class="dynamic-config__group">
      <h4 class="dynamic-config__label">{{ propertyDetailsTitle }}</h4>
      <div class="dynamic-config__counters">
        <div v-for="group in counters" :key="group.key" class="dynamic-config__counter">
          <span class="dynamic-config__counter-name">
            <DoctolIcon :name="iconFor(group.key)" :size="22" />
            {{ group.label }}
          </span>
          <QuantityStepper
            size="sm"
            :model-value="Number(config[group.key] ?? group.default ?? group.min ?? 0)"
            :min="Number(group.min ?? 0)"
            :max="Number(group.max ?? 99)"
            :step="Number(group.step ?? 1)"
            :label="group.label"
            @update:model-value="(value) => emit('update', { [group.key]: value })"
          />
        </div>
      </div>
    </section>

    <section v-if="cabinet" class="dynamic-config__cabinet">
      <strong>{{ cabinet.label }}</strong>
      <div class="dynamic-config__cabinet-options">
        <OptionChip
          v-for="option in cabinet.values"
          :key="option.key"
          :name="`${uid}-${cabinet.key}`"
          :value="option.key"
          :label="option.label"
          :selected="String(config[cabinet.key]) === String(option.key)"
          @select="(value) => emit('update', { [cabinet.key]: value })"
        />
      </div>
    </section>

    <p class="dynamic-config__note"><DoctolIcon name="info" :size="18" /> يمكنك تعديل هذه المعلومات لاحقًا قبل تأكيد الطلب</p>
  </div>
</template>

<style scoped>
.dynamic-config { display: grid; gap: 0; }
.dynamic-config__group { border: 0; padding: var(--dt-space-5) 0; margin: 0; border-block-end: 1px solid var(--dt-line); }
.dynamic-config__label {
  margin-block-end: var(--dt-space-3);
  color: var(--dt-ink-soft);
  font-size: var(--dt-fs-sm);
  font-weight: var(--dt-fw-semibold);
}
.dynamic-config__label span { color: var(--dt-danger); }
.dynamic-config__options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 145px), 1fr));
  gap: var(--dt-space-2);
}
.dynamic-config__options--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.dynamic-config__options--4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.dynamic-config__options :deep(.chip) { min-height: 64px; }
.dynamic-config__help { margin-block-start: var(--dt-space-2); color: var(--dt-muted); font-size: var(--dt-fs-xs); }
.dynamic-config__counters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--dt-space-3); }
.dynamic-config__counter { display: flex; align-items: center; justify-content: space-between; gap: var(--dt-space-3); min-height: 72px; padding: var(--dt-space-3) var(--dt-space-4); border: 1px solid var(--dt-line); border-radius: var(--dt-radius-md); background: var(--dt-surface); }
.dynamic-config__counter-name { display: flex; align-items: center; gap: .5rem; font-weight: var(--dt-fw-semibold); }
.dynamic-config__counter-name :deep(svg) { color: var(--dt-teal-600); }
.dynamic-config__cabinet { display: grid; grid-template-columns: 1fr minmax(260px, .9fr); align-items: center; gap: var(--dt-space-4); margin-block: var(--dt-space-4); padding: var(--dt-space-3) var(--dt-space-4); border-radius: var(--dt-radius-md); background: var(--dt-teal-50); }
.dynamic-config__cabinet-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--dt-space-2); }
.dynamic-config__note { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: var(--dt-space-3); border-radius: var(--dt-radius-md); color: var(--dt-teal-700); background: var(--dt-teal-50); }
@media (max-width: 640px) {
  .dynamic-config { width: 100%; min-width: 0; overflow: hidden; }
  .dynamic-config__group { padding: .9rem 0; min-width: 0; }
  .dynamic-config__label { margin-block-end: .65rem; font-size: .88rem; }
  .dynamic-config__options,
  .dynamic-config__options--2,
  .dynamic-config__options--4 { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .45rem; }
  .dynamic-config__options :deep(.chip) { min-width: 0; min-height: 52px; padding-inline: .45rem; font-size: .78rem; }
  .dynamic-config__counters { grid-template-columns: 1fr; gap: .5rem; }
  .dynamic-config__counter { min-width: 0; min-height: 58px; padding: .55rem .65rem; gap: .4rem; }
  .dynamic-config__counter-name { min-width: 0; gap: .35rem; font-size: .82rem; }
  .dynamic-config__counter :deep(.qty) { flex: none; transform: scale(.9); transform-origin: left center; }
  .dynamic-config__cabinet { grid-template-columns: 1fr; }
  .dynamic-config__cabinet { margin-block: .75rem; padding: .65rem; gap: .6rem; }
  .dynamic-config__cabinet-options { gap: .45rem; }
  .dynamic-config__note { padding: .65rem; font-size: .76rem; line-height: 1.5; text-align: center; }
}
</style>
