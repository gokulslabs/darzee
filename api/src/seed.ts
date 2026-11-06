export const STAGES = ['Cutting', 'Stitching', 'Finishing', 'Trial', 'Ready'] as const

export type Stage = (typeof STAGES)[number]
export type PayMethod = 'Cash' | 'UPI' | 'Card' | 'Bank transfer' | 'Card swipe' | 'Other'
export type WorkType = 'Stitching' | 'Alteration' | 'Sale'
export type SaleMode = 'service' | 'product' | 'both'
export type ItemStatus =
  | 'Order accepted'
  | 'Under cutting'
  | 'Under stitching'
  | 'Under finishing'
  | 'Order completed'
  | 'Order delivered'
export type StaffRole = 'owner' | 'cutter' | 'stitcher'

export type Measurement = {
  id: string
  label: string
  chest: number
  waist: number
  hip: number
  shoulder: number
  sleeve: number
  neck: number
  inseam: number
  length: number
  seat: number
  calf: number
  bottom: number
  biceps: number
  handRight: number
  handLeft: number
  unit: 'inch' | 'cm'
  note: string
  recordedOn: string
}

export type Customer = {
  id: string
  name: string
  phone: string
  city: string
  age: number | null
  gender: string
  email?: string
  birthDate?: string | null
  landmark?: string
  createdAt?: string
  measurements: Measurement[]
}

export type StaffMember = { id: string; name: string; role: StaffRole }
export type ClothRoll = { id: string; sku: string; name: string; qty: number; unit: string }
export type StockMove = { id: string; sku: string; direction: 'in' | 'out'; qty: number; note: string; movedOn: string }

export type Payment = {
  id: string
  amount: number
  date: string
  method: PayMethod
  note: string
}

export type Order = {
  id: string
  orderNo: string
  customerId: string
  garment: string
  dueDate: string
  fittingDate: string | null
  price: number
  stage: Stage
  notes: string
  payments: Payment[]
  workType: WorkType
  urgent: boolean
  itemStatus: ItemStatus
  assignee: string
  stitchNote: string
  cloth: string
  saleMode: 'service' | 'product'
  measure?: SavedMeasure
  dueTime?: string
  fittingTime?: string
  fittingDate2?: string | null
  fittingTime2?: string
}

export type SavedMeasure = {
  unit: 'inch' | 'cm'
  waist?: number
  seat?: number
  hip?: number
  calf?: number
  bottom?: number
  length?: number
  shoulder?: number
  chest?: number
  biceps?: number
  neck?: number
  handRight?: number
  handLeft?: number
}

export type OrderView = Order & {
  paid: number
  balance: number
}

export const atelier = {
  name: 'Tailor',
  street: '18 Residency Lane, Civil Lines',
  city: 'Lucknow 226001',
  phone: '+91 522 400 1180',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function todayIso(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y || 1970, (m || 1) - 1, d || 1)
  date.setDate(date.getDate() + days)
  return todayIso(date)
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d || !MONTHS[m - 1]) return iso
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export function formatTime(value: string): string {
  const [hour, minute] = value.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return ''
  const clock = hour % 12 || 12
  return `${clock}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}

export function formatWhen(date: string | null | undefined, time?: string): string {
  if (!date) return '—'
  const clock = time ? formatTime(time) : ''
  return clock ? `${formatDate(date)} ${clock}` : formatDate(date)
}

export function formatWeekday(now = new Date()): string {
  return `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`
}

export function formatInr(amount: number): string {
  const rounded = Math.round(amount)
  const sign = rounded < 0 ? '-' : ''
  const digits = String(Math.abs(rounded))
  if (digits.length <= 3) return `${sign}₹${digits}`
  const head = digits.slice(0, -3)
  const tail = digits.slice(-3)
  const grouped = head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${sign}₹${grouped},${tail}`
}

export function paidOf(order: Order): number {
  return order.payments.reduce((sum, payment) => sum + payment.amount, 0)
}

export function balanceOf(order: Order): number {
  return order.price - paidOf(order)
}

export function withBalance(order: Order): OrderView {
  const paid = paidOf(order)
  return { ...order, paid, balance: order.price - paid }
}

export function nextStage(stage: Stage): Stage | null {
  const index = STAGES.indexOf(stage)
  if (index < 0 || index >= STAGES.length - 1) return null
  return STAGES[index + 1] ?? null
}

