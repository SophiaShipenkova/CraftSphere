const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8000'

export type Product = {
  id: number
  seller_id: number
  title: string
  description: string
  price: number
  stock: number
  images: string[]
  tags: string[]
  avg_rating?: number | null
  review_count?: number
}

export type Service = {
  id: number
  seller_id: number
  title: string
  description: string
  price: number
  duration: number
  images: string[]
  tags: string[]
  avg_rating?: number | null
  review_count?: number
}

export type Seller = {
  id: number
  name: string
  description: string
  avatar: string | null
  cover_image?: string | null
  location: string | null
  subscribed?: boolean
}

export type Me = {
  id: number
  email: string
  role: 'seller' | 'buyer' | 'admin'
  display_name: string | null
  seller_profile_id: number | null
  seller_name: string | null
  seller_description: string | null
  seller_location: string | null
}

export type SearchResult = {
  products: Array<{ id: number; title: string; price: number }>
  services: Array<{ id: number; title: string; price: number }>
  sellers: Array<{ id: number; name: string; location: string | null }>
  tags: Array<{ id: number; name: string }>
}

export type CatalogItem = {
  kind: 'product' | 'service'
  id: number
  title: string
  price: number
  image: string | null
  seller_name: string
  seller_id: number
  tags: string[]
  description?: string
  duration?: number | null
  avg_rating?: number | null
}

export type ReviewSummary = {
  avg_rating: number | null
  count: number
}

export type Review = {
  id: number
  author_name: string
  rating: number
  text: string
  created_at: string
  upvotes: number
  downvotes: number
  my_vote: number | null
  is_mine?: boolean
}

export type ReviewsResponse = {
  summary: ReviewSummary
  items: Review[]
}

export type CatalogResponse = {
  categories: Array<{ name: string; count: number }>
  items: CatalogItem[]
  total: number
}

export type Showcase = {
  seller: Seller
  products: Product[]
  services: Service[]
  blog_posts: Array<{ id: number; title: string; content: string; created_at: string }>
}

export type ScheduleSlot = {
  id: number
  service_id: number
  start_time: string
  end_time: string
  seats: number
  seats_booked: number
  seats_available: number
  location: string
}

export type CartResponse = {
  items: Array<{ product_id: number; title: string; price: number; quantity: number; image: string | null; stock: number }>
  total: number
  count: number
}

export type Order = {
  id: number
  status: string
  total: number
  created_at: string
  items: Array<{ product_id: number | null; title: string; price: number; quantity: number }>
}

export type Enrollment = {
  id: number
  schedule_id: number
  service_id: number
  service_title: string
  start_time: string
  end_time: string
  location: string
  created_at: string
}

export function parseApiError(text: string): string {
  try {
    const data = JSON.parse(text) as { detail?: string | Array<{ msg?: string }> }
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail)) {
      return data.detail.map((x) => x.msg || String(x)).join(', ')
    }
  } catch {
    /* plain text */
  }
  return text || 'Ошибка сервера'
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(parseApiError(text) || `API error ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function resolveMediaUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE_URL}${url}`
}

