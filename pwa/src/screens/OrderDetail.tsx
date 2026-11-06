import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { balanceOf, customerName, formatDate, formatInr, nextStage, paidOf } from '../data/shop.ts'
import { useShop } from '../state/ShopContext.tsx'

export function OrderDetail() {
  const { id } = useParams()
  const { customers, orders, advanceStage } = useShop()
  const order = orders.find(item => item.id === id)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  if (!order) return <p>This order is not in the book.</p>
  const current = order
  const upcoming = nextStage(current.stage)

  async function advance() {
    setSaving(true)
    setError(null)
    try {
      await advanceStage(current.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The stage could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <p className="kicker">{current.orderNo}</p>
      <div className="page-head">
        <div>
          <h1>{current.garment}</h1>
          <p className="lede">
            {customerName(customers, current.customerId)} · due {formatDate(current.dueDate)}
            {current.fittingDate ? ` · fitting ${formatDate(current.fittingDate)}` : ''}
          </p>
        </div>
        <span className="pill brass">{current.stage}</span>
      </div>
      <section className="stats">
        <article className="stat"><span>Price</span><strong>{formatInr(current.price)}</strong></article>
        <article className="stat"><span>Paid</span><strong>{formatInr(paidOf(current))}</strong></article>
        <article className="stat"><span>Balance</span><strong>{formatInr(balanceOf(current))}</strong></article>
      </section>
      {current.notes ? <p>{current.notes}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="actions section">
        <button className="btn" type="button" disabled={!upcoming || saving} onClick={() => void advance()}>
          {upcoming ? `Move to ${upcoming}` : 'Ready for collection'}
        </button>
        <Link className="btn quiet" to={`/orders/${current.id}/invoice`}>Open invoice</Link>
      </div>
    </>
  )
}
