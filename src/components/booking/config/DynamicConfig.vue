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
const choices = computed(() => groups.value.filter((group) =>
  group.inputType !== 'counter' &&
  group.inputType !== 'collection' &&
  group.key !== 'kitchen_cabinet',
))
const collections = computed(() => groups.value.filter((group) => group.inputType === 'collection'))
const cabinet = computed(() => groups.value.find((group) => group.key === 'kitchen_cabinet'))
const propertyDetailsTitle = computed(() => String(props.service.name).includes('فيلا') ? 'تفاصيل الفيلا' : 'تفاصيل الشقة')
const iconFor = (key) => ({ bedrooms: 'bed', living_rooms: 'sofa', bathrooms: 'sparkle', kitchens: 'home' }[key] ?? 'list')

function currentItems(key) {
  const items = props.config[key]
  return Array.isArray(items) ? items : []
}

function quantityForType(group, typeValue) {
  return currentItems(group.key).reduce((sum, item) =>
    String(item.type) === String(typeValue) ? sum + Math.max(0, Number(item.quantity) || 0) : sum,
  0)
}

function setUnitQuantity(group, typeValue, quantity) {
  const items = currentItems(group.key).filter((item) => String(item.type) !== String(typeValue))
  if (quantity > 0) items.push({ type: typeValue, quantity })
  emit('update', { [group.key]: items })
}

function displayOptions(group) {
  return group.schema?.displayOptions ?? group.schema?.display_options ?? []
}

function isAreaCollection(group) {
  const fields = group.schema?.item_fields ?? []
  return fields.some((field) => field.key === 'width_m' || field.key === 'width')
}

function fieldByKey(group, key) {
  return (group.schema?.item_fields ?? []).find((field) => field.key === key)
}

function newItemDefaults(group) {
  const item = {}
  ;(group.schema?.item_fields ?? []).forEach((field) => {
    if (field.key === 'quantity') {
      item[field.key] = Math.max(1, Number(field.min ?? 1))
    } else if (field.input_type === 'counter') {
      item[field.key] = Math.max(0, Number(field.min ?? 0))
    } else if (field.input_type === 'decimal') {
      item[field.key] = Math.max(0, Number(field.min ?? 0))
    } else if (field.input_type === 'select') {
      item[field.key] = field.options?.[0]?.value ?? field.options?.[0]?.key ?? ''
    } else {
      item[field.key] = field.default ?? ''
    }
  })
  return item
}

function updateAreaItem(group, index, patch) {
  const items = [...currentItems(group.key)]
  items[index] = { ...items[index], ...patch }
  emit('update', { [group.key]: items })
}

function removeAreaItem(group, index) {
  const items = currentItems(group.key).filter((_, i) => i !== index)
  emit('update', { [group.key]: items })
}

function addAreaItem(group) {
  emit('update', { [group.key]: [...currentItems(group.key), newItemDefaults(group)] })
}

function localized(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  return value.ar ?? value.en ?? ''
}

function optionName(option) {
  return localized(option.name ?? option.label ?? option.value)
}

