import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  balanceOf,
  createSeed,
  DEMO_NAMES,
  formatWhen,
  nextStage,
  seedRolls,
  seedStaff,
  statusToStage,
  todayIso,
  withBalance,
  type ClothRoll,
  type Customer,
  type ItemStatus,
  type Measurement,
  type OrderView,
  type SavedMeasure,
  type PayMethod,
  type StaffMember,
  type Stage,
  type StockMove,
} from './seed.ts'

export class StoreError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'StoreError'
    this.status = status
  }
}

type MeasurementRow = {
  id: string
  label: string
  chest: number | string
  waist: number | string
  hip: number | string
  shoulder: number | string
  sleeve: number | string
  neck: number | string
  inseam: number | string
  length: number | string
  seat?: number | string | null
  calf?: number | string | null
  bottom_bell?: number | string | null
  biceps?: number | string | null
  hand_right?: number | string | null
  hand_left?: number | string | null
  unit?: string | null
  note: string
  recorded_on: string
}

type CustomerRow = {
  id: string
  name: string
  phone: string
  city: string
  age?: number | null
  gender?: string | null
  email?: string | null
  birth_date?: string | null
  landmark?: string | null
  created_at?: string | null
  measurements: MeasurementRow[] | null
  custom_measurement_sets?: Array<{
    id: string
    source_customer_id: string
    garment: string
    measurements: Array<{ label: string; value: string }>
  }> | null
}

type PaymentRow = {
  id: string
  amount: number | string
  paid_on: string
  method: PayMethod
  note: string
}

type OrderRow = {
  id: string
  order_no: string
  customer_id: string
  garment: string
  due_date: string
  fitting_date: string | null
  price: number | string
  stage: Stage
  notes: string
  work_type?: string | null
  urgent?: boolean | null
  item_status?: string | null
  assignee?: string | null
  stitch_note?: string | null
  cloth?: string | null
  sale_mode?: string | null
  payments: PaymentRow[] | null
}

const MEASUREMENT_COLUMNS =
  'id, label, chest, waist, hip, shoulder, sleeve, neck, inseam, length, seat, calf, bottom_bell, biceps, hand_right, hand_left, unit, note, recorded_on'
const CUSTOMER_SELECT = `id, name, phone, city, age, gender, email, birth_date, landmark, created_at, measurements (${MEASUREMENT_COLUMNS}), custom_measurement_sets:customer_measurement_sets (id, source_customer_id, garment, measurements)`
const ORDER_SELECT =
  'id, order_no, customer_id, garment, due_date, fitting_date, price, stage, notes, work_type, urgent, item_status, assignee, stitch_note, cloth, sale_mode, payments (id, amount, paid_on, method, note)'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in api/.env')
}

const shopUserId = process.env.SHOP_USER_ID ?? ''

const supabase: SupabaseClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function owned<T extends Record<string, unknown>>(row: T): T & { user_id?: string } {
  return shopUserId ? { ...row, user_id: shopUserId } : row
}

function num(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapMeasurement(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    label: row.label,
    chest: num(row.chest),
    waist: num(row.waist),
    hip: num(row.hip),
    shoulder: num(row.shoulder),
    sleeve: num(row.sleeve),
    neck: num(row.neck),
    inseam: num(row.inseam),
    length: num(row.length),
    note: row.note,
    recordedOn: row.recorded_on,
    seat: num(row.seat ?? row.hip),
    calf: num(row.calf ?? 0),
    bottom: num(row.bottom_bell ?? 0),
    biceps: num(row.biceps ?? 0),
    handRight: num(row.hand_right ?? row.sleeve),
    handLeft: num(row.hand_left ?? row.sleeve),
    unit: row.unit === 'cm' ? 'cm' : 'inch',
  }
}

function mapCustomer(row: CustomerRow): Customer {
  const measurements = (row.measurements ?? []).map(mapMeasurement)
  measurements.sort((a, b) => (a.recordedOn < b.recordedOn ? 1 : -1))
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    city: row.city,
    age: row.age ?? null,
    gender: row.gender ?? '',
    email: row.email ?? '',
    birthDate: row.birth_date,
    landmark: row.landmark ?? '',
    createdAt: row.created_at ? String(row.created_at).slice(0, 10) : undefined,
    measurements,
    customMeasurementSets: (row.custom_measurement_sets ?? []).map(set => ({
      id: set.id,
      sourceCustomerId: set.source_customer_id,
      garment: set.garment,
      measurements: set.measurements,
    })),
  }
}