export function customerName(customers: Customer[], customerId: string): string {
  return customers.find(customer => customer.id === customerId)?.name ?? 'Unknown customer'
}

export function countByStage(orders: Order[]): Record<Stage, number> {
  const counts: Record<Stage, number> = {
    Cutting: 0,
    Stitching: 0,
    Finishing: 0,
    Trial: 0,
    Ready: 0,
  }
  for (const order of orders) counts[order.stage] += 1
  return counts
}

export type Attention = {
  id: string
  orderId: string
  tone: 'alert' | 'brass' | 'ink'
  title: string
  detail: string
}

export function attentionItems(customers: Customer[], orders: Order[], today: string): Attention[] {
  const items: Attention[] = []
  const push = (item: Attention) => {
    if (items.some(existing => existing.orderId === item.orderId)) return
    items.push(item)
  }
  for (const order of orders) {
    if (order.stage !== 'Ready' && order.dueDate < today) {
      push({
        id: `due-${order.id}`,
        orderId: order.id,
        tone: 'alert',
        title: `${order.garment} is past due`,
        detail: `${customerName(customers, order.customerId)} · ${order.orderNo}`,
      })
    }
  }
  for (const order of orders) {
    if (order.fittingDate === today && order.stage !== 'Ready') {
      push({
        id: `fit-${order.id}`,
        orderId: order.id,
        tone: 'brass',
        title: `Fitting today · ${customerName(customers, order.customerId)}`,
        detail: `${order.garment} · ${order.stage}`,
      })
    }
  }
  for (const order of orders) {
    if (order.stage === 'Ready' && balanceOf(order) > 0) {
      push({
        id: `ready-${order.id}`,
        orderId: order.id,
        tone: 'ink',
        title: `Ready, and ${formatInr(balanceOf(order))} is open`,
        detail: `${customerName(customers, order.customerId)} · ${order.orderNo}`,
      })
    }
  }
  for (const order of orders) {
    if (order.stage !== 'Ready' && balanceOf(order) > 0 && order.dueDate <= addDays(today, 1)) {
      push({
        id: `bal-${order.id}`,
        orderId: order.id,
        tone: 'ink',
        title: `${formatInr(balanceOf(order))} still to collect`,
        detail: `${customerName(customers, order.customerId)} · due ${formatDate(order.dueDate)}`,
      })
    }
  }
  return items.slice(0, 6)
}

export type MeasurementDraft = {
  label: string
  chest: string
  waist: string
  hip: string
  shoulder: string
  sleeve: string
  neck: string
  inseam: string
  length: string
  note: string
}

const MEASURE_KEYS = ['chest', 'waist', 'hip', 'shoulder', 'sleeve', 'neck', 'inseam', 'length'] as const

export function emptyDraft(): MeasurementDraft {
  return {
    label: '',
    chest: '',
    waist: '',
    hip: '',
    shoulder: '',
    sleeve: '',
    neck: '',
    inseam: '',
    length: '',
    note: '',
  }
}

export function draftIsBlank(draft: MeasurementDraft): boolean {
  return (
    draft.label.trim() === '' &&
    draft.note.trim() === '' &&
    MEASURE_KEYS.every(key => draft[key].trim() === '')
  )
}

export function parseDraft(
  draft: MeasurementDraft,
): { ok: true; value: Omit<Measurement, 'id' | 'recordedOn'> } | { ok: false; error: string } {
  if (!draft.label.trim()) return { ok: false, error: 'Name this measurement set.' }
  const value: Omit<Measurement, 'id' | 'recordedOn'> = {
    label: draft.label.trim(),
    note: draft.note.trim(),
    chest: 0,
    waist: 0,
    hip: 0,
    shoulder: 0,
    sleeve: 0,
    neck: 0,
    inseam: 0,
    length: 0,
    seat: 0,
    calf: 0,
    bottom: 0,
    biceps: 0,
    handRight: 0,
    handLeft: 0,
    unit: 'inch',
  }
  for (const key of MEASURE_KEYS) {
    const number = Number(draft[key])
    if (!Number.isFinite(number) || number < 0 || number > 80) {
      return { ok: false, error: `Enter ${key} in inches.` }
    }
    value[key] = number
  }
  return { ok: true, value }
}

export const ITEM_STATUSES: ItemStatus[] = [
  'Order accepted',
  'Under cutting',
  'Under stitching',
  'Under finishing',
  'Order completed',
  'Order delivered',
]

