<script setup>
/** Packages grid with single-open expansion. */
import { ref } from 'vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import PackageCard from '@/components/packages/PackageCard.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import CarouselControls from '@/components/common/CarouselControls.vue'
import { useServicesStore } from '@/stores/servicesStore'
import { useCarousel } from '@/composables/useCarousel'

defineProps({
  showAction: { type: Boolean, default: true },
})

const catalogue = useServicesStore()
const expandedId = ref('')
const { track, trackHandlers, activeIndex, canPrev, canNext, next, prev, scrollToIndex } =
  useCarousel({ loop: false })

function toggle(id) {
  expandedId.value = expandedId.value === id ? '' : id
}
</script>

<template>
  <section id="packages" class="section">
    <div class="container container--wide">
      <SectionHeader
        eyebrow="وفّر أكثر"
        eyebrow-icon="gift"
        title="باقات دكتول"
        subtitle="اجمع أكثر من خدمة في زيارة واحدة، وادفع أقل مما لو حجزتها منفصلة."
      >
        <template v-if="showAction" #action>
          <BaseButton variant="outline" icon-end="arrow-left" :to="{ name: 'packages' }">
            كل الباقات
          </BaseButton>
        </template>
      </SectionHeader>

      <ul ref="track" class="rail packages__slider" v-bind="trackHandlers">
        <li
          v-for="pkg in catalogue.packages"
          :key="pkg.id"
          class="packages__slide"
        >
          <PackageCard :pkg="pkg" :expanded="expandedId === pkg.id" @toggle="toggle" />
        </li>
      </ul>

      <CarouselControls
        v-if="catalogue.packages.length > 1"
        class="packages__controls"
        :can-prev="canPrev"
        :can-next="canNext"
        :count="catalogue.packages.length"
        :active-index="activeIndex"
        @prev="prev"
        @next="next"
        @go="scrollToIndex"
      />
    </div>
  </section>
</template>

<style scoped>
.packages__slider {
  align-items: stretch;
  min-height: 430px;
  padding-block: 14px;
  margin-block: -14px;
}

.packages__slide {
  width: min(82vw, 390px);
  min-width: 0;
  min-height: 400px;
  display: flex;
  scroll-snap-align: start;
  opacity: 1;
  transform: none;
}

.packages__slide > * { width: 100%; }

.packages__controls {
  justify-content: center;
  margin-block-start: var(--dt-space-5);
}

.packages__controls :deep(.cc__buttons) {
  display: none;
}

@media (min-width: 768px) {
  .packages__slide { width: min(42vw, 420px); }
}

@media (min-width: 1200px) {
  .packages__slide { width: 390px; }
}

@media (max-width: 767px) {
  .packages__slider {
    min-height: 460px;
    padding-inline-end: var(--dt-gutter);
  }

  .packages__slide {
    width: 86vw;
    min-height: 430px;
  }
}
</style>
