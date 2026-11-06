import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { atelier, balanceOf, customerName, formatDate, formatInr, paidOf, type PayMethod } from '../data/shop.ts'
import { useShop } from '../state/ShopContext.tsx'

const methods: PayMethod[] = ['UPI', 'Cash', 'Card']

export function Invoice() {
  const { id } = useParams()
  const { customers, orders, recordPayment } = useShop()
  const order = orders.find(item => item.id === id)
  const customer = customers.find(item => item.id === order?.customerId)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PayMethod>('UPI')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  if (!order) return <p>This invoice is not in the book.</p>
  const bill = order
  const balance = balanceOf(bill)

  async function save() {
    const value = Math.round(Number(amount))
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await recordPayment(bill.id, { amount: value, method, note })
      setAmount('')
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The payment could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="invoice">
      <div className="invoice-top">
        <div>
          <p className="brand-mark">Tailor</p>
          <p className="muted">{atelier.street}<br />{atelier.city}<br />{atelier.phone}</p>
        </div>
        <div>
          <p className="kicker">Invoice</p>
          <h1>{bill.orderNo}</h1>
        </div>
      </div>
      <p className="section">
        <b>{customerName(customers, bill.customerId)}</b>
        {customer ? <span className="muted"> · {customer.city} · {customer.phone}</span> : null}
      </p>
      <div className="line section"><span>{bill.garment}</span><span className="money">{formatInr(bill.price)}</span></div>
      {bill.payments.map(payment => (
        <div className="line" key={payment.id}>
          <span>{formatDate(payment.date)} · {payment.method}{payment.note ? ` · ${payment.note}` : ''}</span>
          <span className="money">{formatInr(payment.amount)}</span>
        </div>
      ))}
      <p className="muted section">Received {formatInr(paidOf(order))}</p>
      <p className="balance">{formatInr(balance)}</p>
      <p className="kicker">Balance due</p>
      {balance > 0 ? (
        <div className="fields section">
          <label className="field"><span>Amount (INR)</span><input inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} /></label>
          <label className="field">
            <span>Method</span>
            <select value={method} onChange={event => setMethod(event.target.value as PayMethod)}>
              {methods.map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="field"><span>Note</span><input value={note} onChange={event => setNote(event.target.value)} /></label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Recording…' : 'Record payment'}</button>
        </div>
      ) : (
        <p className="section">Settled.</p>
      )}
    </article>
  )
}