function optionPrice(option) {
  return option.unit_price ?? option.price ?? 0
}
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

    <section v-for="group in collections" :key="group.key" class="dynamic-config__group">
      <h4 class="dynamic-config__label">
        {{ group.label }}
        <span v-if="group.required" aria-hidden="true">*</span>
      </h4>

      <!-- Unit / ready-made collections (curtain, mattress, tank, etc.) -->
      <div v-if="!isAreaCollection(group)" class="dynamic-config__unit-items">
        <div
          v-for="option in displayOptions(group)"
          :key="option.value"
          class="dynamic-config__unit-row"
        >
          <span class="dynamic-config__unit-name">{{ optionName(option) }}</span>
          <span v-if="optionPrice(option)" class="dynamic-config__unit-price">{{ optionPrice(option) }} ر.س</span>
          <QuantityStepper
            size="sm"
            :model-value="quantityForType(group, option.value)"
            :min="0"
            :max="99"
            :step="1"
            :label="optionName(option)"
            @update:model-value="(value) => setUnitQuantity(group, option.value, value)"
          />
          <button
            v-if="quantityForType(group, option.value) > 0"
            type="button"
            class="dynamic-config__remove"
            :aria-label="'حذف ' + optionName(option)"
            @click="setUnitQuantity(group, option.value, 0)"
          >
            <DoctolIcon name="trash" :size="18" />
          </button>
        </div>
      </div>

      <!-- Area collections (custom curtains, carpet, moquette) -->
      <div v-else class="dynamic-config__area-items">
        <div
          v-for="(item, index) in currentItems(group.key)"
          :key="`${group.key}-${index}`"
          class="dynamic-config__area-row"
        >
          <button
            type="button"
            class="dynamic-config__remove"
            :aria-label="'حذف المقاس'"
            @click="removeAreaItem(group, index)"
          >
            <DoctolIcon name="trash" :size="18" />
          </button>

          <div class="dynamic-config__area-field">
            <span class="dynamic-config__field-label">{{ localized(fieldByKey(group, 'width_m')?.name) ?? 'العرض' }}</span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              :value="item.width_m ?? ''"
              @input="(event) => updateAreaItem(group, index, { width_m: Number(event.target.value) })"
            />
          </div>

          <div class="dynamic-config__area-field">
            <span class="dynamic-config__field-label">{{ localized(fieldByKey(group, 'height_m')?.name) ?? 'الطول' }}</span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              :value="item.height_m ?? ''"
              @input="(event) => updateAreaItem(group, index, { height_m: Number(event.target.value) })"
            />
          </div>

          <div class="dynamic-config__area-field">
            <span class="dynamic-config__field-label">{{ localized(fieldByKey(group, 'quantity')?.name) ?? 'العدد' }}</span>
            <QuantityStepper
              size="sm"
              :model-value="Number(item.quantity ?? 1)"
              :min="1"
              :max="100"
              :step="1"
              :label="'العدد'"
              @update:model-value="(value) => updateAreaItem(group, index, { quantity: value })"
            />
          </div>
        </div>
        <button
          type="button"
          class="dynamic-config__add"
          @click="addAreaItem(group)"
        >
          <DoctolIcon name="plus" :size="16" /> إضافة مقاس
        </button>
      </div>

      <p v-if="group.helpText" class="dynamic-config__help">{{ group.helpText }}</p>
    </section>

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
.dynamic-config__unit-items { display: grid; gap: var(--dt-space-2); }
.dynamic-config__unit-row { display: flex; align-items: center; justify-content: space-between; gap: var(--dt-space-3); padding: var(--dt-space-3) var(--dt-space-4); border: 1px solid var(--dt-line); border-radius: var(--dt-radius-md); background: var(--dt-surface); }
.dynamic-config__unit-name { flex: 1; font-weight: var(--dt-fw-medium); }
.dynamic-config__unit-price { color: var(--dt-teal-600); font-size: var(--dt-fs-xs); }
.dynamic-config__area-items { display: grid; gap: var(--dt-space-2); }
.dynamic-config__area-row { display: grid; grid-template-columns: auto 1fr 1fr 1fr; align-items: stretch; gap: .5rem; padding: var(--dt-space-2) var(--dt-space-3); border: 1px solid var(--dt-line); border-radius: var(--dt-radius-md); background: var(--dt-surface); }
.dynamic-config__area-field { display: flex; flex-direction: column; align-items: stretch; gap: .35rem; padding: .4rem; border-radius: var(--dt-radius-sm); background: #F2F7F8; }
.dynamic-config__field-label { font-size: var(--dt-fs-xs); color: var(--dt-ink-soft); text-align: center; }
.dynamic-config__area-field input { width: 100%; min-width: 0; min-height: 40px; padding: .4rem .3rem; border: 0; border-radius: var(--dt-radius-xs); text-align: center; font-size: 1rem; color: var(--dt-ink); background: transparent; }
.dynamic-config__area-field .qty { align-self: center; margin: auto; }
.dynamic-config__remove { display: grid; place-items: center; align-self: center; width: 32px; height: 32px; padding: 0; border-radius: var(--dt-radius-sm); color: var(--dt-danger); background: var(--dt-surface-sunken); border: 0; cursor: pointer; }
.dynamic-config__add { display: flex; align-items: center; justify-content: center; gap: .3rem; padding: var(--dt-space-2); border: 1px dashed var(--dt-teal-400); border-radius: var(--dt-radius-md); color: var(--dt-teal-600); background: transparent; cursor: pointer; }
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