export const OUTFITS = [
  'Dress',
  'Blouse',
  'Gown',
  'Ladies suit',
  'Under skirt',
  'Rida',
  'Lehenga',
  'Sharara',
  "Women's co-ord set",
  "Women's blazer",
  "Women's pants",
  'Kaftan',
  "Men's kurta pajama",
  "Men's suit",
  'Shirt',
  'Pant',
] as const

export function statusToStage(status: ItemStatus): Stage {
  if (status === 'Under stitching') return 'Stitching'
  if (status === 'Under finishing') return 'Finishing'
  if (status === 'Order completed' || status === 'Order delivered') return 'Ready'
  if (status === 'Under cutting' || status === 'Order accepted') return 'Cutting'
  return 'Trial'
}

export function seedStaff(): StaffMember[] {
  return [
    { id: 's1', name: 'Sridevi', role: 'owner' },
    { id: 's2', name: 'Kamal Dhillon', role: 'cutter' },
    { id: 's3', name: 'Tushar Lal', role: 'stitcher' },
  ]
}

export function seedRolls(): ClothRoll[] {
  return [
    { id: 'r1', sku: 'CL-104', name: 'Ivory silk', qty: 12, unit: 'm' },
    { id: 'r2', sku: 'CL-220', name: 'Charcoal suiting', qty: 8, unit: 'm' },
    { id: 'r3', sku: 'CL-018', name: 'White poplin', qty: 20, unit: 'm' },
    { id: 'r4', sku: 'CL-331', name: 'Red brocade', qty: 4, unit: 'm' },
  ]
}

export const DEMO_NAMES = [
  'Kabir Malhotra',
  'Ananya Iyer',
  'Rohan Mehta',
  'Meera Nair',
  'Fatima Qureshi',
  'Vikram Deshmukh',
  'Harish Patel',
  'Sana Sheikh',
  'Lakshmi Subramanian',
  'Arjun Bedi',
]