export function gradientFromUser(id: number, name: string): string {
  const seed = `${id}-${name}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  const h1 = Math.abs(hash) % 360
  const h2 = (h1 + 70) % 360
  return `linear-gradient(135deg, hsl(${h1} 72% 56%), hsl(${h2} 78% 52%))`
}

export const api = {
  home: () => apiFetch<any>('/home'),
  catalog: (params: URLSearchParams) => apiFetch<CatalogResponse>(`/catalog?${params}`),
  products: () => apiFetch<Product[]>('/products'),
  product: (id: number) => apiFetch<Product>(`/products/${id}`),
  productSimilar: (id: number) => apiFetch<CatalogItem[]>(`/products/${id}/similar`),
  productReviews: (id: number) => apiFetch<ReviewsResponse>(`/products/${id}/reviews`),
  createProductReview: (id: number, payload: { rating: number; text?: string }) =>
    apiFetch<Review>(`/products/${id}/reviews`, { method: 'POST', body: JSON.stringify(payload) }),
  services: () => apiFetch<Service[]>('/services'),
  service: (id: number) => apiFetch<Service>(`/services/${id}`),
  serviceSimilar: (id: number) => apiFetch<CatalogItem[]>(`/services/${id}/similar`),
  serviceReviews: (id: number) => apiFetch<ReviewsResponse>(`/services/${id}/reviews`),
  createServiceReview: (id: number, payload: { rating: number; text?: string }) =>
    apiFetch<Review>(`/services/${id}/reviews`, { method: 'POST', body: JSON.stringify(payload) }),
  voteReview: (reviewId: number, value: 1 | -1) =>
    apiFetch<Review>(`/reviews/${reviewId}/vote`, { method: 'POST', body: JSON.stringify({ value }) }),
  deleteReview: (reviewId: number) => apiFetch<void>(`/reviews/${reviewId}`, { method: 'DELETE' }),
  sellers: () => apiFetch<Seller[]>('/sellers'),
  seller: (id: number) => apiFetch<Seller>(`/sellers/${id}`),
  showcase: (id: number) => apiFetch<Showcase>(`/sellers/${id}/showcase`),
  subscribe: (sellerId: number) => apiFetch<void>(`/sellers/${sellerId}/subscribe`, { method: 'POST' }),
  unsubscribe: (sellerId: number) => apiFetch<void>(`/sellers/${sellerId}/subscribe`, { method: 'DELETE' }),
  search: (q: string) => apiFetch<SearchResult>(`/search?q=${encodeURIComponent(q)}`),
  me: () => apiFetch<Me>('/users/me'),
  updateMe: (payload: Partial<Pick<Me, 'display_name' | 'seller_name' | 'seller_description' | 'seller_location'>>) =>
    apiFetch<Me>('/users/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  myProducts: () => apiFetch<Product[]>('/users/me/products'),
  myServices: () => apiFetch<Service[]>('/users/me/services'),
  serviceSchedule: (serviceId: number) => apiFetch<ScheduleSlot[]>(`/services/${serviceId}/schedule`),
  bookSchedule: (scheduleId: number) => apiFetch<void>(`/schedules/${scheduleId}/book`, { method: 'POST' }),
  cancelBooking: (scheduleId: number) => apiFetch<void>(`/schedules/${scheduleId}/book`, { method: 'DELETE' }),
  enrollments: () => apiFetch<Enrollment[]>('/users/me/enrollments'),
  cart: () => apiFetch<CartResponse>('/users/me/cart'),
  addToCart: (productId: number, quantity = 1) =>
    apiFetch<CartResponse>('/users/me/cart', { method: 'POST', body: JSON.stringify({ product_id: productId, quantity }) }),
  updateCart: (productId: number, quantity: number) =>
    apiFetch<CartResponse>(`/users/me/cart/${productId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
  removeFromCart: (productId: number) => apiFetch<CartResponse>(`/users/me/cart/${productId}`, { method: 'DELETE' }),
  createOrder: () => apiFetch<Order>('/users/me/orders', { method: 'POST' }),
  payOrder: (orderId: number) => apiFetch<Order>(`/users/me/orders/${orderId}/pay`, { method: 'POST' }),
  orders: () => apiFetch<Order[]>('/users/me/orders'),
  register: (payload: { email: string; password: string; role: 'seller' | 'buyer' | 'admin' }) =>
    apiFetch<{ access_token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    apiFetch<{ access_token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  createProduct: (payload: {
    title: string
    description: string
    price: number
    stock?: number
    images: string[]
    tags: string[]
  }) => apiFetch<Product>('/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (
    id: number,
    payload: Partial<{ title: string; description: string; price: number; stock: number; images: string[]; tags: string[] }>
  ) => apiFetch<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProduct: (id: number) => apiFetch<{ ok: boolean }>(`/products/${id}`, { method: 'DELETE' }),
  createService: (payload: {
    title: string
    description: string
    price: number
    duration: number
    images: string[]
    tags: string[]
  }) => apiFetch<Service>('/services', { method: 'POST', body: JSON.stringify(payload) }),
  updateService: (
    id: number,
    payload: Partial<{
      title: string
      description: string
      price: number
      duration: number
      images: string[]
      tags: string[]
    }>
  ) => apiFetch<Service>(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteService: (id: number) => apiFetch<{ ok: boolean }>(`/services/${id}`, { method: 'DELETE' }),
  createSchedule: (serviceId: number, payload: { start_time: string; end_time: string; seats: number; location: string }) =>
    apiFetch<ScheduleSlot>(`/services/${serviceId}/schedule`, { method: 'POST', body: JSON.stringify(payload) }),
  updateSchedule: (
    serviceId: number,
    scheduleId: number,
    payload: Partial<{ start_time: string; end_time: string; seats: number; location: string }>
  ) =>
    apiFetch<ScheduleSlot>(`/services/${serviceId}/schedule/${scheduleId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  deleteSchedule: (serviceId: number, scheduleId: number) =>
    apiFetch<void>(`/services/${serviceId}/schedule/${scheduleId}`, { method: 'DELETE' }),
  uploadImage: async (file: File) => {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('Нужна авторизация для загрузки фото')
    const form = new FormData()
    form.append('file', file, file.name)
    const response = await fetch(`${API_BASE_URL}/media/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(parseApiError(text))
    }
    return response.json() as Promise<{ url: string }>
  }
}
