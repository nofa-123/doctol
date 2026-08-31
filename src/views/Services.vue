<script setup>
/** Services index with category filter and search. */
import { computed, onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServiceCard from '@/components/services/ServiceCard.vue'
import DoctolIcon from '@/components/common/DoctolIcon.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import FinalCta from '@/components/common/FinalCta.vue'
import ServiceLandingsGrid from '@/components/landing/ServiceLandingsGrid.vue'
import { serviceCategories } from '@/data/services'
import { useServicesStore } from '@/stores/servicesStore'
import { vReveal } from '@/composables/useScrollAnimation'

const catalogue = useServicesStore()

const category = ref('all')
const query = ref('')
const debounced = ref('')

let timer = 0
watch(query, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    debounced.value = value
  }, 220)
})

const results = computed(() =>
  catalogue.filterServices({ category: category.value, query: debounced.value }),
)

onMounted(() => catalogue.ensureLoaded())
</script>

<template>
  <div class="services-page">
    <PageHeader
      eyebrow="خدمات دكتول"
      eyebrow-icon="grid"
      title="كل ما يحتاجه بيتك من نظافة"
      subtitle="سبع مجالات خدمية ينفذها فريق مدرّب بمعدات احترافية — بأسعار واضحة من البداية."
    />

    <!-- Service areas first: each opens its own landing page. -->
    <ServiceLandingsGrid />

    <section class="section section--tight">
      <div class="container container--wide">
        <div class="sv__toolbar">
          <div class="sv__filters" role="tablist" aria-label="تصنيفات الخدمات">
            <button
              v-for="cat in serviceCategories"
              :key="cat.id"
              type="button"
              role="tab"
              class="sv__filter"
              :class="{ 'sv__filter--on': category === cat.id }"
              :aria-selected="category === cat.id"
              @click="category = cat.id"
            >
              {{ cat.label }}
            </button>
          </div>

          <label class="sv__search">
            <DoctolIcon name="search" :size="19" />
            <input v-model="query" type="search" placeholder="ابحث عن خدمة…" aria-label="ابحث عن خدمة" />
          </label>
        </div>

        <div v-if="!catalogue.isReady" class="sv__grid">
          <div v-for="i in 6" :key="i" class="card-surface sv__skeleton">
            <SkeletonBlock height="190px" radius="0" />
            <div class="sv__skeleton-body">
              <SkeletonBlock height="1.1rem" width="55%" />
              <SkeletonBlock :lines="2" height="0.7rem" />
            </div>
          </div>
        </div>

        <div v-else-if="!results.length" class="sv__empty">
          <DoctolIcon name="search" :size="42" />
          <h2>ما لقينا نتائج</h2>
          <p>جرّب كلمة مختلفة أو تصفح كل الخدمات.</p>
          <BaseButton
            variant="outline"
            @click="
              () => {
                query = ''
                debounced = ''
                category = 'all'
              }
            "
          >
            عرض كل الخدمات
          </BaseButton>
        </div>

        <ul v-else class="sv__grid">
          <li
            v-for="(service, index) in results"
            :key="service.id"
            v-reveal="{ delay: Math.min(index, 5) * 60 }"
          >
            <ServiceCard :service="service" />
          </li>
        </ul>
      </div>
    </section>

    <FinalCta />
  </div>
</template>

<style scoped>
.sv__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--dt-space-4);
  margin-block-end: var(--dt-space-6);
}

.sv__filters {
  display: flex;
  gap: var(--dt-space-2);
  flex-wrap: wrap;
}

.sv__filter {
  min-height: 44px;
  padding: 0.55rem 1.1rem;
  border-radius: var(--dt-radius-pill);
  border: 1.5px solid var(--dt-line);
  background: var(--dt-surface);
  font-size: var(--dt-fs-sm);
  font-weight: var(--dt-fw-medium);
  color: var(--dt-ink-soft);
  transition:
    border-color var(--dt-dur-2) var(--dt-ease-out),
    background-color var(--dt-dur-2) var(--dt-ease-out),
    color var(--dt-dur-2) var(--dt-ease-out);
}

