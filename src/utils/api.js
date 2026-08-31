/**
 * API layer.
 *
 * Every network-shaped read/write in the app goes through this module.
 * All data is fetched from the Laravel backend API - no dummy data fallback.
 */

// Keep imports for fallback images only (not for data)
import { services, categories } from '@/data/services'
import { toISODate } from '@/utils/format'
import { doctolApi } from '@/services/doctolApi'
import {
  apiData,
  mapCategory,
  mapCity,
  mapOffer,
  mapPackage,
  mapService,
  mapBookableServices,
  mapMediaUrl,
} from '@/services/apiMappers'

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

let remoteServices = []

const categorySlugMap = {
  'rehabilitation-cleaning': 'rehab',
  'furniture-cleaning': 'furniture',
  'pools-and-tanks': 'pools',
  'mosque-cleaning': 'mosques',
  'commercial-cleaning': 'commercial',
  'car-cleaning': 'cars',
  'pest-control': 'pest',
}

function localCategoryFor(item, index = 0) {
  const remoteSlug = item?.parentServiceSlug ?? item?.parent_service_slug ?? item?.slug
  const localId = categorySlugMap[remoteSlug]
  return categories.find((entry) => entry.id === localId)
    ?? categories.find((entry) => entry.name === (item?.title ?? item?.name))
    ?? categories[index % categories.length]
}

function withLocalServiceMedia(item, index = 0) {
  // Only use local data for images/icons fallback, not for config
  const local = services.find((entry) => entry.id === item.slug || entry.slug === item.slug)
    ?? services.find((entry) => entry.name === item.name)
  const category = localCategoryFor(item, index)
  const fallbackImage = local?.image || category?.photo || category?.image || ''
  return {
    // Don't spread local - only use API data for service config
    ...item,
    image: item.image || fallbackImage,
    fallbackImage,
    icon: item.icon || local?.icon || category?.icon || 'sparkle',
  }
}



export const fetchServices = async () => {
  // Fetch services from API only - no dummy data fallback
  const source = apiData.list(await doctolApi.services())
  // The current contract includes every bookable child and its complete
  // configuration_schema in the list response. Avoid the legacy detail
  // request, which is neither needed nor part of the booking flow.
  const mapped = mapBookableServices(source)

  remoteServices = mapped.map(withLocalServiceMedia)
  return remoteServices
}