export async function importCustomerMeasurementSets(input: unknown): Promise<{ customers: number; measurementSets: number; measurementValues: number }> {
  if (!input || typeof input !== 'object') throw new StoreError(400, 'Send a customer measurement export.')
  const payload = input as { format?: unknown; customers?: unknown }
  if (payload.format !== 'darzee-customer-measurements-v1' || !Array.isArray(payload.customers)) {
    throw new StoreError(400, 'This is not a supported customer measurement export.')
  }
  let customers = 0
  let measurementSets = 0
  let measurementValues = 0
  for (const item of payload.customers) {
    if (!item || typeof item !== 'object') continue
    const source = item as { sourceCustomerId?: unknown; name?: unknown; phone?: unknown; address?: unknown; bookNo?: unknown; measurementSets?: unknown }
    const sourceCustomerId = String(source.sourceCustomerId ?? '').trim()
    const name = String(source.name ?? '').trim()
    const phone = String(source.phone ?? '').trim()
    const measurementSetsInput = Array.isArray(source.measurementSets) ? source.measurementSets : []
    if (!sourceCustomerId || !name) continue
    const customerId = `lc_${sourceCustomerId}`
    const match = await supabase.from('customers').select('id').eq('id', customerId).maybeSingle()
    readError(match.error, 'Customers could not be matched.')
    if (!match.data) {
      const inserted = await supabase.from('customers').insert(owned({
        id: customerId,
        name,
        phone,
        city: String(source.address ?? '').trim(),
        book_no: String(source.bookNo ?? '').trim() || null,
        created_at: new Date().toISOString(),
      }))
      readError(inserted.error, 'A customer could not be imported.')
      customers += 1
    }
    for (let index = 0; index < measurementSetsInput.length; index += 1) {
      const raw = measurementSetsInput[index]
      if (!raw || typeof raw !== 'object') continue
      const set = raw as { garment?: unknown; measurements?: unknown }
      const garment = String(set.garment ?? '').trim() || 'Unspecified garment'
      const rows = Array.isArray(set.measurements) ? set.measurements : []
      const measurements = rows.flatMap(row => {
        if (!row || typeof row !== 'object') return []
        const pair = row as { label?: unknown; value?: unknown }
        const label = String(pair.label ?? '').trim()
        const value = String(pair.value ?? '').trim()
        return label && value ? [{ label, value }] : []
      })
      const upsert = await supabase.from('customer_measurement_sets').upsert(owned({
        id: `lc_${sourceCustomerId}_${index + 1}`,
        source_customer_id: sourceCustomerId,
        customer_id: customerId,
        garment,
        measurements,
      }), { onConflict: 'id' })
      readError(upsert.error, 'A customer measurement set could not be imported.')
      measurementSets += 1
      measurementValues += measurements.length
    }
  }
  return { customers, measurementSets, measurementValues }
}

