import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useShop } from '../state/ShopContext.tsx'

export function Customers() {
  const { customers } = useShop()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 30
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return customers
    return customers.filter(customer =>
      [customer.name, customer.city, customer.phone].join(' ').toLowerCase().includes(needle),
    )
  }, [customers, query])
  const pageCount = Math.ceil(filtered.length / pageSize)
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Measurements</p>
          <h1>Customers</h1>
        </div>
        <Link className="btn" to="/customers/new">Add customer</Link>
      </div>
      <input className="search" value={query} onChange={event => { setQuery(event.target.value); setPage(0) }} placeholder="Search name, city, or phone" />
      <div className="customer-pagebar">
        <span className="muted">{filtered.length ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length}` : '0 customers'}</span>
        <div className="actions">
          <button className="btn quiet" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</button>
          <button className="btn quiet" disabled={page + 1 >= pageCount} onClick={() => setPage(value => value + 1)}>Next</button>
        </div>
      </div>
      <div className="section">
        {visible.map(customer => (
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
