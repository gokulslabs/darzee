import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, isOffline, type NewCustomerBody } from '../api/client'
import {
  balanceOf,
  createSeed,
  nextStage,
  todayIso,
  type Customer,
  type Measurement,
  type Order,
  type PayMethod,
} from '../data/shop'

type Source = 'api' | 'local'

type ShopValue = {
  ready: boolean
  source: Source
  loadError: string | null
  customers: Customer[]
  orders: Order[]
  addCustomer: (input: NewCustomerBody) => Promise<Customer>
  addMeasurement: (customerId: string, measurement: Omit<Measurement, 'id' | 'recordedOn'>) => Promise<void>
  advanceStage: (orderId: string) => Promise<void>
  recordPayment: (orderId: string, input: { amount: number; method: PayMethod; note: string }) => Promise<void>
  reload: () => Promise<void>
}

const ShopContext = createContext<ShopValue | null>(null)

export function ShopProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [source, setSource] = useState<Source>('local')
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const sourceRef = useRef(source)
  const ordersRef = useRef(orders)
  sourceRef.current = source
  ordersRef.current = orders

  const refresh = useCallback(async () => {
    try {
      const [nextCustomers, nextOrders] = await Promise.all([api.customers(), api.orders()])
      setCustomers(nextCustomers)
      setOrders(nextOrders)
      setSource('api')
      setLoadError(null)
    } catch (error) {
      if (error instanceof ApiError) {
        setCustomers([])
        setOrders([])
        setSource('api')
        setLoadError(error.message)
      } else {
        const seed = createSeed()
        setCustomers(seed.customers)
        setOrders(seed.orders)
        setSource('local')
        setLoadError(null)
      }
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addCustomer = async (input: NewCustomerBody) => {
    if (sourceRef.current === 'api') {
      try {
        const created = await api.createCustomer(input)
        setCustomers(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
        return created
      } catch (error) {
        if (!isOffline(error)) throw error
        setSource('local')
      }
    }
    const created: Customer = {
      id: `c_${Date.now()}`,
      name: input.name.trim(),
      phone: input.phone.trim(),
      city: input.city.trim(),
      age: null,
      gender: '',
      measurements: input.measurement
        ? [{ ...input.measurement, id: `m_${Date.now()}`, recordedOn: todayIso() }]
        : [],
    }
    setCustomers(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
    return created
  }

  const addMeasurement = async (customerId: string, measurement: Omit<Measurement, 'id' | 'recordedOn'>) => {
    if (sourceRef.current === 'api') {
      try {
        const updated = await api.addMeasurement(customerId, measurement)
        setCustomers(current => current.map(customer => (customer.id === customerId ? updated : customer)))
        return
      } catch (error) {
        if (!isOffline(error)) throw error
        setSource('local')
      }
    }
    setCustomers(current =>
      current.map(customer =>
        customer.id === customerId
          ? {
              ...customer,
              measurements: [
                { ...measurement, id: `m_${Date.now()}`, recordedOn: todayIso() },
                ...customer.measurements,
              ],
            }
          : customer,
      ),
    )
  }

  const advanceStage = async (orderId: string) => {
    if (sourceRef.current === 'api') {
      try {
        const updated = await api.advance(orderId)
        setOrders(current => current.map(order => (order.id === orderId ? updated : order)))
        return
      } catch (error) {
        if (!isOffline(error)) throw error
        setSource('local')
      }
    }
    setOrders(current =>
      current.map(order => {
        if (order.id !== orderId) return order
        const stage = nextStage(order.stage)
        return stage ? { ...order, stage } : order
      }),
    )
  }

  const recordPayment = async (orderId: string, input: { amount: number; method: PayMethod; note: string }) => {
    const order = ordersRef.current.find(item => item.id === orderId)
    if (!order) throw new Error('Order not found.')
    if (input.amount > balanceOf(order)) throw new Error('That is more than the balance.')
    if (sourceRef.current === 'api') {
      try {
        const updated = await api.pay(orderId, input)
        setOrders(current => current.map(item => (item.id === orderId ? updated : item)))
        return
      } catch (error) {
        if (!isOffline(error)) throw error
        setSource('local')
      }
    }
    setOrders(current =>
      current.map(item =>
        item.id === orderId
          ? {
              ...item,
              payments: [
                ...item.payments,
                {
                  id: `p_${Date.now()}`,
                  amount: input.amount,
                  date: todayIso(),
                  method: input.method,
                  note: input.note,
                },
              ],
            }
          : item,
      ),
    )
  }

  return (
    <ShopContext.Provider
      value={{
        ready,
        source,
        loadError,
        customers,
        orders,
        addCustomer,
        addMeasurement,
        advanceStage,
        recordPayment,
        reload: refresh,
      }}
    >
      {children}
    </ShopContext.Provider>
  )
}

export function useShop(): ShopValue {
  const value = useContext(ShopContext)
  if (!value) throw new Error('useShop must be used within ShopProvider')
  return value
}
