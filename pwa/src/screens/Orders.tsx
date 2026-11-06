import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { balanceOf, customerName, formatDate, formatInr, STAGES, type Stage } from '../data/shop.ts'
import { useShop } from '../state/ShopContext.tsx'

export function Orders() {
  const { customers, orders } = useShop()
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<Stage | 'All'>('All')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return orders.filter(order => {
      const name = customerName(customers, order.customerId).toLowerCase()
      const matches = !needle || [order.orderNo, order.garment, name].join(' ').toLowerCase().includes(needle)
      return matches && (stage === 'All' || order.stage === stage)
    })
  }, [customers, orders, query, stage])

  return (
    <>
      <p className="kicker">Work in hand</p>
      <h1>Orders</h1>
      <div className="fields">
        <input className="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search order, garment, or customer" />
        <div className="chips">
          {(['All', ...STAGES] as const).map(item => (
            <button key={item} type="button" className={item === stage ? 'chip on' : 'chip'} onClick={() => setStage(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      {filtered.map(order => (
        <Link className="row" key={order.id} to={`/orders/${order.id}`}>
          <span>
            <b>{order.garment}</b>
            <span className="muted"> {customerName(customers, order.customerId)} · due {formatDate(order.dueDate)}</span>
          </span>
          <span className="money">{formatInr(balanceOf(order))}<br /><span className="pill">{order.stage}</span></span>
        </Link>
      ))}
      {filtered.length === 0 ? <p className="muted">No orders in this cut of the book.</p> : null}
    </>
  )
}
