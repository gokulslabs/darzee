import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { API_BASE, api } from '../api/client.ts'
import {
  OUTFITS,
  ITEM_STATUSES,
  addDays,
  balanceOf,
  customerName,
  formatDate,
  formatInr,
  formatWhen,
  paidOf,
  pointsFor,
  seedRolls,
  seedStaff,
  todayIso,
  type MeasureKey,
  type ClothRoll,
  type Order,
  type PayMethod,
  type StaffMember,
  type StockMove,
} from '../data/shop.ts'
import { useSession } from '../state/Session.tsx'
import { useShop } from '../state/ShopContext.tsx'

function CodeMark({ value }: { value: string }) {
  const bars = Array.from(value).flatMap(char => [char.charCodeAt(0) % 3 + 1, 1])
  return (
    <div className="code-mark" aria-label={value}>
      <div className="bars">
        {bars.map((width, index) => (
          <i key={`${value}-${index}`} style={{ width }} />
        ))}
      </div>
      <span>{value}</span>
    </div>
  )
}

export function ModuleGrid() {
  const { stitcher } = useSession()
  const cards = [
    ['/customers', 'Customer Management', 'History, measurements, and past orders in one record.'],
    ['/orders', 'Order Management', 'Made-to-order stitching and alteration, plus ready cloth sales.'],
    ['/inventory', 'Inventory Management', 'Cloth rolls, SKU codes, and quantity in or out.'],
    ['/', 'Production Management', 'Item stages from cutting through stitching to delivery.'],
    ['/staff', 'Staff Management', 'Owner, cutter, and stitcher. Assign a job to a person.'],
    ['/ledger', 'Payments & Checkout', 'Deposits, balance, cash, UPI, bank transfer, and card.'],
    ['/shipping', 'Shipping & Fulfillment', 'Delivery date tied to the order.'],
    ['/orders', 'Customer Communication', 'Invoice and a shareable job-sheet text.'],
  ].filter(card => !stitcher || (card[0] !== '/staff' && card[0] !== '/ledger'))
  return (
    <section>
      <p className="kicker">Tailor</p>
      <h1>The stitching floor</h1>
      <p className="lede">Open a module. Production is the work under the needle.</p>
      <div className="module-grid">
        {cards.map(([to, title, copy]) => (
          <Link key={title} to={to} className="module-card">
            <h2>{title}</h2>
            <p>{copy}</p>
            <span>Open</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function Home() {
  return <FloorHome />
}

export function FloorHome() {
  const { customers, orders } = useShop()
  const { mode, setMode } = useSession()
  const book = orders.filter(order => (mode === 'product' ? order.saleMode === 'product' : mode === 'service' ? order.saleMode !== 'product' : true))
  const [period, setPeriod] = useState<'Today' | 'Weekly' | 'All time'>('Today')
  const [focus, setFocus] = useState<'all' | 'delivery' | 'past' | 'trial'>('all')
  const [outfit, setOutfit] = useState('')
  const [query, setQuery] = useState('')
  const today = todayIso()
  const weekEnd = addDays(today, 7)
  const open = book.filter(order => order.itemStatus !== 'Order delivered')
  const dueInWindow = (order: (typeof orders)[number]) => {
    if (period === 'Today') return order.dueDate === today
    if (period === 'Weekly') return order.dueDate >= today && order.dueDate <= weekEnd
    return order.dueDate >= today
  }
  const trialInWindow = (order: (typeof orders)[number]) => {
    if (!order.fittingDate) return false
    if (period === 'Today') return order.fittingDate === today
    if (period === 'Weekly') return order.fittingDate >= today && order.fittingDate <= weekEnd
    return true
  }
  const deliveryCount = open.filter(dueInWindow).length
  const pastCount = open.filter(order => order.dueDate < today).length
  const trialCount = open.filter(trialInWindow).length
  const onBookDay = (date: string) => period === 'All time' || (period === 'Today' ? date === today : date >= today && date <= weekEnd)
  const received = book.filter(order => onBookDay(order.dueDate))
  const ordersReceived = received.length
  const ordersDelivered = received.filter(order => order.itemStatus === 'Order delivered').length
  const pendingAmount = received.filter(order => balanceOf(order) > 0).reduce((sum, order) => sum + balanceOf(order), 0)
  const weekStart = addDays(today, -6)
  const newCustomers = customers.filter(customer => {
    const created = customer.createdAt ?? ''
    if (period === 'All time') return true
    if (!created) return false
    if (period === 'Today') return created === today
    return created >= weekStart && created <= today
  }).length
  const visible = book.filter(order => {
    if (focus === 'delivery' && !(dueInWindow(order) && order.itemStatus !== 'Order delivered')) return false
    if (focus === 'past' && !(order.dueDate < today && order.itemStatus !== 'Order delivered')) return false
    if (focus === 'trial' && !(trialInWindow(order) && order.itemStatus !== 'Order delivered')) return false
    if (focus === 'all' && period === 'Today' && order.dueDate !== today && order.fittingDate !== today) return false
    if (focus === 'all' && period === 'Weekly') {
      const trial = order.fittingDate ?? ''
      const soon = (order.dueDate >= today && order.dueDate <= weekEnd) || (trial >= today && trial <= weekEnd)
      const past = order.dueDate < today && order.itemStatus !== 'Order delivered'
      if (!soon && !past) return false
    }
    if (outfit === 'Kurta pajama' && order.garment !== "Men's kurta pajama") return false
    if (outfit === 'Dress' && order.garment !== 'Dress') return false
    if (outfit === 'Blouse' && order.garment !== 'Blouse' && order.garment !== 'Saree blouse') return false
    if (outfit === "Men's suit" && order.garment !== "Men's suit") return false
    const name = customerName(customers, order.customerId).toLowerCase()
    const needle = query.trim().toLowerCase()
    return !needle || name.includes(needle) || order.orderNo.toLowerCase().includes(needle) || order.garment.toLowerCase().includes(needle)
  })
  const count = (label: string) => open.filter(order => {
    if (label === 'Kurta pajama') return order.garment === "Men's kurta pajama"
    if (label === 'Blouse') return order.garment === 'Blouse' || order.garment === 'Saree blouse'
    return order.garment === label
  }).length

  return (
    <section className="home">
      <div className="hello">
        <span className="workflow">Workflow</span>
        <Link className="blue-btn" to="/orders/new">Create order</Link>
      </div>
      <div className="shop-photo" aria-hidden="true" />
      <div className="quick-icons">
        <Link to="/orders/new" aria-label="New order">+</Link>
        <Link to="/calendar" aria-label="Calendar">Cal</Link>
        <Link to="/customers" aria-label="Customer list">List</Link>
        <Link to="/settings" aria-label="Shop alerts">Bell</Link>
      </div>
      <div className="shop-id">
        <span className="avatar">S</span>
        <div>
          <b>Sridevi</b>
          <span className="lc-mark" aria-label="Ladies Collection">LC</span>
        </div>
      </div>
      <p className="muted">Stitching and ready cloth, under one roof.</p>
      <div className="seg" role="tablist" aria-label="Service or product">
        {([
          ['service', 'Service'],
          ['product', 'Product'],
          ['both', 'Both'],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" className={mode === value ? 'on' : ''} onClick={() => setMode(value)}>{label}</button>
        ))}
      </div>
      <p className="muted">Service is stitching or alteration. Product is a ready cloth sale. Both shows both.</p>
      <div className="seg" role="tablist" aria-label="Time range">
        {(['Today', 'Weekly', 'All time'] as const).map(item => (
          <button key={item} type="button" className={period === item ? 'on' : ''} onClick={() => setPeriod(item)}>{item}</button>
        ))}
      </div>
      <div className="count-row stats">
        <div className="count"><span>Payment pending</span><b>{formatInr(pendingAmount)}</b></div>
        <div className="count"><span>Orders received</span><b>{ordersReceived}</b></div>
        <div className="count"><span>New customers</span><b>{newCustomers}</b></div>
        <div className="count"><span>Orders delivered</span><b>{ordersDelivered}</b></div>
      </div>
      <div className="count-row">
        <button type="button" className={focus === 'delivery' ? 'count on' : 'count'} onClick={() => setFocus(focus === 'delivery' ? 'all' : 'delivery')}>Delivery due<b>{deliveryCount}</b></button>
        <button type="button" className={focus === 'past' ? 'count on' : 'count'} onClick={() => setFocus(focus === 'past' ? 'all' : 'past')}>Past due<b>{pastCount}</b></button>
        <button type="button" className={focus === 'trial' ? 'count on' : 'count'} onClick={() => setFocus(focus === 'trial' ? 'all' : 'trial')}>Trials due<b>{trialCount}</b></button>
      </div>
      <p className="kicker">In production</p>
      <div className="count-row outfits">
        {[
          ['Kurta pajama', count('Kurta pajama')],
          ['Dress', count('Dress')],
          ['Blouse', count('Blouse')],
          ["Men's suit", count("Men's suit")],
        ].map(([label, value]) => (
          <button key={String(label)} type="button" className={outfit === label ? 'amber on' : 'amber'} onClick={() => setOutfit(String(label))}>
            {label}<b>{value}</b>
          </button>
        ))}
      </div>
      <div className="page-head">
        <h2>Items ({visible.length})</h2>
        <Link to="/orders/new">+ Create order</Link>
      </div>
      <input className="search" value={query} placeholder="Search by name or order number" onChange={event => setQuery(event.target.value)} />
      {visible.map(order => (
        <article className="item-card" key={order.id}>
          <Link to={`/orders/${order.id}`}>
            <div className="item-top">
              <b>{customerName(customers, order.customerId)}</b>
              <span className="status">{order.itemStatus === 'Order accepted' ? 'Accepted' : order.itemStatus}</span>
              {order.urgent ? <span className="urgent">Urgent</span> : null}
            </div>
            <p className="muted">Order no: {order.orderNo}</p>
            <p>{order.garment} · {order.workType}</p>
            <p>Trial date {order.fittingDate ? formatDate(order.fittingDate) : '—'}</p>
            <p>Delivery date {formatDate(order.dueDate)}</p>
          </Link>
          <Link to={`/orders/${order.id}/job`}>Job sheet</Link>
        </article>
      ))}
      {visible.length === 0 ? <p className="muted">No items in this view.</p> : null}
    </section>
  )
}

export function ShopCalendar() {
  const { customers, orders } = useShop()
  const today = todayIso()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [picked, setPicked] = useState(today)
  const [year, monthIndex] = month.split('-').map(Number)
  const first = new Date(year || 1970, (monthIndex || 1) - 1, 1)
  const days = new Date(year || 1970, monthIndex || 1, 0).getDate()
  const lead = first.getDay()
  const cells = [...Array(lead).fill(''), ...Array.from({ length: days }, (_, index) => String(index + 1).padStart(2, '0'))]
  const iso = (day: string) => `${month}-${day}`
  const marks = (day: string) => orders.some(order => order.dueDate === iso(day) || order.fittingDate === iso(day) || order.fittingDate2 === iso(day))
  const dayOrders = orders.filter(order => order.dueDate === picked || order.fittingDate === picked || order.fittingDate2 === picked)
  const shift = (delta: number) => {
    const next = new Date(year || 1970, (monthIndex || 1) - 1 + delta, 1)
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <section>
      <h1>Calendar</h1>
      <div className="page-head">
        <button type="button" className="blue-btn quiet" onClick={() => shift(-1)}>Previous</button>
        <b>{first.toLocaleString('en', { month: 'long', year: 'numeric' })}</b>
        <button type="button" className="blue-btn quiet" onClick={() => shift(1)}>Next</button>
      </div>
      <div className="calendar-week">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
      <div className="calendar-grid">
        {cells.map((day, index) => day ? (
          <button key={iso(day)} type="button" className={picked === iso(day) ? 'on' : ''} onClick={() => setPicked(iso(day))}>
            {Number(day)}
            {marks(day) ? <i /> : null}
          </button>
        ) : <span key={`blank-${index}`} />)}
      </div>
      <p className="kicker">{formatDate(picked)}</p>
      {dayOrders.length === 0 ? <p className="muted">Nothing is due or on trial this day.</p> : dayOrders.map(order => (
        <Link className="item-card" key={order.id} to={`/orders/${order.id}`}>
          <b>{customerName(customers, order.customerId)}</b>
          <p>{order.garment} · {order.orderNo}</p>
          {order.dueDate === picked ? <p>Delivery {formatWhen(order.dueDate, order.dueTime)}</p> : null}
          {order.fittingDate === picked ? <p>Trial {formatWhen(order.fittingDate, order.fittingTime)}</p> : null}
          {order.fittingDate2 === picked ? <p>Second trial {formatWhen(order.fittingDate2, order.fittingTime2)}</p> : null}
        </Link>
      ))}
    </section>
  )
}

export function OrderBoard() {
  const { customers, orders } = useShop()
  const { mode } = useSession()
  const [tab, setTab] = useState<'Active' | 'Past due' | 'Upcoming' | 'Delivered'>('Active')
  const [query, setQuery] = useState('')
  const today = todayIso()
  const rows = orders.filter(order => {
    if (mode === 'service' && order.saleMode === 'product') return false
    if (mode === 'product' && order.saleMode !== 'product') return false
    const name = customerName(customers, order.customerId).toLowerCase()
    if (query.trim() && !name.includes(query.trim().toLowerCase())) return false
    if (tab === 'Delivered') return order.itemStatus === 'Order delivered'
    if (tab === 'Past due') return order.dueDate < today && order.itemStatus !== 'Order delivered'
    if (tab === 'Upcoming') return order.dueDate > today && order.itemStatus !== 'Order delivered'
    return order.itemStatus !== 'Order delivered'
  })
  return (
    <section>
      <h1>Orders</h1>
      <div className="seg">
        {(['Active', 'Past due', 'Upcoming', 'Delivered'] as const).map(item => (
          <button key={item} type="button" className={tab === item ? 'on' : ''} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>
      <input className="search" value={query} placeholder="Search customer" onChange={event => setQuery(event.target.value)} />
      <div className="table-head"><span>Customer name</span><span>Delivery date</span><span>Amount</span></div>
      {rows.map(order => (
        <Link className="table-row" key={order.id} to={`/orders/${order.id}`}>
          <span>{customerName(customers, order.customerId)}</span>
          <span>{formatDate(order.dueDate)}</span>
          <span>{formatInr(order.price)}</span>
        </Link>
      ))}
    </section>
  )
}

function readClothPhoto(file: File): Promise<{ id: string; name: string; url: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const scale = Math.min(1, 480 / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        if (!context) {
          resolve({ id: `photo_${Date.now()}`, name: file.name, url: String(reader.result) })
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve({ id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: file.name, url: canvas.toDataURL('image/jpeg', 0.72) })
      }
      image.onerror = () => reject(new Error('The photo could not be read.'))
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

function storedClothPhotos(orderId: string): { name: string; url: string }[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(`tailor-cloth-photos:${orderId}`) ?? '[]') as { name?: string; url?: string }[]
    return Array.isArray(parsed) ? parsed.filter(photo => typeof photo.url === 'string').map(photo => ({ name: photo.name || 'Cloth photo', url: photo.url as string })) : []
  } catch {
    return []
  }
}

function ClothPhotos({ orderId, fallback }: { orderId: string; fallback: string }) {
  const photos = storedClothPhotos(orderId)
  if (photos.length === 0) return <div className="swatches"><span className="cloth-chip">{fallback || 'Cloth not noted'}</span></div>
  return (
    <div className="photo-row">
      {photos.map(photo => <img className="photo-thumb saved" key={photo.url} src={photo.url} alt={photo.name} />)}
    </div>
  )
}

function recordedPoints(garment: string, source: { unit?: string } & Partial<Record<MeasureKey, number>>) {
  const unit = source.unit === 'cm' ? 'cm' : 'inch'
  return pointsFor(garment)
    .filter(([key]) => Number(source[key] ?? 0) > 0)
    .map(([key, label]) => ({ label, value: `${source[key]} ${unit}` }))
}

const PROFILE_MEASUREMENT_FIELDS = [
  ['chest', 'Chest'], ['waist', 'Waist'], ['hip', 'Hip'], ['shoulder', 'Shoulder'],
  ['sleeve', 'Sleeve'], ['neck', 'Neck'], ['inseam', 'Inseam'], ['length', 'Length'],
  ['seat', 'Seat'], ['calf', 'Calf'], ['bottom', 'Bottom'], ['biceps', 'Biceps'],
  ['handRight', 'Right hand'], ['handLeft', 'Left hand'],
] as const

function removeRepeatedMeasurementBlocks(rows: Array<{ label: string; value: string }>) {
  const compacted = [...rows]
  let removedBlock = true
  while (removedBlock) {
    removedBlock = false
    for (let start = 0; start < compacted.length && !removedBlock; start += 1) {
      for (let size = 2; start + size * 2 <= compacted.length; size += 1) {
        const blockRepeats = compacted.slice(start, start + size).every((measurement, index) => {
          const repeated = compacted[start + size + index]
          return measurement.label === repeated.label && measurement.value === repeated.value
        })
        if (blockRepeats) {
          compacted.splice(start + size, size)
          removedBlock = true
          break
        }
      }
    }
  }
  return compacted
}

const emptyPoints = (): Record<MeasureKey, string> => ({
  waist: '', seat: '', hip: '', calf: '', bottom: '', length: '', shoulder: '', chest: '', biceps: '', neck: '', handRight: '', handLeft: '',
})

const PLACES = ['Lucknow Civil Lines', 'Amritsar Hall Bazaar', 'Delhi Khan Market', 'Bengaluru Jayanagar', 'Chennai Mylapore', 'Jaipur C-Scheme', 'Mumbai Bandra', 'Kochi Fort Kochi', 'Hyderabad Banjara Hills', 'Ludhiana Model Town']

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'NA'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

type OrderDraft = {
  customerId: string
  garment: string
  workType: 'Stitching' | 'Alteration' | 'Sale'
  urgent: boolean
  dueDate: string
  dueTime: string
  fittingDate: string
  fittingTime: string
  fittingDate2: string
  fittingTime2: string
  secondTrial: boolean
  photos: { id: string; name: string; url: string }[]
  unit: 'inch' | 'cm'
  points: Record<MeasureKey, string>
  price: string
  advance: string
  sidePocket: string
  pleats: string
  backPockets: string
}

let heldDraft: OrderDraft | null = null

function writeDraft(draft: OrderDraft) {
  heldDraft = draft
  try {
    sessionStorage.setItem('tailor-order-draft', JSON.stringify(draft))
  } catch {
    try {
      sessionStorage.setItem('tailor-order-draft', JSON.stringify({ ...draft, photos: [] }))
    } catch {
      // The review step still has the copy kept in memory.
    }
  }
}

function readDraft(): OrderDraft | null {
  if (heldDraft) return heldDraft
  try {
    const raw = sessionStorage.getItem('tailor-order-draft')
    if (!raw) return null
    heldDraft = JSON.parse(raw) as OrderDraft
    return heldDraft
  } catch {
    return null
  }
}

function stitchLine(draft: Pick<OrderDraft, 'sidePocket' | 'pleats' | 'backPockets'>) {
  return [
    draft.sidePocket.trim() ? `Side pocket: ${draft.sidePocket.trim()}` : '',
    draft.pleats.trim() ? `Pleats: ${draft.pleats.trim()}` : '',
    draft.backPockets.trim() ? `Back pockets: ${draft.backPockets.trim()}` : '',
  ].filter(Boolean).join('. ')
}

function measurementFrom(garment: string, unit: 'inch' | 'cm', points: Record<MeasureKey, string>) {
  const asked = new Set(pointsFor(garment).map(([key]) => key))
  const number = (key: MeasureKey) => (asked.has(key) ? Number(points[key] || 0) : 0)
  const measurement = {
    label: garment,
    note: '',
    unit,
    chest: number('chest'),
    waist: number('waist'),
    hip: number('hip'),
    shoulder: number('shoulder'),
    sleeve: number('handRight'),
    neck: number('neck'),
    inseam: number('calf'),
    length: number('length'),
    seat: number('seat'),
    calf: number('calf'),
    bottom: number('bottom'),
    biceps: number('biceps'),
    handRight: number('handRight'),
    handLeft: number('handLeft'),
  }
  return { measurement, entered: pointsFor(garment).some(([key]) => number(key) > 0) }
}

export function CreateOrder() {
  const { customers } = useShop()
  const { mode } = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [step, setStep] = useState<'outfit' | 'form' | 'measure'>('outfit')
  const [customerId, setCustomerId] = useState(params.get('customer') || customers[0]?.id || '')
  const [garment, setGarment] = useState('')
  const [outfitQuery, setOutfitQuery] = useState('')
  const [workType, setWorkType] = useState<'Stitching' | 'Alteration' | 'Sale'>(mode === 'product' ? 'Sale' : 'Stitching')
  const [urgent, setUrgent] = useState(false)
  const [dueDate, setDueDate] = useState(todayIso())
  const [dueTime, setDueTime] = useState('15:30')
  const [fittingDate, setFittingDate] = useState(todayIso())
  const [fittingTime, setFittingTime] = useState('15:30')
  const [secondTrial, setSecondTrial] = useState(false)
  const [fittingDate2, setFittingDate2] = useState('')
  const [fittingTime2, setFittingTime2] = useState('15:30')
  const [photos, setPhotos] = useState<{ id: string; name: string; url: string }[]>([])
  const [unit, setUnit] = useState<'inch' | 'cm'>('inch')
  const [points, setPoints] = useState(emptyPoints())
  const [price, setPrice] = useState('4500')
  const [advance, setAdvance] = useState('1500')
  const [sidePocket, setSidePocket] = useState('')
  const [pleats, setPleats] = useState('')
  const [backPockets, setBackPockets] = useState('')
  useEffect(() => {
    if (!customerId && customers[0]) setCustomerId(customers[0].id)
  }, [customerId, customers])

  if (step === 'outfit') {
    const shown = OUTFITS.filter(item => item.toLowerCase().includes(outfitQuery.trim().toLowerCase()))
    return (
      <section>
        <h1>Create order</h1>
        <p className="kicker">Select outfit type</p>
        <input className="search" value={outfitQuery} placeholder="Search" onChange={event => setOutfitQuery(event.target.value)} />
        <div className="outfit-grid">
          {shown.map(item => (
            <button key={item} type="button" className={garment === item ? 'outfit-tile on' : 'outfit-tile'} onClick={() => setGarment(item)}>{item}</button>
          ))}
        </div>
        <button className="blue-btn wide" type="button" disabled={!garment} onClick={() => setStep('form')}>Next</button>
      </section>
    )
  }

  function review() {
    writeDraft({
      customerId, garment, workType, urgent, dueDate, dueTime, fittingDate, fittingTime,
      fittingDate2, fittingTime2, secondTrial, photos, unit, points, price, advance,
      sidePocket, pleats, backPockets,
    })
    navigate('/orders/new/confirm')
  }

  return (
    <section>
      <h1>Create order</h1>
      <div className="white-card outfit-chip">
        <span>{garment}</span>
        <button type="button" onClick={() => setStep('outfit')}>Change</button>
      </div>
      <label className="field"><span>Customer</span>
        <select value={customerId} onChange={event => setCustomerId(event.target.value)}>
          {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </label>
      <p className="kicker">Type</p>
      <div className="seg">
        {(['Stitching', 'Alteration', 'Sale'] as const).map(item => (
          <button key={item} type="button" className={workType === item ? 'on' : ''} onClick={() => setWorkType(item)}>{item}</button>
        ))}
      </div>
      <div className="page-head">
        <span>Measurement</span>
        <button className="blue-btn" type="button" onClick={() => setStep('measure')}>+ Add</button>
      </div>
      <label className="switch">Mark as urgent
        <input type="checkbox" checked={urgent} onChange={event => setUrgent(event.target.checked)} />
      </label>
      <p className="kicker">Stitch options</p>
      <label className="field"><span>Side pocket</span><input value={sidePocket} placeholder="Cross, straight, or none" onChange={event => setSidePocket(event.target.value)} /></label>
      <label className="field"><span>Pleats</span><input value={pleats} placeholder="Yes, no, or how many" onChange={event => setPleats(event.target.value)} /></label>
      <label className="field"><span>Back pockets</span><input value={backPockets} placeholder="Count and flap" onChange={event => setBackPockets(event.target.value)} /></label>
      <label className="field"><span>Delivery date</span><input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /></label>
      <label className="field"><span>Delivery time</span><input type="time" value={dueTime} onChange={event => setDueTime(event.target.value)} /></label>
      {workType !== 'Sale' ? (
        <>
          <label className="field"><span>Trial date</span><input type="date" value={fittingDate} onChange={event => setFittingDate(event.target.value)} /></label>
          <label className="field"><span>Trial time</span><input type="time" value={fittingTime} onChange={event => setFittingTime(event.target.value)} /></label>
          {secondTrial ? (
            <>
              <label className="field"><span>Second trial date</span><input type="date" value={fittingDate2} onChange={event => setFittingDate2(event.target.value)} /></label>
              <label className="field"><span>Second trial time</span><input type="time" value={fittingTime2} onChange={event => setFittingTime2(event.target.value)} /></label>
            </>
          ) : (
            <button className="blue-btn quiet" type="button" onClick={() => { setSecondTrial(true); setFittingDate2(current => current || addDays(fittingDate, 2)) }}>+ Add trial date</button>
          )}
        </>
      ) : null}
      <p className="kicker">Cloth images</p>
      <div className="photo-row">
        {photos.map(photo => (
          <div className="photo-thumb" key={photo.id}>
            <img src={photo.url} alt={photo.name} />
            <button type="button" aria-label={`Remove ${photo.name}`} onClick={() => setPhotos(current => current.filter(item => item.id !== photo.id))}>×</button>
          </div>
        ))}
        <label className="photo-add">
          Add photo
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={event => {
              const files = [...(event.target.files ?? [])]
              event.target.value = ''
              void Promise.all(files.map(file => readClothPhoto(file))).then(next => {
                setPhotos(current => [...current, ...next])
              })
            }}
          />
        </label>
      </div>
      <label className="field"><span>Price (INR)</span><input value={price} onChange={event => setPrice(event.target.value)} /></label>
      <label className="field"><span>Advance (INR)</span><input value={advance} onChange={event => setAdvance(event.target.value)} /></label>
      <button className="blue-btn wide" type="button" onClick={review}>Review order</button>
      {step === 'measure' ? (
        <div className="sheet">
          <div className="page-head"><h2>Add measurement</h2><button type="button" onClick={() => setStep('form')}>Close</button></div>
          <div className="seg">
            <button type="button" className={unit === 'inch' ? 'on' : ''} onClick={() => setUnit('inch')}>Inch</button>
            <button type="button" className={unit === 'cm' ? 'on' : ''} onClick={() => setUnit('cm')}>Cm</button>
          </div>
          {pointsFor(garment).map(([key, label], index) => (
            <label className="field" key={key}><span>{index + 1}. {label}</span>
              <input value={points[key]} inputMode="decimal" onChange={event => setPoints({ ...points, [key]: event.target.value })} />
            </label>
          ))}
          <button className="blue-btn wide" type="button" onClick={() => setStep('form')}>Use these measurements</button>
        </div>
      ) : null}
    </section>
  )
}

export function ConfirmOrder() {
  const draft = readDraft()
  const { customers, reload } = useShop()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  if (!draft || !draft.garment) return <p>Choose an outfit before reviewing the order. <Link to="/orders/new">Create order</Link></p>
  const customer = customers.find(item => item.id === draft.customerId)
  const { measurement, entered } = measurementFrom(draft.garment, draft.unit, draft.points)
  const rows = entered ? recordedPoints(draft.garment, measurement) : []
  const stitch = stitchLine(draft)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const order = await api.createOrder({
        customerId: draft!.customerId,
        garment: draft!.garment,
        workType: draft!.workType,
        saleMode: draft!.workType === 'Sale' ? 'product' : 'service',
        urgent: draft!.urgent,
        dueDate: draft!.dueDate,
        dueTime: draft!.dueTime,
        fittingDate: draft!.workType === 'Sale' ? null : draft!.fittingDate,
        fittingTime: draft!.workType === 'Sale' ? '' : draft!.fittingTime,
        fittingDate2: draft!.secondTrial ? draft!.fittingDate2 : null,
        fittingTime2: draft!.secondTrial ? draft!.fittingTime2 : '',
        cloth: draft!.photos.map(photo => photo.name).join(', '),
        price: Number(draft!.price),
        advance: Number(draft!.advance),
        method: 'Cash',
        sidePocket: draft!.sidePocket,
        pleats: draft!.pleats,
        backPockets: draft!.backPockets,
        measurement: entered ? measurement : undefined,
      })
      try {
        sessionStorage.setItem(`tailor-cloth-photos:${order.id}`, JSON.stringify(draft!.photos.map(photo => ({ name: photo.name, url: photo.url }))))
      } catch {
        // The order is saved even when the browser cannot keep the pictures.
      }
      await reload()
      navigate(`/orders/${order.id}/bill`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The order could not be saved.')
      setSaving(false)
    }
  }

  return (
    <section className="white-card">
      <h1>Confirm order</h1>
      <Row label="Outfit" value={draft.garment} />
      <Row label="Customer" value={customer?.name || 'Choose a customer'} />
      <Row label="Type" value={draft.workType} />
      {rows.map(row => <Row key={row.label} label={row.label} value={row.value} />)}
      {rows.length === 0 ? <Row label="Measurements" value="None added" /> : null}
      <Row label="Stitch options" value={stitch || 'None'} />
      <Row label="Delivery" value={formatWhen(draft.dueDate, draft.dueTime)} />
      {draft.workType !== 'Sale' ? <Row label="Trial" value={formatWhen(draft.fittingDate, draft.fittingTime)} /> : null}
      {draft.secondTrial && draft.fittingDate2 ? <Row label="Second trial" value={formatWhen(draft.fittingDate2, draft.fittingTime2)} /> : null}
      <Row label="Price" value={formatInr(Number(draft.price) || 0)} />
      <Row label="Advance" value={formatInr(Number(draft.advance) || 0)} />
      {draft.photos.length > 0 ? (
        <div className="photo-row">{draft.photos.map(photo => <img className="photo-thumb saved" key={photo.id} src={photo.url} alt={photo.name} />)}</div>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <button className="blue-btn wide" type="button" disabled={saving || !customer} onClick={() => void save()}>{saving ? 'Saving…' : 'Save and take payment'}</button>
      <Link className="blue-btn quiet wide" to="/orders/new">Back</Link>
    </section>
  )
}

function billText(order: Order, customerNameValue: string, phone: string) {
  return [
    `Ladies Collection bill ${order.orderNo}`,
    `Sridevi`,
    `${customerNameValue} ${phone}`,
    `${order.garment} · ${order.workType}`,
    `Delivery ${formatWhen(order.dueDate, order.dueTime)}`,
    order.fittingDate ? `Trial ${formatWhen(order.fittingDate, order.fittingTime)}` : '',
    order.fittingDate2 ? `Second trial ${formatWhen(order.fittingDate2, order.fittingTime2)}` : '',
    order.stitchNote ? order.stitchNote : '',
    `Total ${formatInr(order.price)}`,
    `Received ${formatInr(paidOf(order))}`,
    `Balance ${formatInr(balanceOf(order))}`,
  ].filter(Boolean).join('\n')
}

export function OrderBill() {
  const { id } = useParams()
  const { customers, orders, reload } = useShop()
  const order = orders.find(item => item.id === id)
  const customer = customers.find(item => item.id === order?.customerId)
  const [method, setMethod] = useState<PayMethod>('Cash')
  const [amount, setAmount] = useState('')
  const [sent, setSent] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!order || !customer) return <p>This bill is not ready.</p>
  const current = order
  const methods: PayMethod[] = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other']
  const text = billText(current, customer.name, customer.phone)

  async function savePayment() {
    const value = Math.round(Number(amount))
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter the amount received.')
      return
    }
    try {
      await api.pay(current.id, { amount: value, method, note: 'Received with the bill' })
      await reload()
      setAmount('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The payment could not be saved.')
    }
  }

  async function sendBill() {
    setError(null)
    try {
      if (navigator.share) {
        await navigator.share({ title: `Bill ${current.orderNo}`, text })
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
      }
      setSent('The bill is ready to send.')
    } catch {
      setSent(text)
    }
  }

  return (
    <section>
      <article className="white-card bill-sheet" id="bill">
        <div className="page-head">
          <span className="lc-mark" aria-label="Ladies Collection">LC</span>
          <div>
            <p className="kicker">Bill</p>
            <h1>{current.orderNo}</h1>
          </div>
        </div>
        <p>Sridevi · Ladies Collection</p>
        <Row label="Name" value={customer.name} />
        <Row label="Phone" value={customer.phone} />
        <Row label="Outfit" value={current.garment} />
        <Row label="Delivery" value={formatWhen(current.dueDate, current.dueTime)} />
        <Row label="Trial" value={formatWhen(current.fittingDate, current.fittingTime)} />
        {current.fittingDate2 ? <Row label="Second trial" value={formatWhen(current.fittingDate2, current.fittingTime2)} /> : null}
        {current.stitchNote ? <Row label="Stitch options" value={current.stitchNote} /> : null}
        <Row label="Total" value={formatInr(current.price)} />
        <Row label="Received" value={formatInr(paidOf(current))} />
        <Row label="Balance" value={formatInr(balanceOf(current))} />
      </article>
      <div className="no-print">
        <p className="kicker">Receive payment</p>
        <label className="field"><span>Amount (INR)</span><input value={amount} inputMode="numeric" onChange={event => setAmount(event.target.value)} /></label>
        <div className="seg">
          {methods.map(item => (
            <button key={item} type="button" className={method === item ? 'on' : ''} onClick={() => setMethod(item)}>{item}</button>
          ))}
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="blue-btn wide" type="button" onClick={() => void savePayment()}>Receive payment</button>
        <button className="blue-btn wide" type="button" onClick={() => void sendBill()}>Send bill</button>
        <button className="blue-btn wide" type="button" onClick={() => window.print()}>Print bill</button>
        <Link className="blue-btn quiet wide" to={`/orders/${current.id}/status`}>Item status</Link>
        {sent ? <pre className="sheet-text">{sent}</pre> : null}
      </div>
    </section>
  )
}

export function ItemStatusStep() {
  const { id } = useParams()
  const { customers, orders, reload } = useShop()
  const order = orders.find(item => item.id === id)
  const customer = customers.find(item => item.id === order?.customerId)
  const [error, setError] = useState<string | null>(null)
  if (!order || !customer) return <p>This item is not on the floor.</p>
  const measure = order.measure ?? customer.measurements.find(set => set.label === order.garment)
  const rows = measure ? recordedPoints(order.garment, measure) : []

  return (
    <section>
      <h1>Item status</h1>
      <p className="muted">{order.orderNo} · {customer.name}</p>
      <div className="status-split">
        <label className="field"><span>Status</span>
          <select
            value={order.itemStatus}
            onChange={event => {
              setError(null)
              void api.setStatus(order.id, event.target.value).then(() => reload()).catch(err => {
                setError(err instanceof Error ? err.message : 'The status could not be saved.')
              })
            }}
          >
            {ITEM_STATUSES.map(status => <option key={status}>{status}</option>)}
          </select>
        </label>
        <div className="white-card">
          <p className="kicker">Measurements</p>
          <p>{order.garment}</p>
          {rows.length === 0 ? <p className="muted">No measurements on this item.</p> : rows.map(row => <p key={row.label}>{row.label} {row.value}</p>)}
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <Link className="blue-btn wide" to={`/orders/${order.id}`}>Done</Link>
    </section>
  )
}

export function OrderSummary() {
  const { id } = useParams()
  const { customers, orders, reload } = useShop()
  const { owner } = useSession()
  const order = orders.find(item => item.id === id)
  const customer = customers.find(item => item.id === order?.customerId)
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<PayMethod>('Cash')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!order || !customer) return <p>This order is not on the floor.</p>
  const current = order
  const measure = order.measure ?? customer.measurements.find(set => set.label === order.garment)
  const pointRows = measure ? recordedPoints(order.garment, measure) : []
  const methods: PayMethod[] = ['Cash', 'Bank transfer', 'Card swipe', 'UPI', 'Other']

  async function savePayment() {
    try {
      await api.pay(current.id, { amount: Math.round(Number(amount)), method, note: '' })
      await reload()
      setOpen(false)
      setAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The payment could not be saved.')
    }
  }

  return (
    <section className="white-card">
      <h1>Order summary</h1>
      <Row label="Type" value={order.workType} />
      <Row label="Name" value={customer.name} />
      <Row label="Age" value={customer.age ? String(customer.age) : '—'} />
      <Row label="Phone number" value={customer.phone} />
      <Row label="Estimate time" value={formatWhen(order.dueDate, order.dueTime)} />
      <Row label="Trial date" value={formatWhen(order.fittingDate, order.fittingTime)} />
      {order.fittingDate2 ? <Row label="Second trial" value={formatWhen(order.fittingDate2, order.fittingTime2)} /> : null}
      {order.stitchNote ? <Row label="Stitch options" value={order.stitchNote} /> : null}
      {pointRows.map(row => <Row key={row.label} label={row.label} value={row.value} />)}
      <p className="kicker">Cloth</p>
      <ClothPhotos orderId={order.id} fallback={order.cloth} />
      <CodeMark value={order.orderNo} />
      <Row label="Total" value={formatInr(order.price)} />
      <Row label="Advance" value={formatInr(paidOf(order))} />
      <Row label="Balance" value={formatInr(balanceOf(order))} />
      <div className="actions">
        <Link className="blue-btn" to={`/orders/${order.id}/job`}>Job sheet</Link>
        <Link className="blue-btn quiet" to={`/customers/${customer.id}`}>Measurements</Link>
        {owner ? <button className="blue-btn" type="button" onClick={() => setOpen(true)}>Receive payment</button> : null}
      </div>
      {open ? (
        <div className="sheet">
          <div className="page-head"><h2>Receive payment</h2><button type="button" onClick={() => setOpen(false)}>Close</button></div>
          <label className="field"><span>Amount</span><input value={amount} onChange={event => setAmount(event.target.value)} /></label>
          {methods.map(item => (
            <button key={item} type="button" className={method === item ? 'pay on' : 'pay'} onClick={() => setMethod(item)}>{item}</button>
          ))}
          {error ? <p className="error">{error}</p> : null}
          <button className="blue-btn wide" type="button" onClick={() => void savePayment()}>Save payment</button>
        </div>
      ) : null}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="sum-row"><span>{label}</span><b>{value}</b></div>
}

export function JobSheet() {
  const { id } = useParams()
  const { customers, orders, reload } = useShop()
  const { staff } = useStaff()
  const order = orders.find(item => item.id === id)
  const customer = customers.find(item => item.id === order?.customerId)
  const [text, setText] = useState('')
  const [audio, setAudio] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  if (!order || !customer) return <p>This job sheet is missing.</p>
  const current = order
  const measure = order.measure ?? customer.measurements.find(set => set.label === order.garment)
  const sheet = [
    `Tailor job sheet ${current.orderNo}`,
    `Customer ${customer.name} ${customer.phone}`,
    `Delivery ${formatWhen(order.dueDate, order.dueTime)}`,
    `Trial ${formatWhen(order.fittingDate, order.fittingTime)}`,
    order.fittingDate2 ? `Second trial ${formatWhen(order.fittingDate2, order.fittingTime2)}` : '',
    `Type ${order.workType}`,
    `Item ${order.garment}`,
    `Status ${order.itemStatus}`,
    measure ? recordedPoints(order.garment, measure).map(row => `${row.label} ${row.value}`).join(' · ') : '',
    order.stitchNote,
    `Assigned ${order.assignee || 'Unassigned'}`,
    `Code ${order.orderNo}`,
  ].filter(Boolean).join('\n')

  return (
    <article className="white-card job-sheet">
      <div className="page-head">
        <h1>Job sheet</h1>
        <button
          type="button"
          className="blue-btn"
          onClick={() => {
            setPdfError(null)
            void fetch(`${API_BASE}/orders/${current.id}/job.pdf`)
              .then(async response => {
                if (!response.ok) throw new Error('The job sheet could not be downloaded.')
                const blob = await response.blob()
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `${current.orderNo}-job-sheet.pdf`
                document.body.appendChild(link)
                link.click()
                link.remove()
                URL.revokeObjectURL(url)
              })
              .catch(err => setPdfError(err instanceof Error ? err.message : 'The job sheet could not be downloaded.'))
          }}
        >
          Download PDF
        </button>
      </div>
      {pdfError ? <p className="error">{pdfError}</p> : null}
      <Row label="Order number" value={current.orderNo} />
      <Row label="Delivery" value={formatWhen(order.dueDate, order.dueTime)} />
      <Row label="Trial" value={formatWhen(order.fittingDate, order.fittingTime)} />
      {order.fittingDate2 ? <Row label="Second trial" value={formatWhen(order.fittingDate2, order.fittingTime2)} /> : null}
      <Row label="Type" value={order.workType} />
      <label className="field"><span>Item status</span>
        <select value={order.itemStatus} onChange={event => void api.setStatus(order.id, event.target.value).then(() => reload())}>
          {ITEM_STATUSES.map(status => <option key={status}>{status}</option>)}
        </select>
      </label>
      <label className="field"><span>Assign</span>
        <select value={order.assignee} onChange={event => void api.assign(order.id, event.target.value).then(() => reload())}>
          <option value="">Unassigned</option>
          {staff.map(person => <option key={person.id}>{person.name}</option>)}
        </select>
      </label>
      {measure ? (
        <div>
          <p>{order.garment}</p>
          {recordedPoints(order.garment, measure).map(row => <p key={row.label}>{row.label} {row.value}</p>)}
        </div>
      ) : null}
      <p>{order.stitchNote || 'No stitch options on this item.'}</p>
      <button type="button" className="blue-btn quiet" onClick={() => setAudio(true)}>Play instruction</button>
      {audio ? <p className="muted">Spoken note: keep the hem as marked and call before the trial.</p> : null}
      <CodeMark value={order.orderNo} />
      <div className="actions">
        <button type="button" className="blue-btn quiet" onClick={() => setText(sheet)}>WhatsApp text</button>
      </div>
      {text ? <pre className="sheet-text">{text}</pre> : null}
    </article>
  )
}

function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>(seedStaff())
  useEffect(() => {
    void api.staff().then(setStaff).catch(() => setStaff(seedStaff()))
  }, [])
  return { staff }
}

function useRolls() {
  const [rolls, setRolls] = useState<ClothRoll[]>(seedRolls())
  const [moves, setMoves] = useState<StockMove[]>([])
  async function load() {
    try {
      const data = await api.inventory()
      setRolls(data.rolls)
      setMoves(data.moves)
    } catch {
      setRolls(seedRolls())
    }
  }
  useEffect(() => { void load() }, [])
  return { rolls, moves, load }
}

export function People() {
  const { customers, orders } = useShop()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 30
  const rows = customers.filter(customer =>
    customer.name.toLowerCase().includes(query.trim().toLowerCase()) || customer.phone.includes(query.trim()),
  )
  const pageCount = Math.ceil(rows.length / pageSize)
  const visibleRows = rows.slice(page * pageSize, (page + 1) * pageSize)
  return (
    <section>
      <div className="page-head"><h1>Customers</h1><Link className="blue-btn" to="/customers/new">Add customer</Link></div>
      <input className="search" value={query} placeholder="Search" onChange={event => { setQuery(event.target.value); setPage(0) }} />
      <div className="page-head">
        <span className="muted">{rows.length ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, rows.length)} of ${rows.length} customers` : '0 customers'}</span>
        <div className="actions">
          <button className="blue-btn quiet" type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</button>
          <button className="blue-btn quiet" type="button" disabled={page + 1 >= pageCount} onClick={() => setPage(value => value + 1)}>Next</button>
        </div>
      </div>
      {visibleRows.map(customer => (
        <Link className="item-card" key={customer.id} to={`/customers/${customer.id}`}>
          <b>{customer.name}</b>
          <p>{customer.phone} · {customer.city}</p>
          <p className="muted">{orders.filter(order => order.customerId === customer.id).length} orders</p>
        </Link>
      ))}
      {rows.length === 0 ? <p className="muted">No customers match that search.</p> : null}
    </section>
  )
}

export function Person() {
  const { id } = useParams()
  const { customers, orders } = useShop()
  const [selectedGarment, setSelectedGarment] = useState('')
  const customer = customers.find(item => item.id === id)
  if (!customer) return <p>This customer is not in the book.</p>
  const own = orders.filter(order => order.customerId === customer.id)
  const pending = own.reduce((sum, order) => sum + Math.max(0, balanceOf(order)), 0)
  const revenue = own.reduce((sum, order) => sum + paidOf(order), 0)
  const customMeasurementSets = customer.customMeasurementSets ?? []
  const numericMeasurements = customer.measurements
  const garmentNames = [
    ...customMeasurementSets.map(set => set.garment),
    ...numericMeasurements.map(set => set.label),
  ].map(name => name.trim()).filter(Boolean)
  const garmentOptions = [...new Map(garmentNames.map(name => [name.toLowerCase(), name])).values()]
  const activeGarment = garmentOptions.find(name => name.toLowerCase() === selectedGarment.toLowerCase()) ?? garmentOptions[0] ?? ''
  const seenCustomSetSignatures = new Set<string>()
  const customSets = customMeasurementSets
    .filter(set => set.garment.trim().toLowerCase() === activeGarment.toLowerCase())
    .map(set => set.id.includes('_pdf_') ? set : ({ ...set, measurements: removeRepeatedMeasurementBlocks(set.measurements) }))
    .filter(set => {
      if (set.id.includes('_pdf_')) return true
      const signature = JSON.stringify([
        set.garment.trim().toLowerCase(),
        set.measurements.map(measurement => [measurement.label.trim().toLowerCase(), measurement.value.trim()]),
      ])
      if (seenCustomSetSignatures.has(signature)) return false
      seenCustomSetSignatures.add(signature)
      return true
    })
  const numericSets = numericMeasurements.filter(set => set.label.trim().toLowerCase() === activeGarment.toLowerCase())
  return (
    <section>
      <div className="page-head">
        <h1>{customer.name}</h1>
        <Link className="blue-btn" to="/orders/new">Create order</Link>
      </div>
      <p>{customer.phone} · {customer.city}{customer.bookNo ? ` · ${/^book\b/i.test(customer.bookNo) ? customer.bookNo : `Book ${customer.bookNo}`}` : ''}{customer.age ? ` · ${customer.age}` : ''}</p>
      <div className="count-row">
        <div className="count">Pending<br />{formatInr(pending)}</div>
        <div className="count">Revenue<br />{formatInr(revenue)}</div>
        <div className="count">Orders<br />{own.length}</div>
      </div>
      <h2>Measurements</h2>
      {garmentOptions.length > 0 ? (
        <>
          <label className="field"><span>Choose garment</span>
            <select aria-label="Choose garment" value={activeGarment} onChange={event => setSelectedGarment(event.target.value)}>
              {garmentOptions.map(garment => <option key={garment} value={garment}>{garment}</option>)}
            </select>
          </label>
          {numericSets.map(set => {
            const unit = set.unit === 'cm' ? 'cm' : 'inch'
            const values = PROFILE_MEASUREMENT_FIELDS
              .map(([key, label]) => ({ label, value: set[key] }))
              .filter(row => Number(row.value) > 0)
            return <div className="white-card" key={set.id}>
              <b>{set.label}</b>
              {values.length > 0
                ? <div className="measurement-points">{values.map(row => <p key={row.label}>{row.label} · {row.value} {unit}</p>)}</div>
                : <p className="muted">No measurements saved.</p>}
            </div>
          })}
          {customSets.map(set => (
            <div className="white-card" key={set.id}>
              <b>{set.garment}{set.id.includes('_pdf_') ? ` · Order ${set.id.split('_pdf_')[1]}` : ''}</b>
              <div className="measurement-points">{set.measurements.map((measurement, index) => (
                <p key={`${measurement.label}-${index}`}>{measurement.label} · {measurement.value}</p>
              ))}</div>
            </div>
          ))}
        </>
      ) : (
        <p className="muted">No measurements saved for this customer.</p>
      )}
    </section>
  )
}

export function AddPerson() {
  const { reload } = useShop()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female'>('Female')
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [error, setError] = useState<string | null>(null)
  const matches = PLACES.filter(place => address.trim() && place.toLowerCase().includes(address.trim().toLowerCase()) && place.toLowerCase() !== address.trim().toLowerCase())
  async function save() {
    try {
      const created = await api.createCustomer({
        name,
        phone: `+91 ${phone.replace(/\D/g, '')}`,
        city: address.trim() || 'Lucknow',
        gender,
        email,
        birthDate,
        landmark,
      })
      await reload()
      navigate(`/orders/new?customer=${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The customer could not be saved.')
    }
  }
  return (
    <section className="add-customer">
      <h1>Add new customer</h1>
      <div className="initials" aria-hidden="true">{initials(name)}</div>
      <label className="field"><span>Full name</span><input value={name} placeholder="Full name" onChange={event => setName(event.target.value)} /></label>
      <p className="kicker">Gender</p>
      <div className="seg">
        {(['Male', 'Female'] as const).map(item => (
          <button key={item} type="button" className={gender === item ? 'on' : ''} onClick={() => setGender(item)}>{item}</button>
        ))}
      </div>
      <label className="field"><span>Phone number</span>
        <span className="phone-row"><b>+91</b><input value={phone} inputMode="tel" placeholder="Enter phone number" onChange={event => setPhone(event.target.value)} /></span>
      </label>
      <label className="field"><span>Email</span><input value={email} placeholder="Enter your email" onChange={event => setEmail(event.target.value)} /></label>
      <label className="field"><span>Date of birth</span><input type="date" value={birthDate} onChange={event => setBirthDate(event.target.value)} /></label>
      <label className="field"><span>Address</span><input value={address} placeholder="Search address" onChange={event => setAddress(event.target.value)} /></label>
      {matches.slice(0, 4).map(place => (
        <button key={place} type="button" className="profile-row" onClick={() => setAddress(place)}>{place}</button>
      ))}
      <label className="field"><span>House number / landmark (optional)</span><input value={landmark} placeholder="House number or landmark" onChange={event => setLandmark(event.target.value)} /></label>
      {error ? <p className="error">{error}</p> : null}
      <button className="blue-btn wide" type="button" onClick={() => void save()}>Save & continue</button>
    </section>
  )
}

export function InventoryPage() {
  const { rolls, moves, load } = useRolls()
  const [qty, setQty] = useState('1')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  async function move(id: string, direction: 'in' | 'out') {
    await api.moveStock(id, { direction, qty: Number(qty), note: code })
    await load()
  }
  return (
    <section>
      <h1>Cloth stock</h1>
      <p className="lede">Rolls with quantity in and out. Each SKU has a code you can scan or type.</p>
      <ScanBox onCode={value => { setCode(value); setMessage(`Read ${value}`) }} />
      {message ? <p>{message}</p> : null}
      <label className="field"><span>Metres</span><input value={qty} onChange={event => setQty(event.target.value)} /></label>
      {rolls.map(roll => (
        <article className="white-card" key={roll.id}>
          <b>{roll.name}</b>
          <p>{roll.qty} {roll.unit} · {roll.sku}</p>
          <CodeMark value={roll.sku} />
          <div className="actions">
            <button className="blue-btn" type="button" onClick={() => void move(roll.id, 'in')}>In</button>
            <button className="blue-btn quiet" type="button" onClick={() => void move(roll.id, 'out')}>Out</button>
          </div>
        </article>
      ))}
      <h2>Recent moves</h2>
      {moves.map(moveRow => <p key={moveRow.id}>{moveRow.movedOn} · {moveRow.sku} · {moveRow.direction} {moveRow.qty}</p>)}
    </section>
  )
}

function ScanBox({ onCode }: { onCode: (code: string) => void }) {
  const [manual, setManual] = useState('')
  const [note, setNote] = useState('Type a code, or use the camera if this browser allows it.')
  async function camera() {
    const detector = (window as Window & { BarcodeDetector?: new () => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector
    if (!detector || !navigator.mediaDevices?.getUserMedia) {
      setNote('This browser has no barcode camera. Type the code instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      const hits = await new detector().detect(video)
      stream.getTracks().forEach(track => track.stop())
      if (hits[0]?.rawValue) onCode(hits[0].rawValue)
      else setNote('No code in frame. Type it instead.')
    } catch {
      setNote('Camera permission was blocked. Type the code instead.')
    }
  }
  return (
    <div className="white-card">
      <p>{note}</p>
      <input className="search" value={manual} placeholder="Type barcode" onChange={event => setManual(event.target.value)} />
      <div className="actions">
        <button className="blue-btn" type="button" onClick={() => manual && onCode(manual)}>Use code</button>
        <button className="blue-btn quiet" type="button" onClick={() => void camera()}>Camera</button>
      </div>
    </div>
  )
}

export function StaffPage() {
  const { owner, role, setRole } = useSession()
  const { staff } = useStaff()
  const { orders, reload } = useShop()
  if (!owner) return <p>Staff pages are for the owner.</p>
  return (
    <section>
      <h1>Staff</h1>
      <p>Active role</p>
      <div className="seg">
        {(['owner', 'cutter', 'stitcher'] as const).map(item => (
          <button key={item} type="button" className={role === item ? 'on' : ''} onClick={() => setRole(item)}>{item}</button>
        ))}
      </div>
      {staff.map(person => (
        <article className="white-card" key={person.id}>
          <b>{person.name}</b>
          <p>{person.role}</p>
        </article>
      ))}
      <h2>Assign a job</h2>
      {orders.slice(0, 6).map(order => (
        <label className="field" key={order.id}><span>{order.orderNo} · {order.garment}</span>
          <select value={order.assignee} onChange={event => void api.assign(order.id, event.target.value).then(() => reload())}>
            <option value="">Unassigned</option>
            {staff.map(person => <option key={person.id}>{person.name}</option>)}
          </select>
        </label>
      ))}
    </section>
  )
}

export function ShippingPage() {
  const { orders, customers } = useShop()
  return (
    <section>
      <h1>Delivery</h1>
      {orders.map(order => (
        <Link className="item-card" key={order.id} to={`/orders/${order.id}`}>
          <b>{customerName(customers, order.customerId)} · {order.garment}</b>
          <p>Delivery {formatDate(order.dueDate)} · {order.itemStatus}</p>
        </Link>
      ))}
    </section>
  )
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(ym: string) {
  const [year, month] = ym.split('-').map(Number)
  return `${MONTH_NAMES[(month || 1) - 1]} ${year}`
}

function shiftMonth(ym: string, delta: number) {
  const [year, month] = ym.split('-').map(Number)
  const date = new Date(year || 1970, (month || 1) - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function weekOf(iso: string) {
  return Math.min(5, Math.ceil(Number(iso.slice(8, 10)) / 7))
}

function closedOrder(order: Order) {
  return order.itemStatus === 'Order completed' || order.itemStatus === 'Order delivered'
}

export function AnalyticsPage() {
  const { orders } = useShop()
  const [month, setMonth] = useState(todayIso().slice(0, 7))
  const due = orders.filter(order => order.dueDate.startsWith(month))
  const received = orders.reduce((sum, order) => sum + order.payments.filter(payment => payment.date.startsWith(month)).reduce((paid, payment) => paid + payment.amount, 0), 0)
  const sales = due.reduce((sum, order) => sum + order.price, 0)
  const weeks = [1, 2, 3, 4, 5].map(week => due.filter(order => weekOf(order.dueDate) === week).reduce((sum, order) => sum + order.price, 0))
  const peak = Math.max(0, ...weeks)
  const scale = peak || 1
  const stitching = due.filter(order => order.workType === 'Stitching').reduce((sum, order) => sum + order.price, 0)
  const alteration = due.filter(order => order.workType === 'Alteration').reduce((sum, order) => sum + order.price, 0)
  const split = stitching + alteration
  const stitchShare = split === 0 ? 0 : stitching / split
  const ticks = peak === 0 ? [0] : [peak, Math.round(peak / 2), 0]
  return (
    <section className="dash">
      <h1>Dashboard</h1>
      <div className="white-card dash-card">
        <div className="dash-month">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(current => shiftMonth(current, -1))}>‹</button>
          <span>Reporting {monthLabel(month)}</span>
          <input type="month" aria-label="Reporting month" value={month} onChange={event => setMonth(event.target.value || month)} />
          <button type="button" aria-label="Next month" onClick={() => setMonth(current => shiftMonth(current, 1))}>›</button>
        </div>
        <div className="dash-grid">
          <div><span>Amount received</span><b className="money in">{formatInr(received)}</b></div>
          <div><span>Sales</span><b className="money out">{formatInr(sales)}</b></div>
          <div><span>Orders received</span><b>{due.length}</b></div>
          <div><span>Orders closed</span><b>{due.filter(closedOrder).length}</b></div>
        </div>
      </div>
      <div className="white-card dash-card">
        <div className="dash-head"><span>Reporting sales</span><b>{formatInr(sales)}</b></div>
        <div className="bar-chart">
          <div className="bar-axis">{ticks.map(tick => <span key={tick}>{tick === 0 ? '0' : formatInr(tick)}</span>)}</div>
          <div className="bar-plot">
            {weeks.map((value, index) => (
              <div className="bar-col" key={index}>
                <div className="bar" style={{ height: `${Math.round((value / scale) * 100)}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="bar-labels">
          <span />
          <div>{weeks.map((_, index) => <span key={index}>Week {index + 1}</span>)}</div>
        </div>
      </div>
      <div className="white-card dash-card">
        <p className="dash-title">Sales split</p>
        <div className="split-legend">
          <span><i className="swatch stitch" /> Stitching</span>
          <span><i className="swatch alter" /> Alteration</span>
        </div>
        <div
          className="donut"
          style={{ background: `conic-gradient(#b9a6f2 0 ${stitchShare * 100}%, #f2c14e ${stitchShare * 100}% 100%)` }}
        >
          <span>{(stitchShare * 100).toFixed(1)}%</span>
        </div>
      </div>
    </section>
  )
}

export function PortfolioPage() {
  const { orders } = useShop()
  const outfits = [...new Set(orders.map(order => order.garment))]
  return (
    <section>
      <h1>Portfolio</h1>
      <p className="lede">Outfits currently on the book. Share the job sheet when a customer asks for the details.</p>
      <div className="outfit-grid">
        {outfits.map(outfit => <div className="outfit" key={outfit}>{outfit}</div>)}
      </div>
    </section>
  )
}
