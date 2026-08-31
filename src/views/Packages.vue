<script setup>
/** Packages page — bundles plus a comparison table. */
import { computed, onMounted } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PackagesSection from '@/components/packages/PackagesSection.vue'
import DoctolIcon from '@/components/common/DoctolIcon.vue'
import FaqSection from '@/components/faq/FaqSection.vue'
import FinalCta from '@/components/common/FinalCta.vue'
import { formatPrice } from '@/utils/format'
import { useServicesStore } from '@/stores/servicesStore'
import { vReveal } from '@/composables/useScrollAnimation'

const catalogue = useServicesStore()

onMounted(() => catalogue.ensureLoaded())

/** Rows = every service that appears in at least one package. */
const rows = computed(() => {
  const ids = new Set()
  catalogue.packages.forEach((pkg) => pkg.items.forEach((item) => ids.add(item.serviceId)))
  return [...ids].map((id) => catalogue.serviceById(id)).filter(Boolean)
})

const includes = (pkg, serviceId) => pkg.items.some((item) => item.serviceId === serviceId)
</script>

<template>
  <div class="packages-page">
    <PageHeader
      eyebrow="باقات دكتول"
      eyebrow-icon="gift"
      title="وفّر أكثر مع الباقات"
      subtitle="اجمع أكثر من خدمة في زيارة واحدة، وادفع أقل مما لو حجزتها منفصلة."
    />

    <PackagesSection :show-action="false" />

    <section v-if="rows.length" class="section section--sunken">
      <div class="container container--wide">
        <h2 class="pkv__title">مقارنة الباقات</h2>
        <div class="pkv__scroll">
          <table v-reveal class="pkv__table">
            <caption class="visually-hidden">
              مقارنة محتويات وأسعار باقات دكتول
            </caption>
            <thead>
              <tr>
                <th scope="col">الخدمة</th>
                <th v-for="pkg in catalogue.packages" :key="pkg.id" scope="col">
                  {{ pkg.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="service in rows" :key="service.id">
                <th scope="row">
                  <DoctolIcon :name="service.icon" :size="17" />
                  {{ service.name }}
                </th>
                <td v-for="pkg in catalogue.packages" :key="pkg.id">
                  <DoctolIcon
                    v-if="includes(pkg, service.id)"
                    name="check"
                    :size="17"
                    :stroke="2.6"
                    class="pkv__yes"
                    label="مشمول"
                  />
                  <span v-else class="pkv__no" aria-label="غير مشمول">—</span>
                </td>
              </tr>
              <tr class="pkv__price-row">
                <th scope="row">السعر</th>
                <td v-for="pkg in catalogue.packages" :key="pkg.id" class="money">
                  {{ formatPrice(pkg.price) }}
                </td>
              </tr>
              <tr class="pkv__save-row">
                <th scope="row">التوفير</th>
                <td v-for="pkg in catalogue.packages" :key="pkg.id" class="money">
                  {{ formatPrice(pkg.saving) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <FaqSection />
    <FinalCta />
  </div>
</template>

<style scoped>
.pkv__title {
  font-size: var(--dt-fs-h2);
  margin-block-end: var(--dt-space-6);
}

/* Wide tables scroll inside their own container, never the page. */
.pkv__scroll {
  overflow-x: auto;
  border-radius: var(--dt-radius-xl);
  border: 1px solid var(--dt-line);
  background: var(--dt-surface);
}

.pkv__table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
}

.pkv__table th,
.pkv__table td {
  padding: var(--dt-space-4);
  text-align: start;
  border-block-end: 1px solid var(--dt-line);
  font-size: var(--dt-fs-sm);
}

.pkv__table thead th {
  background: var(--dt-teal-50);
  color: var(--dt-navy-700);
  font-weight: var(--dt-fw-bold);
  position: sticky;
  inset-block-start: 0;
}

.pkv__table tbody th {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: var(--dt-fw-medium);
  color: var(--dt-ink-soft);
}

.pkv__table tbody th :deep(svg) {
  color: var(--dt-teal-500);
}

.pkv__table td {
  text-align: center;
}

.pkv__yes {
  display: inline-block;
  color: var(--dt-success);
}

.pkv__no {
  color: var(--dt-line-strong);
}

.pkv__price-row td,
.pkv__save-row td {
  font-weight: var(--dt-fw-bold);
  color: var(--dt-teal-700);
}

.pkv__save-row td {
  color: var(--dt-success);
}

.pkv__save-row th,
.pkv__save-row td {
  border-block-end: 0;
}

@media (max-width: 767px) {
  .packages-page :deep(.ph) {
    padding-block: calc(var(--dt-header-h) + 22px) 28px;
  }

  .packages-page :deep(.ph__inner) {
    gap: 8px;
  }

  .packages-page :deep(.ph__title) {
    font-size: 1.75rem;
    line-height: 1.3;
  }

  .packages-page :deep(.ph__subtitle) {
    max-width: 32ch;
    font-size: 0.85rem;
    line-height: 1.65;
  }

  .packages-page :deep(.packages__grid) {
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
    margin-inline: 0;
    padding-inline: 0;
    overflow: visible;
  }

  .packages-page :deep(.packages__grid > li) {
    width: 100%;
    flex: none;
  }

  .packages-page :deep(.pc) {
    display: flex;
    height: auto;
    min-height: 0;
    gap: 12px;
    padding: 14px;
    border-radius: 22px;
    box-shadow: 0 14px 34px -25px rgb(7 59 76 / 0.55);
  }

  .packages-page :deep(.pc__toggle) {
    display: flex;
  }

  .packages-page :deep(.pc__media) {
    min-height: 0;
    border-radius: 17px;
  }

  .packages-page :deep(.pc__media img) {
    height: auto;
    max-height: 210px;
    aspect-ratio: 16 / 9;
  }

  .packages-page :deep(.pc__name) { font-size: 1.15rem; }
  .packages-page :deep(.pc__tagline) { font-size: 0.8rem; line-height: 1.6; }
  .packages-page :deep(.pc__items) { overflow: visible; }
  .packages-page :deep(.pc__items li) { font-size: 0.8rem; line-height: 1.5; }
  .packages-page :deep(.pc__items li:nth-child(n)) { display: flex; }
  .packages-page :deep(.pc__cta) { min-height: 48px; font-size: 0.9rem; border-radius: 14px; }

  .pkv__title { font-size: 1.35rem; margin-block-end: 14px; }
  .pkv__scroll { border-radius: 16px; }
  .pkv__table { min-width: 560px; }
  .pkv__table th,
  .pkv__table td { padding: 12px; font-size: 0.75rem; }
}
</style>
