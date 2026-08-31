<script setup>
/** All active promotions. */
import { onMounted } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import OfferCard from '@/components/offers/OfferCard.vue'
import PackagesSection from '@/components/packages/PackagesSection.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import DoctolIcon from '@/components/common/DoctolIcon.vue'
import FinalCta from '@/components/common/FinalCta.vue'
import { useServicesStore } from '@/stores/servicesStore'
import { vReveal } from '@/composables/useScrollAnimation'

const catalogue = useServicesStore()

onMounted(() => catalogue.ensureLoaded())
</script>

<template>
  <div class="offers-page">
    <PageHeader
      eyebrow="عروض محدودة"
      eyebrow-icon="percent"
      title="عروض دكتول الحالية"
      subtitle="خصومات حقيقية بمدة وكمية محدودة — احجز قبل انتهاء العرض."
    />

    <section class="section section--tight">
      <div class="container container--wide">
        <div v-if="!catalogue.isReady" class="off__grid">
          <div v-for="i in 3" :key="i" class="card-surface off__skeleton">
            <SkeletonBlock height="200px" radius="0" />
            <div class="off__skeleton-body">
              <SkeletonBlock height="1.2rem" width="65%" />
              <SkeletonBlock :lines="3" height="0.7rem" />
            </div>
          </div>
        </div>

        <ul v-else class="off__grid">
          <li
            v-for="(offer, index) in catalogue.offers"
            :key="offer.id"
            v-reveal="{ delay: index * 90 }"
          >
            <OfferCard :offer="offer" />
          </li>
        </ul>

        <p class="off__note">
          <DoctolIcon name="info" :size="17" />
          العروض لا تُجمع مع أكواد خصم أخرى، وتسري على المدن المغطاة فقط.
        </p>
      </div>
    </section>

    <PackagesSection :show-action="false" />
    <FinalCta />
  </div>
</template>

<style scoped>
.off__grid {
  display: grid;
  gap: var(--dt-space-5);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 330px), 1fr));
  align-items: stretch;
}

.off__grid > li {
  min-width: 0;
}

.off__skeleton {
  overflow: hidden;
}

.off__skeleton-body {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-3);
  padding: var(--dt-space-5);
}

.off__note {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  justify-content: center;
  margin-block-start: var(--dt-space-6);
  font-size: var(--dt-fs-xs);
  color: var(--dt-muted);
  text-align: center;
}

.off__note :deep(svg) {
  color: var(--dt-teal-500);
  flex: none;
}

@media (max-width: 767px) {
  .offers-page :deep(.ph) {
    padding-block: calc(var(--dt-header-h) + 22px) 28px;
  }

  .offers-page :deep(.ph__title) {
    font-size: 1.75rem;
    line-height: 1.3;
  }

  .offers-page :deep(.ph__subtitle) {
    font-size: 0.85rem;
    line-height: 1.65;
  }

  .off__grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .offers-page :deep(.oc) {
    height: auto;
    min-height: 0;
    border-radius: 20px;
  }

  .offers-page :deep(.oc__media) {
    aspect-ratio: 16 / 9;
  }

  .offers-page :deep(.oc__body) {
    gap: 12px;
    padding: 16px;
  }

  .offers-page :deep(.oc__title) { font-size: 1.15rem; }
  .offers-page :deep(.oc__subtitle) { font-size: 0.8rem; }
  .offers-page :deep(.oc__highlights) { display: flex; }
  .offers-page :deep(.oc__highlights li) { font-size: 0.72rem; }
  .offers-page :deep(.oc__scarcity) { display: flex; }
  .offers-page :deep(.oc__body > .btn) { min-height: 46px; font-size: 0.9rem; }

  .offers-page :deep(.packages__grid) {
    display: grid;
    grid-template-columns: 1fr;
    margin-inline: 0;
    padding-inline: 0;
    overflow: visible;
  }

  .offers-page :deep(.packages__grid > li) { width: 100%; flex: none; }
  .offers-page :deep(.pc) { height: auto; min-height: 0; }
}
</style>
