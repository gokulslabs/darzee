import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, type NewCustomerBody } from '../api/client.ts'
import {
  balanceOf,
  type Customer,
  type Measurement,
  type Order,
  type PayMethod,
} from '../data/shop.ts'

type Source = 'api'

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
  const [source] = useState<Source>('api')
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
      setLoadError(null)
    } catch (error) {
      setCustomers([])
      setOrders([])
      setLoadError(error instanceof ApiError ? error.message : 'The server could not be reached. Check your connection and reload.')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addCustomer = async (input: NewCustomerBody) => {
    const created = await api.createCustomer(input)
    setCustomers(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
    return created
  }

  const addMeasurement = async (customerId: string, measurement: Omit<Measurement, 'id' | 'recordedOn'>) => {
    const updated = await api.addMeasurement(customerId, measurement)
    setCustomers(current => current.map(customer => (customer.id === customerId ? updated : customer)))
  }

  const advanceStage = async (orderId: string) => {
    const updated = await api.advance(orderId)
    setOrders(current => current.map(order => (order.id === orderId ? updated : order)))
  }

  const recordPayment = async (orderId: string, input: { amount: number; method: PayMethod; note: string }) => {
    const order = ordersRef.current.find(item => item.id === orderId)
    if (!order) throw new Error('Order not found.')
    if (input.amount > balanceOf(order)) throw new Error('That is more than the balance.')
    const updated = await api.pay(orderId, input)
    setOrders(current => current.map(item => (item.id === orderId ? updated : item)))
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