function mapOrder(row: OrderRow): OrderView {
  const payments = (row.payments ?? [])
    .map(payment => ({
      id: payment.id,
      amount: num(payment.amount),
      date: payment.paid_on,
      method: payment.method,
      note: payment.note,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const stored = readPacked(row.notes)
  return withBalance({
    id: row.id,
    orderNo: row.order_no,
    customerId: row.customer_id,
    garment: row.garment,
    dueDate: row.due_date,
    fittingDate: row.fitting_date,
    price: num(row.price),
    stage: row.stage,
    notes: stored.notes,
    measure: stored.measure,
    payments,
    workType: row.work_type === 'Alteration' || row.work_type === 'Sale' ? row.work_type : 'Stitching',
    urgent: Boolean(row.urgent),
    itemStatus: (row.item_status as ItemStatus) || 'Order accepted',
    assignee: row.assignee ?? '',
    stitchNote: row.stitch_note ?? '',
    cloth: row.cloth ?? '',
    saleMode: row.sale_mode === 'product' ? 'product' : 'service',
    dueTime: stored.dueTime,
    fittingTime: stored.fittingTime,
    fittingDate2: stored.fittingDate2,
    fittingTime2: stored.fittingTime2,
  })
}

function readPacked(notes: string): {
  notes: string
  measure?: SavedMeasure
  dueTime: string
  fittingTime: string
  fittingDate2: string | null
  fittingTime2: string
} {
  const empty = { notes, measure: undefined, dueTime: '', fittingTime: '', fittingDate2: null, fittingTime2: '' }
  if (!notes.startsWith('{')) return empty
  try {
    const parsed = JSON.parse(notes) as {
      measure?: SavedMeasure
      text?: string
      schedule?: { dueTime?: string; fittingTime?: string; fittingDate2?: string | null; fittingTime2?: string }
    }
    const schedule = parsed.schedule ?? {}
    const day = typeof schedule.fittingDate2 === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(schedule.fittingDate2) ? schedule.fittingDate2 : null
    return {
      notes: typeof parsed.text === 'string' ? parsed.text : '',
      measure: parsed.measure && typeof parsed.measure === 'object' ? parsed.measure : undefined,
      dueTime: typeof schedule.dueTime === 'string' ? schedule.dueTime : '',
      fittingTime: typeof schedule.fittingTime === 'string' ? schedule.fittingTime : '',
      fittingDate2: day,
      fittingTime2: typeof schedule.fittingTime2 === 'string' ? schedule.fittingTime2 : '',
    }
  } catch {
    return empty
  }
}

function readError(error: { message: string } | null, fallback: string): void {
  if (!error) return
  console.error(fallback, error.message)
  throw new StoreError(500, fallback)
}

const PAY_METHODS: PayMethod[] = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Card swipe', 'Other']

function measurementRow(customerId: string, measurement: Measurement) {
  return {
    id: measurement.id,
    customer_id: customerId,
    label: measurement.label,
    chest: measurement.chest,
    waist: measurement.waist,
    hip: measurement.hip,
    shoulder: measurement.shoulder,
    sleeve: measurement.sleeve,
    neck: measurement.neck,
    inseam: measurement.inseam,
    length: measurement.length,
    seat: measurement.seat,
    calf: measurement.calf,
    bottom_bell: measurement.bottom,
    biceps: measurement.biceps,
    hand_right: measurement.handRight,
    hand_left: measurement.handLeft,
    unit: measurement.unit,
    note: measurement.note,
    recorded_on: measurement.recordedOn,
  }
}

function orderRow(order: ReturnType<typeof createSeed>['orders'][number]) {
  return {
    id: order.id,
    order_no: order.orderNo,
    customer_id: order.customerId,
    garment: order.garment,
    due_date: order.dueDate,
    fitting_date: order.fittingDate,
    price: order.price,
    stage: order.stage,
    notes: order.notes,
    work_type: order.workType,
    urgent: order.urgent,
    item_status: order.itemStatus,
    assignee: order.assignee,
    stitch_note: order.stitchNote,
    cloth: order.cloth,
    sale_mode: order.saleMode,
  }
}

async function insertBook(seed: ReturnType<typeof createSeed>): Promise<void> {
  const customers = seed.customers.map(customer => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    city: customer.city,
    age: customer.age,
    gender: customer.gender,
  }))
  const measurements = seed.customers.flatMap(customer => customer.measurements.map(measurement => measurementRow(customer.id, measurement)))
  const orders = seed.orders.map(orderRow)
  const payments = seed.orders.flatMap(order =>
    order.payments.map(payment => ({
      id: payment.id,
      order_id: order.id,
      amount: payment.amount,
      paid_on: payment.date,
      method: payment.method,
      note: payment.note,
    })),
  )

  const insertedCustomers = await supabase.from('customers').insert(customers.map(row => owned(row)))
  readError(insertedCustomers.error, 'The sample customers could not be saved.')
  const insertedMeasurements = await supabase.from('measurements').insert(measurements.map(row => owned(row)))
  readError(insertedMeasurements.error, 'The sample measurements could not be saved.')
  const insertedOrders = await supabase.from('orders').insert(orders.map(row => owned(row)))
  readError(insertedOrders.error, 'The sample orders could not be saved.')
  const insertedPayments = await supabase.from('payments').insert(payments.map(row => owned(row)))
  readError(insertedPayments.error, 'The sample payments could not be saved.')
}

export async function ensureSeed(): Promise<void> {
  const existing = await supabase.from('customers').select('name')
  readError(existing.error, 'The floor book could not be read.')
  const names = (existing.data ?? []).map(row => String((row as { name: string }).name))
  const seed = createSeed()
  const wanted = seed.customers.map(customer => customer.name)
  const onlyDemo = names.length > 0 && names.every(name => DEMO_NAMES.includes(name))
  if (onlyDemo) {
    const listed = await supabase.from('customers').select('id').in('name', DEMO_NAMES)
    readError(listed.error, 'The old sample book could not be read.')
    const ids = (listed.data ?? []).map(row => String((row as { id: string }).id))
    if (ids.length > 0) {
      const cleared = await supabase.from('orders').delete().in('customer_id', ids)
      readError(cleared.error, 'The old sample orders could not be replaced.')
      const removed = await supabase.from('customers').delete().in('id', ids)
      readError(removed.error, 'The old sample book could not be replaced.')
    }
  }
  const current = onlyDemo ? [] : names
  if (current.length === 0 || wanted.some(name => !current.includes(name))) {
    const missing = seed.customers.filter(customer => !current.includes(customer.name))
    const book = {
      customers: missing,
      orders: seed.orders.filter(order => missing.some(customer => customer.id === order.customerId)),
    }
    if (book.customers.length > 0) await insertBook(book)
  }
  const staffCount = await supabase.from('staff').select('id', { count: 'exact', head: true })
  readError(staffCount.error, 'Staff could not be read.')
  if ((staffCount.count ?? 0) === 0) {
    const inserted = await supabase.from('staff').insert(seedStaff().map(row => owned(row)))
    readError(inserted.error, 'Staff could not be saved.')
  }
  const rollCount = await supabase.from('inventory').select('id', { count: 'exact', head: true })
  readError(rollCount.error, 'Cloth stock could not be read.')
  if ((rollCount.count ?? 0) === 0) {
    const inserted = await supabase.from('inventory').insert(seedRolls().map(roll => owned({ ...roll })))
    readError(inserted.error, 'Cloth stock could not be saved.')
  }
  const owner = await supabase.from('staff').update({ name: 'Sridevi' }).eq('role', 'owner')
  readError(owner.error, 'The owner name could not be saved.')
  const renamed = await supabase.from('orders').update({ assignee: 'Sridevi' }).eq('assignee', 'Asha Gill')
  readError(renamed.error, 'The owner assignment could not be saved.')
  await ensureProductSale()
}

async function ensureProductSale(): Promise<void> {
  const existing = await supabase.from('orders').select('id').eq('sale_mode', 'product').limit(1)
  readError(existing.error, 'Product sales could not be read.')
  if ((existing.data ?? []).length > 0) return
  const customer = await supabase.from('customers').select('id').eq('name', 'Meher Kapoor').maybeSingle()
  readError(customer.error, 'The product sale customer could not be read.')
  if (!customer.data) return
  const inserted = await supabase.from('orders').insert(owned({
    id: 'o_sale_ivory',
    order_no: 'TL-2101',
    customer_id: (customer.data as { id: string }).id,
    garment: 'Ivory silk',
    due_date: todayIso(),
    fitting_date: null,
    price: 2400,
    stage: 'Ready',
    notes: 'Ready cloth from roll CL-104.',
    work_type: 'Sale',
    urgent: false,
    item_status: 'Order delivered',
    assignee: 'Sridevi',
    stitch_note: '',
    cloth: 'Ivory silk',
    sale_mode: 'product',
  }))
  readError(inserted.error, 'The ready cloth sale could not be saved.')
  const rolls = await listRolls()
  const roll = rolls.find(item => item.sku === 'CL-104')
  if (roll && roll.qty >= 2) await moveStock(roll.id, { direction: 'out', qty: 2, note: 'TL-2101' })
}

export async function jobSheetDocument(id: string): Promise<{ filename: string; lines: string[] }> {
  const order = await getOrder(id)
  const customer = await getCustomer(order.customerId)
  const measure = customer.measurements[0]
  const lines = [
    'Tailor job sheet',
    `Order number ${order.orderNo}`,
    `Customer ${customer.name}`,
    `Phone ${customer.phone}`,
    `Outfit ${order.garment}`,
    `Type ${order.workType}`,
    `Stage ${order.itemStatus}`,
    `Trial ${formatWhen(order.fittingDate, order.fittingTime)}`,
    order.fittingDate2 ? `Second trial ${formatWhen(order.fittingDate2, order.fittingTime2)}` : '',
    `Delivery ${formatWhen(order.dueDate, order.dueTime)}`,
    order.stitchNote ? `Stitch ${order.stitchNote}` : '',
  ].filter(Boolean)
  if (measure) {
    lines.push(
      `Measurements in ${measure.unit}`,
      `Waist ${measure.waist}   Seat ${measure.seat}   Chest ${measure.chest}`,
      `Length ${measure.length}   Shoulders ${measure.shoulder}   Neck ${measure.neck}`,
      `Biceps ${measure.biceps}   Calf ${measure.calf}   Bottom ${measure.bottom}`,
      `Right hand ${measure.handRight}   Left hand ${measure.handLeft}`,
    )
  } else {
    lines.push('Measurements none on file')
  }
  return { filename: `${order.orderNo}-job-sheet.pdf`, lines }
}

export async function listCustomers(): Promise<Customer[]> {
  const customers: Customer[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const result = await supabase.from('customers').select(CUSTOMER_SELECT)
      .order('name').order('id').range(offset, offset + pageSize - 1)
    readError(result.error, 'The floor book could not be read.')
    const page = (result.data ?? []) as CustomerRow[]
    customers.push(...page.map(mapCustomer))
    if (page.length < pageSize) return customers
  }
}

export async function getCustomer(id: string): Promise<Customer> {
  const result = await supabase.from('customers').select(CUSTOMER_SELECT).eq('id', id).maybeSingle()
  readError(result.error, 'The floor book could not be read.')
  if (!result.data) throw new StoreError(404, 'Customer not found.')
  return mapCustomer(result.data as CustomerRow)
}

function ageFromBirth(value: string): number | null {
  if (!value) return null
  const born = new Date(value)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const month = now.getMonth() - born.getMonth()
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) age -= 1
  return age > 0 ? age : null
}

