import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MeasureForm } from '../components/MeasureForm.tsx'
import { draftIsBlank, emptyDraft, parseDraft, type MeasurementDraft } from '../data/shop.ts'
import { useShop } from '../state/ShopContext.tsx'

export function NewCustomer() {
  const navigate = useNavigate()
  const { addCustomer } = useShop()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [draft, setDraft] = useState<MeasurementDraft>(emptyDraft())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (name.trim().length < 2 || phone.replace(/\D/g, '').length < 8 || city.trim().length < 2) {
      setError('Enter a name, phone, and city.')
      return
    }
    let measurement = null
    if (!draftIsBlank(draft)) {
      const parsed = parseDraft(draft)
      if (!parsed.ok) {
        setError(parsed.error)
        return
      }
      measurement = parsed.value
    }
    setSaving(true)
    setError(null)
    try {
      const created = await addCustomer({ name, phone, city, measurement })
      navigate(`/customers/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The customer could not be saved.')
      setSaving(false)
    }
  }

  return (
    <>
      <p className="kicker">New page in the book</p>
      <h1>Add a customer</h1>
      <div className="fields">
        <label className="field"><span>Name</span><input value={name} onChange={event => setName(event.target.value)} /></label>
        <label className="field"><span>Phone</span><input value={phone} onChange={event => setPhone(event.target.value)} /></label>
        <label className="field"><span>City</span><input value={city} onChange={event => setCity(event.target.value)} /></label>
      </div>
      <section className="card">
        <h2>First measurement set</h2>
        <p className="muted">Optional. Leave it blank if you only have a name today.</p>
        <MeasureForm draft={draft} onChange={setDraft} />
      </section>
      {error ? <p className="error">{error}</p> : null}
      <div className="actions section">
        <button className="btn" type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save customer'}</button>
      </div>
    </>
  )
}