export const fetchCategories = async () => {
  // Fetch categories from API only - no dummy data fallback
  const serviceSource = apiData.list(await doctolApi.services())
  if (!remoteServices.length) remoteServices = mapBookableServices(serviceSource).map(withLocalServiceMedia)
  const source = serviceSource
    .map((item) => {
      const nested = item.category ?? (typeof item.main_service === 'object' ? item.main_service : null)
      return nested || (item.main_service === true ? item : null)
    })
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
  if (source.length) {
    return [...new Map(source.map((item) => [item.id ?? item.slug, item])).values()]
      .map((item, index) => {
        const remote = mapCategory(item, index)
        const local = localCategoryFor(item, index)
        const fallbackImage = local?.photo || local?.image || ''
        return {
          ...remote,
          name: remote.name === 'خدمات أخرى' ? (local?.name ?? remote.name) : remote.name,
          image: remote.image || local?.image || fallbackImage,
          photo: remote.photo || local?.photo || local?.image || '',
          fallbackImage,
          icon: remote.icon === 'grid' ? (local?.icon ?? remote.icon) : remote.icon,
        }
      })
  }
  // Derive categories from services if not available directly
  const derived = [...new Map(remoteServices.map((item) => [
    String(item.categoryId || 'other'),
    {
      id: String(item.categoryId || 'other'),
      slug: String(item.categoryId || 'other'),
      name: item.category?.name ?? item.category_name ?? 'خدمات أخرى',
      icon: item.category?.icon ?? 'grid',
    },
  ])).values()]
  return derived.map(mapCategory)
}
export const fetchService = async (idOrSlug) => {
  // Fetch service from API only - no dummy data fallback
  const response = apiData.unwrap(await doctolApi.service(idOrSlug), {})
  const source = response?.service ?? response?.item ?? response
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('الخدمة غير موجودة')
  }
  const mapped = mapService(source)
  return withLocalServiceMedia(mapped)
}
export const fetchOffers = async () => {
  // Fetch offers from API only - no dummy data fallback
  const result = apiData.list(await doctolApi.offers()).map(mapOffer)
  return result.filter((item) => item.isBookable)
}
export const fetchPackages = async (serviceSlug = '') => {
  // Fetch packages from API only - no dummy data fallback
  const source = apiData.list(await doctolApi.packages(serviceSlug))

  // The list serializer may omit package services, media or perks. Enrich
  // every row from Laravel's package-detail endpoint.
  const detailed = await Promise.all(source.map(async (summary) => {
    const slug = summary.slug ?? summary.id
    if (!slug) return summary
    try {
      const response = apiData.unwrap(await doctolApi.package(slug), summary)
      const detail = response?.package ?? response?.item ?? response
      return detail && typeof detail === 'object' && !Array.isArray(detail)
        ? { ...summary, ...detail }
        : summary
    } catch {
      return summary
    }
  }))

  return detailed
    .map(mapPackage)
    .filter((item) => item.slug && item.isActive !== false && item.isBookable !== false)
}
function mapReview(item, index = 0) {
  return {
    ...item,
    id: item.id ?? `review-${index}`,
    name: localizedText(item.customer_name ?? item.client_name ?? item.name, 'عميل دكتول'),
    city: localizedText(item.city?.name ?? item.city_name ?? item.city, ''),
    district: localizedText(item.neighborhood?.name ?? item.district ?? item.neighborhood_name, ''),
    rating: Number(item.rating ?? item.stars ?? 5),
    text: localizedText(item.comment ?? item.review ?? item.content ?? item.text, ''),
    serviceLabel: localizedText(item.service?.name ?? item.service_name ?? item.service, ''),
    date: localizedText(item.date_label ?? item.created_at ?? item.date, ''),
    verified: item.verified ?? item.is_verified ?? true,
    photo: mapMediaUrl(mediaUrl(item.photo_url ?? item.image_url ?? item.photo ?? item.image)) || '',
  }
}

export const fetchReviews = async () => {
  // Fetch reviews from API only - no dummy data fallback
  const response = await doctolApi.reviews('home')
  const payload = apiData.unwrap(response, {})
  const items = apiData.list(response).map(mapReview)
  const summarySource =
    payload.rating_summary ??
    payload.reviews_summary ??
    payload.summary ??
    response?.meta?.rating_summary ??
    {}
  const summary = {
    average: Number(summarySource.average ?? summarySource.rating ?? 0),
    total: Number(summarySource.total ?? summarySource.count ?? payload.total ?? 0),
    breakdown: summarySource.breakdown ?? {},
  }
  return { items, summary }
}

export const fetchSettings = async () => {
  // Fetch settings from API only
  return apiData.unwrap(await doctolApi.settings(), {})
}

export const fetchSpinRewards = async () => {
  // Fetch spin rewards from API only
  const response = await doctolApi.spinRewards()
  const payload = apiData.unwrap(response, {})
  if (Array.isArray(payload)) return payload
  return payload.rewards ?? payload.items ?? payload.prizes ?? payload.data ?? []
}
/**
 * The index only ever renders the teaser fields, so the list endpoint projects
 * them out and leaves the article body to `fetchArticle`. A real API would draw
 * the same line; keeping it here means the store never holds eight full bodies
 * it has no use for.
 */
const teaser = ({ sections, faq, takeaways, cta, intro, related, ...rest }) => rest

function localizedText(value, fallback = '') {
  if (value == null) return fallback
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return localizedText(JSON.parse(trimmed), fallback)
      } catch {
        return trimmed
      }
    }
    return trimmed || fallback
  }
  if (typeof value === 'object') {
    return localizedText(
      value.ar ?? value.name_ar ?? value.title_ar ?? value.name ?? value.title ?? value.label ?? value.en,
      fallback,
    )
  }
  return String(value)
}

