import type { ClothRoll, Customer, Measurement, OrderView, PayMethod, StaffMember, StockMove } from '../data/shop.ts'

export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '')

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function isOffline(error: unknown): boolean {
  return !(error instanceof ApiError)
}

function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The floor book did not answer.')), ms)
    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      error => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error('The floor book did not answer.'))
      },
    )
  })
}

async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await withTimeout(
    fetch(`${API_BASE}${path}`, {
      method: init?.method ?? 'GET',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    }),
  )
  const payload = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) throw new ApiError(response.status, payload.error || `Request failed (${response.status})`)
  return payload as T
}

export type NewCustomerBody = {
  name: string
  phone: string
  city: string
  age?: number | null
  gender?: string
  email?: string
  birthDate?: string
  landmark?: string
  measurement?: Omit<Measurement, 'id' | 'recordedOn'> | null
}

export const api = {
  customers: () => request<Customer[]>('/customers'),
  orders: () => request<OrderView[]>('/orders'),
  staff: () => request<StaffMember[]>('/staff'),
  inventory: () => request<{ rolls: ClothRoll[]; moves: StockMove[] }>('/inventory'),
  createCustomer: (body: NewCustomerBody) => request<Customer>('/customers', { method: 'POST', body }),
  addMeasurement: (id: string, body: Omit<Measurement, 'id' | 'recordedOn'>) =>
    request<Customer>(`/customers/${id}/measurements`, { method: 'POST', body }),
  advance: (id: string) => request<OrderView>(`/orders/${id}/advance`, { method: 'POST', body: {} }),
  pay: (id: string, body: { amount: number; method: PayMethod; note: string }) =>
    request<OrderView>(`/orders/${id}/payments`, { method: 'POST', body }),
  createOrder: (body: Record<string, unknown>) => request<OrderView>('/orders', { method: 'POST', body }),
  setStatus: (id: string, status: string) => request<OrderView>(`/orders/${id}/status`, { method: 'POST', body: { status } }),
  assign: (id: string, assignee: string) => request<OrderView>(`/orders/${id}/assign`, { method: 'POST', body: { assignee } }),
  moveStock: (id: string, body: { direction: 'in' | 'out'; qty: number; note: string }) =>
    request<ClothRoll>(`/inventory/${id}/move`, { method: 'POST', body }),
}