.sv__filter:hover {
  border-color: var(--dt-teal-300);
  color: var(--dt-teal-700);
}

.sv__filter--on {
  background: var(--dt-grad-primary);
  border-color: transparent;
  color: #fff;
  box-shadow: var(--dt-shadow-teal);
}

.sv__search {
  display: flex;
  align-items: center;
  gap: var(--dt-space-2);
  padding-inline: var(--dt-space-4);
  min-width: min(100%, 280px);
  border: 1.5px solid var(--dt-line);
  border-radius: var(--dt-radius-pill);
  background: var(--dt-surface);
  color: var(--dt-muted);
  transition: border-color var(--dt-dur-2) var(--dt-ease-out);
}

.sv__search:focus-within {
  border-color: var(--dt-teal-400);
  box-shadow: 0 0 0 4px var(--dt-focus-ring);
}

.sv__search input {
  flex: 1;
  min-height: 46px;
  border: 0;
  outline: none;
  background: none;
  color: var(--dt-ink);
}

.sv__grid {
  display: grid;
  gap: var(--dt-space-5);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
}

.sv__grid > li {
  min-width: 0;
}

.sv__skeleton {
  overflow: hidden;
}

.sv__skeleton-body {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-3);
  padding: var(--dt-space-5);
}

.sv__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dt-space-3);
  padding: var(--dt-space-16) var(--dt-space-4);
  text-align: center;
  color: var(--dt-muted);
}

.sv__empty :deep(svg) {
  color: var(--dt-line-strong);
}

.sv__empty h2 {
  font-size: var(--dt-fs-h3);
  color: var(--dt-ink);
}

@media (max-width: 767px) {
  .services-page :deep(.ph) {
    padding-block: calc(var(--dt-header-h) + 22px) 28px;
  }

  .services-page :deep(.ph__title) {
    max-width: 12ch;
    font-size: 1.75rem;
    line-height: 1.3;
  }

  .services-page :deep(.ph__subtitle) {
    font-size: 0.83rem;
    line-height: 1.65;
  }

  .services-page :deep(.sla) { padding-block: 26px; }
  .services-page :deep(.sla__grid) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .services-page :deep(.sla__card) { border-radius: 17px; }
  .services-page :deep(.sla__media) { aspect-ratio: 1.2 / 1; }
  .services-page :deep(.sla__icon) {
    width: 36px;
    height: 36px;
    inset-block-end: 8px;
    inset-inline-start: 8px;
  }
  .services-page :deep(.sla__body) { gap: 5px; padding: 11px; }
  .services-page :deep(.sla__name) { font-size: 0.9rem; }
  .services-page :deep(.sla__desc) { font-size: 0.68rem; }
  .services-page :deep(.sla__foot) { gap: 5px; padding-block-start: 8px; }
  .services-page :deep(.sla__price) { font-size: 0.62rem; }
  .services-page :deep(.sla__cta) { font-size: 0.68rem; }

  .sv__toolbar { gap: 12px; margin-block-end: 18px; }
  .sv__filters {
    width: 100%;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-block-end: 4px;
    scrollbar-width: none;
  }
  .sv__filters::-webkit-scrollbar { display: none; }
  .sv__filter { flex: none; min-height: 38px; padding: 7px 12px; font-size: 0.72rem; }
  .sv__search { width: 100%; min-width: 0; }
  .sv__search input { min-height: 42px; }
  .sv__grid { grid-template-columns: 1fr; gap: 16px; }
  .services-page :deep(.sv__grid .sc) {
    border-radius: 20px;
    box-shadow: 0 12px 30px -24px rgb(7 59 76 / 0.55);
  }
  .services-page :deep(.sv__grid .sc__media) { height: 178px; }
  .services-page :deep(.sv__grid .sc__body) { padding: 28px 16px 16px; }
  .services-page :deep(.sv__grid .sc__name) { font-size: 1rem; }
  .services-page :deep(.sv__grid .sc__tagline),
  .services-page :deep(.sv__grid .sc__summary) { font-size: 0.78rem; line-height: 1.65; }
}
</style>