function mediaUrl(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return mediaUrl(value[0])
  if (typeof value === 'object') {
    return mediaUrl(value.url ?? value.original_url ?? value.full_url ?? value.path ?? value.src)
  }
  return ''
}

export const fetchArticles = async () => {
  // Fetch articles from API only - no dummy data fallback
  const result = apiData.list(await doctolApi.blog('page=1&per_page=20'))
  return result.map((item, index) => {
    const category = item.category ?? item.blog_category ?? item.category_name
    const remoteImage = mapMediaUrl(mediaUrl(
      item.image_url ??
      item.cover_image_url ??
      item.featured_image_url ??
      item.thumbnail_url ??
      item.image ??
      item.cover_image ??
      item.featured_image ??
      item.thumbnail ??
      item.media,
    ))
    return {
      ...item,
      id: item.id ?? `article-${index}`,
      slug: item.slug ?? '',
      title: localizedText(item.title ?? item.name, ''),
      excerpt: localizedText(item.excerpt ?? item.short_description ?? item.description, ''),
      category: localizedText(category?.name ?? category?.title ?? category, ''),
      categoryId: category?.slug ?? item.category_slug ?? item.category_id ?? '',
      image: remoteImage || '',
      readingTime: localizedText(item.reading_time ?? item.read_time ?? item.display_reading_time, ''),
      iso: item.published_at ?? item.date ?? item.created_at ?? '',
    }
  })
}
export const fetchArticle = async (slug) => {
  // Fetch article from API only - no dummy data fallback
  const response = apiData.unwrap(await doctolApi.article(slug), {})
  const item = response?.article ?? response?.item ?? response
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error('المقال غير موجود')
  }
  const remoteImage = mapMediaUrl(mediaUrl(
    item.image_url ?? item.cover_image_url ?? item.featured_image_url ?? item.image ?? item.media,
  ))
  return {
    ...item,
    slug: item.slug ?? slug,
    title: localizedText(item.title ?? item.name, ''),
    excerpt: localizedText(item.excerpt ?? item.short_description ?? item.description, ''),
    intro: localizedText(item.intro ?? item.summary ?? item.description, ''),
    category: localizedText(item.category?.name ?? item.category_name ?? item.category, ''),
    image: remoteImage || '',
    readingTime: localizedText(item.reading_time ?? item.read_time, ''),
    iso: item.published_at ?? item.created_at ?? item.date ?? '',
    sections: Array.isArray(item.sections) ? item.sections : [],
    faq: Array.isArray(item.faq) ? item.faq : [],
    takeaways: Array.isArray(item.takeaways) ? item.takeaways : [],
    related: Array.isArray(item.related) ? item.related : [],
    cta: item.cta ?? null,
  }
}
export const fetchHomeContent = async () => {
  // Fetch home content from API only - no dummy data fallback
  const home = apiData.unwrap(await doctolApi.home(), {})
  const remoteFaqs = apiData.list(await doctolApi.faqs('home'))
  const heroSection = home.heroes_section ?? home.hero_section ?? home.hero ?? {}
  const heroInfo = heroSection.info ?? heroSection.content ?? heroSection
  return {
    trustFeatures: home.trust_features ?? home.features ?? [],
    stats: home.stats ?? [],
    experienceSteps: home.experience_steps ?? home.how_it_works ?? [],
    beforeAfterCases: home.before_after ?? home.before_after_cases ?? [],
    faqs: remoteFaqs.length ? remoteFaqs : (home.faqs ?? []),
    discoveryOptions: home.discovery_options ?? [],
    hero: {
      title: localizedText(heroInfo.title ?? heroInfo.heading, ''),
      description: localizedText(heroInfo.description ?? heroInfo.subtitle, ''),
      eyebrow: localizedText(heroInfo.eyebrow ?? heroInfo.badge_text, ''),
      buttonText: localizedText(heroInfo.button_1_text ?? heroInfo.button_text, ''),
      image: mapMediaUrl(mediaUrl(heroInfo.image_url ?? heroInfo.image ?? heroSection.image)),
      checks: Array.isArray(heroInfo.features ?? heroInfo.checks)
        ? (heroInfo.features ?? heroInfo.checks).map((item) => localizedText(item?.title ?? item?.label ?? item)).filter(Boolean)
        : [],
    },
    raw: home,
  }
}
export const fetchCities = async () => {
  // Fetch cities from API only - no dummy data fallback
  const result = apiData.list(await doctolApi.cities()).map(mapCity)
  return result
}

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */

const SLOT_TIMES = [
  '08:00',
  '10:00',
  '12:00',
  '14:00',
  '16:00',
  '18:00',
  '20:00',
]

/**
 * Deterministic pseudo-availability so a given date always looks the same
 * within a session (a real endpoint reads the dispatch calendar).
 */
function slotSeed(dateISO, time) {
  let h = 0
  const key = `${dateISO}${time}`
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h
}

export async function fetchAvailability(dateISO, serviceSlug = '') {
  if (serviceSlug) {
    try {
      const response = await doctolApi.availability(serviceSlug, dateISO)
      const data = apiData.unwrap(response, {})
      const slots = Array.isArray(data)
        ? data
        : (
            data.slots ??
            data.available_slots ??
            data.time_slots ??
            data.available_times ??
            data.times ??
            data.windows ??
            data.availability ??
            []
          )
      if (slots.length) {
        return slots.map((slot) => {
          const time = typeof slot === 'string'
            ? slot
            : (slot.time ?? slot.start_time ?? slot.start ?? slot.from)
          const available = typeof slot === 'string' ? true : Boolean(slot.available ?? slot.is_available ?? slot.status !== 'booked')
          const remaining = Number(slot.remaining ?? slot.remaining_teams ?? (available ? 1 : 0))
          return { time, available, remaining, lowStock: available && remaining === 1 }
        }).filter((slot) => Boolean(slot.time))
      }
      return []
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[Doctol API] Availability request failed:', error.message)
      // Never invent selectable times after a Laravel failure. A synthetic
      // slot can look valid in Vue but will be rejected by booking/quote.
      return []
    }
  }
  return []
}

/** Next 14 bookable days. */
export async function fetchBookableDays() {
  const out = []
  const today = new Date()
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    // Only Laravel's cart-availability response decides whether a date has
    // slots. Never disable a real date using demo/pseudo availability.
    out.push({ date: toISODate(d), full: false })
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Bookings                                                            */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Simulated create-booking. Rejects for one magic phone number so the error
 * state is reachable in a demo without touching code.
 */
export async function createBooking(payload) {
  return doctolApi.createBooking(payload)
}

/** Promo codes accepted by the demo checkout. */
const PROMOS = {
  DOCTOL10: { type: 'percent', value: 10, label: 'خصم 10٪' },
  CLEAN50: { type: 'fixed', value: 50, label: 'خصم 50 ريال' },
  WELCOME: { type: 'percent', value: 15, label: 'خصم الترحيب 15٪' },
}

export async function validatePromo(code, phone = '') {
  const key = String(code || '').trim().toUpperCase()
  try {
    const normalizedPhone = String(phone || '').replace(/\D/g, '')
    const response = await doctolApi.validatePromo(key, normalizedPhone)
    const data = apiData.unwrap(response, {})
    if (data.valid === false) throw new ApiError(data.message ?? 'كود الخصم غير صالح.', 422)
    return {
      code: key,
      type: data.type ?? data.discount_type ?? 'percent',
      value: Number(data.value ?? data.discount_value ?? data.discount ?? 0),
      label: data.label ?? data.message ?? `تم تطبيق الكود ${key}`,
    }
  } catch (error) {
    if (!import.meta.env.DEV) throw error
    const promo = PROMOS[key]
    if (!promo) throw error
    return { code: key, ...promo }
  }
}