export function createSeed(now = new Date()): { customers: Customer[]; orders: Order[] } {
  const on = (days: number) => addDays(todayIso(now), days)
  const measure = (
    id: string,
    label: string,
    waist: number,
    seat: number,
    calf: number,
    bottom: number,
    length: number,
    shoulder: number,
    chest: number,
    biceps: number,
    neck: number,
    handRight: number,
    handLeft: number,
    note: string,
    recordedOn: string,
  ): Measurement => ({
    id,
    label,
    chest,
    waist,
    hip: seat,
    shoulder,
    sleeve: handRight,
    neck,
    inseam: calf,
    length,
    seat,
    calf,
    bottom,
    biceps,
    handRight,
    handLeft,
    unit: 'inch',
    note,
    recordedOn,
  })
  const pay = (id: string, amount: number, date: string, method: PayMethod, note = ''): Payment => ({
    id,
    amount,
    date,
    method,
    note,
  })
  const person = (
    id: string,
    name: string,
    phone: string,
    city: string,
    age: number,
    gender: string,
    measurement: Measurement,
  ): Customer => ({ id, name, phone, city, age, gender, measurements: [measurement] })

  const customers: Customer[] = [
    person('c1', 'Harjit Sandhu', '98150 22110', 'Amritsar', 42, 'Male', measure('m1', "Men's suit", 36, 40, 16, 18, 42, 18, 42, 14, 16, 24, 24, 'Two-button. Cross pocket.', on(-20))),
    person('c2', 'Anika Bedi', '98366 12019', 'Delhi', 25, 'Female', measure('m2', 'Shirt', 28, 36, 13, 16, 28, 15, 36, 11, 13, 22, 22, 'Soft collar.', on(-8))),
    person('c3', 'Tanmay Rao', '98450 77821', 'Bengaluru', 31, 'Male', measure('m3', 'Pant', 34, 40, 15, 17, 40, 17, 38, 13, 15, 0, 0, 'Single pleat.', on(-6))),
    person('c4', 'Devika Nair', '98950 33412', 'Kochi', 28, 'Female', measure('m4', 'Saree blouse', 30, 36, 0, 14, 15, 14, 36, 11, 13, 8, 8, 'Deep back. Inseam unused.', on(-12))),
    person('c5', 'Rohini Iyer', '98400 55127', 'Chennai', 34, 'Female', measure('m5', 'Ladies suit', 30, 38, 14, 18, 42, 15, 38, 12, 14, 22, 22, 'Straight pant.', on(-4))),
    person('c6', 'Aditya Menon', '98490 66520', 'Hyderabad', 29, 'Male', measure('m6', "Men's kurta pajama", 34, 38, 14, 16, 40, 17, 40, 13, 15.5, 23, 23, 'Side slits 12 inches.', on(-9))),
    person('c7', 'Neelam Kaur', '98140 90344', 'Ludhiana', 38, 'Female', measure('m7', 'Shirt', 32, 40, 14, 17, 26, 16, 40, 12, 14, 23, 23, 'Longer cuff.', on(-15))),
    person('c8', 'Farhan Qureshi', '98390 22018', 'Lucknow', 45, 'Male', measure('m8', 'Pant', 38, 42, 16, 18, 39, 18, 44, 15, 17, 0, 0, 'Past the delivery day.', on(-11))),
    person('c9', 'Meher Kapoor', '98200 11876', 'Mumbai', 27, 'Female', measure('m9', 'Evening gown', 28, 38, 14, 22, 58, 15, 36, 11, 13, 22, 22, 'Floor length.', on(-3))),
    person('c10', 'Kavya Joshi', '98240 11890', 'Jaipur', 23, 'Female', measure('m10', 'Under skirt', 28, 38, 14, 20, 40, 14, 34, 11, 13, 0, 0, 'Flare from the knee.', on(-7))),
  ]

  const row = (
    id: string,
    orderNo: string,
    customerId: string,
    garment: string,
    due: number,
    trial: number,
    price: number,
    status: ItemStatus,
    urgent: boolean,
    assignee: string,
    cloth: string,
    stitchNote: string,
    paid: number,
    payId: string,
  ): Order => ({
    id,
    orderNo,
    customerId,
    garment,
    dueDate: on(due),
    fittingDate: on(trial),
    price,
    stage: statusToStage(status),
    notes: stitchNote,
    payments: paid > 0 ? [pay(payId, paid, on(-2), 'UPI', 'Advance')] : [],
    workType: 'Stitching',
    urgent,
    itemStatus: status,
    assignee,
    stitchNote,
    cloth,
    saleMode: 'service',
  })

  const orders: Order[] = [
    row('o1', 'TL-2001', 'c1', "Men's suit", 6, 2, 18500, 'Under stitching', true, 'Tushar Lal', 'Charcoal suiting', 'Side pocket: Cross. Pleats: No. Back pocket: 1 with flap.', 8000, 'p1'),
    row('o2', 'TL-2002', 'c2', 'Shirt', 8, 3, 4500, 'Order accepted', false, 'Kamal Dhillon', 'White poplin', 'Plain cuff.', 1500, 'p2'),
    row('o3', 'TL-2003', 'c3', 'Pant', 9, 4, 3200, 'Under cutting', false, 'Kamal Dhillon', 'Charcoal suiting', 'Single pleat. One back pocket.', 1000, 'p3'),
    row('o4', 'TL-2004', 'c4', 'Saree blouse', 3, 1, 5200, 'Under finishing', false, 'Tushar Lal', 'Red brocade', 'Hook closure.', 2000, 'p4'),
    row('o5', 'TL-2005', 'c5', 'Ladies suit', 5, 0, 9600, 'Order accepted', true, 'Tushar Lal', 'Ivory silk', 'Trial today.', 4000, 'p5'),
    row('o6', 'TL-2006', 'c6', "Men's kurta pajama", 11, 5, 6800, 'Under stitching', false, 'Tushar Lal', 'Ivory silk', 'Side slits.', 2500, 'p6'),
    row('o7', 'TL-2007', 'c7', 'Shirt', 0, -1, 3600, 'Under finishing', false, 'Tushar Lal', 'White poplin', 'Delivery today.', 3600, 'p7'),
    row('o8', 'TL-2008', 'c8', 'Pant', -1, -2, 4100, 'Under stitching', true, 'Tushar Lal', 'Charcoal suiting', 'Delivery was yesterday.', 1500, 'p8'),
    row('o9', 'TL-2009', 'c9', 'Evening gown', 14, 6, 22000, 'Order accepted', false, 'Sridevi', 'Ivory silk', 'Floor hem.', 10000, 'p9'),
    row('o10', 'TL-2010', 'c10', 'Under skirt', 7, 3, 5400, 'Under cutting', false, 'Kamal Dhillon', 'Red brocade', 'Flared hem.', 2000, 'p10'),
  ]

  return { customers, orders }
}