function cleanPerson(input: {
  name?: unknown
  phone?: unknown
  city?: unknown
  age?: unknown
  gender?: unknown
  email?: unknown
  birthDate?: unknown
  landmark?: unknown
}): {
  name: string
  phone: string
  city: string
  age: number | null
  gender: string
  email: string
  birth_date: string | null
  landmark: string
} {
  const name = String(input.name ?? '').trim()
  const phone = String(input.phone ?? '').trim()
  const city = String(input.city ?? '').trim() || 'Lucknow'
  if (name.length < 2) throw new StoreError(400, 'Enter the customer name.')
  if (phone.replace(/\D/g, '').length < 8) throw new StoreError(400, 'Enter a phone number.')
  const birthDate = String(input.birthDate ?? '').trim()
  const fromBirth = ageFromBirth(birthDate)
  const ageNumber = Number(input.age)
  const age = fromBirth ?? (Number.isFinite(ageNumber) && ageNumber > 0 ? Math.round(ageNumber) : null)
  const gender = String(input.gender ?? '').trim()
  const email = String(input.email ?? '').trim()
  const landmark = String(input.landmark ?? '').trim()
  return { name, phone, city, age, gender, email, birth_date: birthDate || null, landmark }
}

function cleanMeasurement(input: unknown): Omit<Measurement, 'id' | 'recordedOn'> | null {
  if (!input || typeof input !== 'object') return null
  const draft = input as Record<string, unknown>
  const label = String(draft.label ?? '').trim()
  if (!label) throw new StoreError(400, 'Name this measurement set.')
  const keys = ['chest', 'waist', 'hip', 'shoulder', 'sleeve', 'neck', 'inseam', 'length'] as const
  const value: Omit<Measurement, 'id' | 'recordedOn'> = {
    label,
    note: String(draft.note ?? '').trim(),
    chest: 0,
    waist: 0,
    hip: 0,
    shoulder: 0,
    sleeve: 0,
    neck: 0,
    inseam: 0,
    length: 0,
    seat: Number(draft.seat ?? draft.hip ?? 0) || 0,
    calf: Number(draft.calf ?? 0) || 0,
    bottom: Number(draft.bottom ?? 0) || 0,
    biceps: Number(draft.biceps ?? 0) || 0,
    handRight: Number(draft.handRight ?? 0) || 0,
    handLeft: Number(draft.handLeft ?? 0) || 0,
    unit: draft.unit === 'cm' ? 'cm' : 'inch',
  }
  for (const key of keys) {
    const number = Number(draft[key] ?? 0)
    if (!Number.isFinite(number) || number < 0 || number > 250) {
      throw new StoreError(400, `Enter ${key} as a measurement.`)
    }
    value[key] = number
  }
  return value
}

