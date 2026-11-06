import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MeasureForm } from '../components/MeasureForm.tsx'
import { draftIsBlank, emptyDraft, formatDate, parseDraft, type MeasurementDraft } from '../data/shop.ts'
import { useShop } from '../state/ShopContext.tsx'

export function CustomerDetail() {
  const { id } = useParams()
  const { customers, orders, addMeasurement } = useShop()
  const customer = customers.find(item => item.id === id)
  const [draft, setDraft] = useState<MeasurementDraft>(emptyDraft())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  if (!customer) return <p>This customer is not in the book.</p>
  const person = customer
  const ownOrders = orders.filter(order => order.customerId === person.id)

  async function save() {
    const parsed = parseDraft(draft)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await addMeasurement(person.id, parsed.value)
      setDraft(emptyDraft())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The measurement could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <p className="kicker">{customer.city}</p>
      <div className="page-head">
        <div>
          <h1>{customer.name}</h1>
          <p className="lede">{customer.phone}</p>
        </div>
      </div>
      {customer.measurements.map(set => (
        <article className="card section" key={set.id}>
          <p className="kicker">{formatDate(set.recordedOn)}</p>
          <h2>{set.label}</h2>
          <p className="muted">
            Chest {set.chest} · Waist {set.waist} · Hip {set.hip} · Shoulder {set.shoulder} · Sleeve {set.sleeve} · Neck {set.neck} · Inseam {set.inseam} · Length {set.length} in
          </p>
          {set.note ? <p>{set.note}</p> : null}
        </article>
      ))}
      <section className="section">
        <h2>Orders</h2>
        {ownOrders.map(order => (
          <Link className="row" key={order.id} to={`/orders/${order.id}`}>
            <span><b>{order.garment}</b> <span className="muted">{order.orderNo}</span></span>
            <span className="pill">{order.stage}</span>
          </Link>
        ))}
        {ownOrders.length === 0 ? <p className="muted">No orders yet.</p> : null}
      </section>
      <section className="card section">
        <h2>New measurement set</h2>
        <MeasureForm draft={draft} onChange={setDraft} />
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="button" disabled={saving || draftIsBlank(draft)} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save measurements'}
        </button>
      </section>
    </>
  )
}
