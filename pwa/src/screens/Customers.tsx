import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useShop } from '../state/ShopContext.tsx'

export function Customers() {
  const { customers } = useShop()
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return customers
    return customers.filter(customer =>
      [customer.name, customer.city, customer.phone].join(' ').toLowerCase().includes(needle),
    )
  }, [customers, query])

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Measurements</p>
          <h1>Customers</h1>
        </div>
        <Link className="btn" to="/customers/new">Add customer</Link>
      </div>
      <input className="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, city, or phone" />
      <div className="section">
        {filtered.map(customer => (
          <Link className="row" key={customer.id} to={`/customers/${customer.id}`}>
            <span>
              <b>{customer.name}</b>
              <span className="muted"> {customer.city} · {customer.phone}</span>
            </span>
            <span className="muted">{customer.measurements.length} sets</span>
          </Link>
        ))}
        {filtered.length === 0 ? <p className="muted">No one matches that search.</p> : null}
      </div>
    </>
  )
}