async function insertMeasurement(customerId: string, measurement: Omit<Measurement, 'id' | 'recordedOn'>): Promise<void> {
  const result = await supabase.from('measurements').insert(owned({
    id: `m_${crypto.randomUUID().slice(0, 8)}`,
    customer_id: customerId,
    label: measurement.label,
    chest: measurement.chest,
    waist: measurement.waist,
    hip: measurement.hip,
    shoulder: measurement.shoulder,
    sleeve: measurement.sleeve,
    neck: measurement.neck,
    inseam: measurement.inseam,
    length: measurement.length,
    note: measurement.note,
    recorded_on: todayIso(),
    seat: measurement.seat,
    calf: measurement.calf,
    bottom_bell: measurement.bottom,
    biceps: measurement.biceps,
    hand_right: measurement.handRight,
    hand_left: measurement.handLeft,
    unit: measurement.unit,
  }))
  readError(result.error, 'The measurement could not be saved.')
}

export async function createCustomer(input: {
  name?: unknown
  phone?: unknown
  city?: unknown
  age?: unknown
  gender?: unknown
  email?: unknown
  birthDate?: unknown
  landmark?: unknown
  measurement?: unknown
}): Promise<Customer> {
  const person = cleanPerson(input)
  const measurement = cleanMeasurement(input.measurement)
  const id = `c_${crypto.randomUUID().slice(0, 8)}`
  const inserted = await supabase.from('customers').insert(owned({ id, ...person }))
  readError(inserted.error, 'The customer could not be saved.')
  if (measurement) await insertMeasurement(id, measurement)
  return getCustomer(id)
}

export async function addMeasurement(customerId: string, input: unknown): Promise<Customer> {
  await getCustomer(customerId)
  const measurement = cleanMeasurement(input)
  if (!measurement) throw new StoreError(400, 'Name this measurement set.')
  await insertMeasurement(customerId, measurement)
  return getCustomer(customerId)
}

export async function listOrders(): Promise<OrderView[]> {
  const result = await supabase.from('orders').select(ORDER_SELECT).order('due_date')
  readError(result.error, 'The floor book could not be read.')
  return ((result.data ?? []) as OrderRow[]).map(mapOrder)
}

export async function getOrder(id: string): Promise<OrderView> {
  const result = await supabase.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle()
  readError(result.error, 'The floor book could not be read.')
  if (!result.data) throw new StoreError(404, 'Order not found.')
  return mapOrder(result.data as OrderRow)
}

export async function advanceOrder(id: string): Promise<OrderView> {
  const current = await getOrder(id)
  const stage = nextStage(current.stage)
  if (!stage) throw new StoreError(400, 'This order is already ready.')
  const updated = await supabase.from('orders').update({ stage }).eq('id', id)
  readError(updated.error, 'The stage could not be updated.')
  return getOrder(id)
}

export async function recordPayment(
  id: string,
  input: { amount?: unknown; method?: unknown; note?: unknown },
): Promise<OrderView> {
  const current = await getOrder(id)
  const amount = Math.round(Number(input.amount))
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new StoreError(400, 'Enter an amount greater than zero.')
  }
  if (amount > balanceOf(current)) throw new StoreError(400, 'That is more than the balance.')
  const method = String(input.method ?? '')
  if (!PAY_METHODS.includes(method as PayMethod)) {
    throw new StoreError(400, 'Choose a payment method.')
  }
  const inserted = await supabase.from('payments').insert(owned({
    id: `p_${crypto.randomUUID().slice(0, 8)}`,
    order_id: id,
    amount,
    paid_on: todayIso(),
    method,
    note: String(input.note ?? '').trim(),
  }))
  readError(inserted.error, 'The payment could not be saved.')
  return getOrder(id)
}

export async function listStaff(): Promise<StaffMember[]> {
  const result = await supabase.from('staff').select('id, name, role').order('name')
  readError(result.error, 'Staff could not be read.')
  return (result.data ?? []) as StaffMember[]
}

export async function listRolls(): Promise<ClothRoll[]> {
  const result = await supabase.from('inventory').select('id, sku, name, qty, unit').order('name')
  readError(result.error, 'Cloth stock could not be read.')
  return ((result.data ?? []) as Array<ClothRoll & { qty: number | string }>).map(roll => ({
    ...roll,
    qty: num(roll.qty),
  }))
}

export async function listMoves(): Promise<StockMove[]> {
  const result = await supabase.from('stock_moves').select('id, sku, direction, qty, note, moved_on').order('moved_on', { ascending: false })
  readError(result.error, 'Stock moves could not be read.')
  return ((result.data ?? []) as Array<{ id: string; sku: string; direction: 'in' | 'out'; qty: number | string; note: string; moved_on: string }>).map(row => ({
    id: row.id,
    sku: row.sku,
    direction: row.direction,
    qty: num(row.qty),
    note: row.note,
    movedOn: row.moved_on,
  }))
}

export async function moveStock(id: string, input: { direction?: unknown; qty?: unknown; note?: unknown }): Promise<ClothRoll> {
  const rolls = await listRolls()
  const roll = rolls.find(item => item.id === id)
  if (!roll) throw new StoreError(404, 'Cloth roll not found.')
  const direction = input.direction === 'out' ? 'out' : 'in'
  const qty = Number(input.qty)
  if (!Number.isFinite(qty) || qty <= 0) throw new StoreError(400, 'Enter a quantity.')
  const next = direction === 'out' ? roll.qty - qty : roll.qty + qty
  if (next < 0) throw new StoreError(400, 'That is more cloth than is on the roll.')
  const updated = await supabase.from('inventory').update({ qty: next }).eq('id', id)
  readError(updated.error, 'The roll could not be updated.')
  const moved = await supabase.from('stock_moves').insert(owned({
    id: `mv_${crypto.randomUUID().slice(0, 8)}`,
    sku: roll.sku,
    direction,
    qty,
    note: String(input.note ?? '').trim(),
    moved_on: todayIso(),
  }))
  readError(moved.error, 'The stock move could not be saved.')
  return { ...roll, qty: next }
}

export async function setItemStatus(id: string, status: string): Promise<OrderView> {
  const allowed: ItemStatus[] = ['Order accepted', 'Under cutting', 'Under stitching', 'Under finishing', 'Order completed', 'Order delivered']
  if (!allowed.includes(status as ItemStatus)) throw new StoreError(400, 'Choose an item status.')
  const itemStatus = status as ItemStatus
  const updated = await supabase.from('orders').update({ item_status: itemStatus, stage: statusToStage(itemStatus) }).eq('id', id)
  readError(updated.error, 'The status could not be updated.')
  return getOrder(id)
}

export async function assignOrder(id: string, assignee: string): Promise<OrderView> {
  const updated = await supabase.from('orders').update({ assignee: assignee.trim() }).eq('id', id)
  readError(updated.error, 'The job could not be assigned.')
  return getOrder(id)
}

function stitchOptions(input: Record<string, unknown>): string {
  const side = String(input.sidePocket ?? '').trim()
  const pleats = String(input.pleats ?? '').trim()
  const back = String(input.backPockets ?? '').trim()
  return [
    side ? `Side pocket: ${side}` : '',
    pleats ? `Pleats: ${pleats}` : '',
    back ? `Back pockets: ${back}` : '',
  ].filter(Boolean).join('. ')
}

export async function createOrder(input: Record<string, unknown>): Promise<OrderView> {
  const customerId = String(input.customerId ?? '')
  await getCustomer(customerId)
  const garment = String(input.garment ?? '').trim()
  if (!garment) throw new StoreError(400, 'Choose an outfit.')
  const workType = input.workType === 'Alteration' || input.workType === 'Sale' ? input.workType : 'Stitching'
  const saleMode = input.saleMode === 'product' || workType === 'Sale' ? 'product' : 'service'
  const price = Math.round(Number(input.price ?? 0))
  if (!Number.isFinite(price) || price < 0) throw new StoreError(400, 'Enter a price.')
  const id = `o_${crypto.randomUUID().slice(0, 8)}`
  const orderNo = `TL-${2000 + Math.floor(Math.random() * 7000)}`
  const allowedStatus: ItemStatus[] = ['Order accepted', 'Under cutting', 'Under stitching', 'Under finishing', 'Order completed', 'Order delivered']
  const requested = String(input.itemStatus ?? '')
  const itemStatus: ItemStatus = allowedStatus.includes(requested as ItemStatus)
    ? (requested as ItemStatus)
    : saleMode === 'product'
      ? 'Order delivered'
      : 'Order accepted'
  const measurement = cleanMeasurement(input.measurement)
  if (measurement) await insertMeasurement(customerId, measurement)
  const clock = (value: unknown) => (/^\d{2}:\d{2}$/.test(String(value)) ? String(value) : '')
  const secondTrial = /^\d{4}-\d{2}-\d{2}$/.test(String(input.fittingDate2 ?? '')) ? String(input.fittingDate2) : null
  const schedule = {
    dueTime: clock(input.dueTime),
    fittingTime: clock(input.fittingTime),
    fittingDate2: secondTrial,
    fittingTime2: clock(input.fittingTime2),
  }
  const stitchNote = stitchOptions(input)
  const measure = measurement
    ? {
        unit: measurement.unit,
        ...Object.fromEntries(
          (['waist', 'seat', 'hip', 'calf', 'bottom', 'length', 'shoulder', 'chest', 'biceps', 'neck', 'handRight', 'handLeft'] as const)
            .filter(key => measurement[key] > 0)
            .map(key => [key, measurement[key]]),
        ),
      }
    : undefined
  const inserted = await supabase.from('orders').insert(owned({
    id,
    order_no: orderNo,
    customer_id: customerId,
    garment,
    due_date: String(input.dueDate || todayIso()),
    fitting_date: input.fittingDate ? String(input.fittingDate) : null,
    price,
    stage: statusToStage(itemStatus),
    notes: JSON.stringify({ ...(measure ? { measure } : {}), schedule }),
    work_type: workType,
    urgent: Boolean(input.urgent),
    item_status: itemStatus,
    assignee: String(input.assignee ?? ''),
    stitch_note: stitchNote,
    cloth: String(input.cloth ?? ''),
    sale_mode: saleMode,
  }))
  readError(inserted.error, 'The order could not be saved.')
  const advance = Math.round(Number(input.advance ?? 0))
  if (advance > 0) await recordPayment(id, { amount: advance, method: input.method ?? 'Cash', note: 'Advance' })
  if (saleMode === 'product') {
    const rolls = await listRolls()
    const cloth = String(input.cloth ?? garment)
    const roll = rolls.find(item => item.sku === cloth || item.name === cloth || item.name === garment)
    const qty = Number(input.qty ?? 1)
    if (roll) {
      try {
        await moveStock(roll.id, { direction: 'out', qty: Number.isFinite(qty) && qty > 0 ? qty : 1, note: orderNo })
      } catch (error) {
        await supabase.from('orders').delete().eq('id', id)
        throw error
      }
    }
  }
  return getOrder(id)
}
