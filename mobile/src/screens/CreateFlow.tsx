import { useState } from 'react'
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api } from '../api/client'
import { Button, Screen, Title } from '../components/ui'
import {
  ITEM_STATUSES,
  addDays,
  balanceOf,
  customerName,
  formatDate,
  formatInr,
  formatWhen,
  paidOf,
  todayIso,
  type Order,
  type PayMethod,
} from '../data/shop'
import type { FloorParamList } from '../navigation/types'
import { useShop } from '../state/ShopContext'
import { tokens } from '../theme/tokens'

type MeasureKey = 'waist' | 'seat' | 'hip' | 'calf' | 'bottom' | 'length' | 'shoulder' | 'chest' | 'biceps' | 'neck' | 'handRight' | 'handLeft'

const BOTTOM: [MeasureKey, string][] = [['waist', 'Waist'], ['seat', 'Seat'], ['calf', 'Calf / knee'], ['bottom', 'Bottom / bells'], ['length', 'Length']]
const UPPER: [MeasureKey, string][] = [['shoulder', 'Shoulders'], ['chest', 'Chest'], ['biceps', 'Biceps'], ['neck', 'Neck'], ['handRight', 'Right hand length'], ['handLeft', 'Left hand length']]
const FLARE: [MeasureKey, string][] = [['waist', 'Waist'], ['hip', 'Hip'], ['length', 'Length']]

function pointsFor(garment: string): [MeasureKey, string][] {
  const name = garment.toLowerCase()
  if (name.includes('pant') || name.includes('bottom')) return BOTTOM
  if (/lehenga|sharara|gown|dress|skirt/.test(name)) return FLARE
  return UPPER
}

type Draft = {
  garment: string
  customerId: string
  workType: 'Stitching' | 'Alteration' | 'Sale'
  urgent: boolean
  dueDate: string
  dueTime: string
  fittingDate: string
  fittingTime: string
  fittingDate2: string
  fittingTime2: string
  secondTrial: boolean
  unit: 'inch' | 'cm'
  points: Record<MeasureKey, string>
  price: string
  advance: string
  sidePocket: string
  pleats: string
  backPockets: string
}

let garmentPick = ''
let draftHold: Draft | null = null

export function holdGarment(garment: string) {
  garmentPick = garment
}

function emptyPoints(): Record<MeasureKey, string> {
  return { waist: '', seat: '', hip: '', calf: '', bottom: '', length: '', shoulder: '', chest: '', biceps: '', neck: '', handRight: '', handLeft: '' }
}

function stitchLine(draft: Draft) {
  return [
    draft.sidePocket.trim() ? `Side pocket: ${draft.sidePocket.trim()}` : '',
    draft.pleats.trim() ? `Pleats: ${draft.pleats.trim()}` : '',
    draft.backPockets.trim() ? `Back pockets: ${draft.backPockets.trim()}` : '',
  ].filter(Boolean).join('. ')
}

function billLines(order: Order, name: string, phone: string) {
  return [
    `Ladies Collection bill ${order.orderNo}`,
    'Sridevi',
    `${name} ${phone}`,
    `${order.garment} · ${order.workType}`,
    `Delivery ${formatWhen(order.dueDate, order.dueTime)}`,
    order.fittingDate ? `Trial ${formatWhen(order.fittingDate, order.fittingTime)}` : '',
    order.fittingDate2 ? `Second trial ${formatWhen(order.fittingDate2, order.fittingTime2)}` : '',
    order.stitchNote || '',
    `Total ${formatInr(order.price)}`,
    `Received ${formatInr(paidOf(order))}`,
    `Balance ${formatInr(balanceOf(order))}`,
  ].filter(Boolean).join('\n')
}

export function OrderFormScreen({ navigation }: NativeStackScreenProps<FloorParamList, 'OrderForm'>) {
  const { customers } = useShop()
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [workType, setWorkType] = useState<'Stitching' | 'Alteration' | 'Sale'>('Stitching')
  const [dueDate, setDueDate] = useState(todayIso())
  const [dueTime, setDueTime] = useState('15:30')
  const [fittingDate, setFittingDate] = useState(todayIso())
  const [fittingTime, setFittingTime] = useState('15:30')
  const [secondTrial, setSecondTrial] = useState(false)
  const [fittingDate2, setFittingDate2] = useState(addDays(todayIso(), 3))
  const [fittingTime2, setFittingTime2] = useState('15:30')
  const [unit, setUnit] = useState<'inch' | 'cm'>('inch')
  const [points, setPoints] = useState(emptyPoints())
  const [price, setPrice] = useState('4500')
  const [advance, setAdvance] = useState('1500')
  const [sidePocket, setSidePocket] = useState('')
  const [pleats, setPleats] = useState('')
  const [backPockets, setBackPockets] = useState('')
  const garment = garmentPick

  function review() {
    draftHold = {
      garment, customerId, workType, urgent: false, dueDate, dueTime, fittingDate, fittingTime,
      fittingDate2, fittingTime2, secondTrial, unit, points, price, advance, sidePocket, pleats, backPockets,
    }
    navigation.navigate('ConfirmOrder')
  }

  return (
    <Screen>
      <Title>Create order</Title>
      <Text style={styles.outfit}>{garment || 'Choose an outfit'}</Text>
      <Text style={styles.label}>Customer</Text>
      {customers.map(customer => (
        <Pressable key={customer.id} onPress={() => setCustomerId(customer.id)} style={[styles.choice, customerId === customer.id ? styles.choiceOn : null]}>
          <Text>{customer.name}</Text>
        </Pressable>
      ))}
      <View style={styles.row}>
        {(['Stitching', 'Alteration', 'Sale'] as const).map(item => (
          <Pressable key={item} onPress={() => setWorkType(item)} style={[styles.choice, workType === item ? styles.choiceOn : null]}>
            <Text>{item}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Measurements ({unit})</Text>
      <View style={styles.row}>
        <Pressable onPress={() => setUnit('inch')} style={[styles.choice, unit === 'inch' ? styles.choiceOn : null]}><Text>Inch</Text></Pressable>
        <Pressable onPress={() => setUnit('cm')} style={[styles.choice, unit === 'cm' ? styles.choiceOn : null]}><Text>Cm</Text></Pressable>
      </View>
      {pointsFor(garment).map(([key, label]) => (
        <Field key={key} label={label} value={points[key]} onChange={value => setPoints({ ...points, [key]: value })} />
      ))}
      <Text style={styles.label}>Stitch options</Text>
      <Field label="Side pocket" value={sidePocket} onChange={setSidePocket} />
      <Field label="Pleats" value={pleats} onChange={setPleats} />
      <Field label="Back pockets" value={backPockets} onChange={setBackPockets} />
      <Field label="Delivery date" value={dueDate} onChange={setDueDate} />
      <Field label="Delivery time" value={dueTime} onChange={setDueTime} />
      {workType !== 'Sale' ? (
        <>
          <Field label="Trial date" value={fittingDate} onChange={setFittingDate} />
          <Field label="Trial time" value={fittingTime} onChange={setFittingTime} />
          {secondTrial ? (
            <>
              <Field label="Second trial date" value={fittingDate2} onChange={setFittingDate2} />
              <Field label="Second trial time" value={fittingTime2} onChange={setFittingTime2} />
            </>
          ) : <Button label="+ Add trial date" quiet onPress={() => setSecondTrial(true)} />}
        </>
      ) : null}
      <Field label="Price (INR)" value={price} onChange={setPrice} />
      <Field label="Advance (INR)" value={advance} onChange={setAdvance} />
      <Button label="Review order" disabled={!garment || !customerId} onPress={review} />
    </Screen>
  )
}

export function ConfirmOrderScreen({ navigation }: NativeStackScreenProps<FloorParamList, 'ConfirmOrder'>) {
  const { customers, reload } = useShop()
  const draft = draftHold
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  if (!draft?.garment) return <Screen><Text>Choose an outfit first.</Text></Screen>
  const customer = customers.find(item => item.id === draft.customerId)
  const asked = new Set(pointsFor(draft.garment).map(([key]) => key))
  const number = (key: MeasureKey) => (asked.has(key) ? Number(draft.points[key] || 0) : 0)
  const rows = pointsFor(draft.garment).filter(([key]) => number(key) > 0)

  async function save() {
    setSaving(true)
    setError(null)
    const measurement = {
      label: draft!.garment,
      note: '',
      unit: draft!.unit,
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
    try {
      const order = await api.createOrder({
        customerId: draft!.customerId,
        garment: draft!.garment,
        workType: draft!.workType,
        saleMode: draft!.workType === 'Sale' ? 'product' : 'service',
        dueDate: draft!.dueDate,
        dueTime: draft!.dueTime,
        fittingDate: draft!.workType === 'Sale' ? null : draft!.fittingDate,
        fittingTime: draft!.fittingTime,
        fittingDate2: draft!.secondTrial ? draft!.fittingDate2 : null,
        fittingTime2: draft!.secondTrial ? draft!.fittingTime2 : '',
        price: Number(draft!.price),
        advance: Number(draft!.advance),
        method: 'Cash',
        sidePocket: draft!.sidePocket,
        pleats: draft!.pleats,
        backPockets: draft!.backPockets,
        measurement: rows.length > 0 ? measurement : undefined,
      })
      await reload()
      navigation.navigate('Bill', { orderId: order.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The order could not be saved.')
      setSaving(false)
    }
  }

  return (
    <Screen>
      <Title>Confirm order</Title>
      <Line label="Outfit" value={draft.garment} />
      <Line label="Customer" value={customer?.name || '—'} />
      <Line label="Type" value={draft.workType} />
      {rows.map(([key, label]) => <Line key={key} label={label} value={`${draft.points[key]} ${draft.unit}`} />)}
      <Line label="Stitch options" value={stitchLine(draft) || 'None'} />
      <Line label="Delivery" value={formatWhen(draft.dueDate, draft.dueTime)} />
      {draft.workType !== 'Sale' ? <Line label="Trial" value={formatWhen(draft.fittingDate, draft.fittingTime)} /> : null}
      {draft.secondTrial ? <Line label="Second trial" value={formatWhen(draft.fittingDate2, draft.fittingTime2)} /> : null}
      <Line label="Price" value={formatInr(Number(draft.price) || 0)} />
      <Line label="Advance" value={formatInr(Number(draft.advance) || 0)} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={saving ? 'Saving…' : 'Save and take payment'} disabled={saving || !customer} onPress={() => void save()} />
    </Screen>
  )
}

export function BillScreen({ route, navigation }: NativeStackScreenProps<FloorParamList, 'Bill'>) {
  const { customers, orders, recordPayment } = useShop()
  const order = orders.find(item => item.id === route.params.orderId)
  const customer = customers.find(item => item.id === order?.customerId)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PayMethod>('Cash')
  const [error, setError] = useState<string | null>(null)
  if (!order || !customer) return <Screen><Text>This bill is not ready.</Text></Screen>
  const bill = order
  const text = billLines(bill, customer.name, customer.phone)

  async function receive() {
    const value = Math.round(Number(amount))
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter the amount received.')
      return
    }
    try {
      await recordPayment(bill.id, { amount: value, method, note: 'Received with the bill' })
      setAmount('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The payment could not be saved.')
    }
  }

  return (
    <Screen>
      <Title>{`Bill ${bill.orderNo}`}</Title>
      <Text>Sridevi · Ladies Collection</Text>
      <Line label="Name" value={customer.name} />
      <Line label="Outfit" value={bill.garment} />
      <Line label="Delivery" value={formatWhen(bill.dueDate, bill.dueTime)} />
      <Line label="Trial" value={formatWhen(bill.fittingDate, bill.fittingTime)} />
      {bill.fittingDate2 ? <Line label="Second trial" value={formatWhen(bill.fittingDate2, bill.fittingTime2)} /> : null}
      {bill.stitchNote ? <Line label="Stitch options" value={bill.stitchNote} /> : null}
      <Line label="Total" value={formatInr(bill.price)} />
      <Line label="Received" value={formatInr(paidOf(bill))} />
      <Line label="Balance" value={formatInr(balanceOf(bill))} />
      <Field label="Amount received" value={amount} onChange={setAmount} />
      <View style={styles.row}>
        {(['Cash', 'UPI', 'Card'] as const).map(item => (
          <Pressable key={item} onPress={() => setMethod(item)} style={[styles.choice, method === item ? styles.choiceOn : null]}><Text>{item}</Text></Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Receive payment" onPress={() => void receive()} />
      <Button label="Send bill" quiet onPress={() => void Share.share({ title: `Bill ${bill.orderNo}`, message: text })} />
      <Button label="Print bill" quiet onPress={() => void Share.share({ title: `Print ${bill.orderNo}`, message: text })} />
      <Button label="Item status" quiet onPress={() => navigation.navigate('ItemStatus', { orderId: bill.id })} />
    </Screen>
  )
}

export function ItemStatusScreen({ route }: NativeStackScreenProps<FloorParamList, 'ItemStatus'>) {
  const { customers, orders, reload } = useShop()
  const order = orders.find(item => item.id === route.params.orderId)
  const customer = customers.find(item => item.id === order?.customerId)
  const [error, setError] = useState<string | null>(null)
  if (!order || !customer) return <Screen><Text>This item is not on the floor.</Text></Screen>
  const measure = order.measure ?? customer.measurements.find(set => set.label === order.garment)
  const reading = measure as (Partial<Record<MeasureKey, number>> & { unit?: string }) | undefined
  const rows = reading ? pointsFor(order.garment).filter(([key]) => Number(reading[key] ?? 0) > 0) : []

  return (
    <Screen>
      <Title>Item status</Title>
      <Text>{order.orderNo} · {customer.name}</Text>
      <View style={styles.split}>
        <View style={styles.flex}>
          {ITEM_STATUSES.map(status => (
            <Pressable
              key={status}
              onPress={() => {
                setError(null)
                void api.setStatus(order.id, status).then(() => reload()).catch(err => setError(err instanceof Error ? err.message : 'The status could not be saved.'))
              }}
              style={[styles.choice, order.itemStatus === status ? styles.choiceOn : null]}
            >
              <Text>{status}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.flex}>
          <Text style={styles.label}>Measurements</Text>
          <Text>{order.garment}</Text>
          {rows.length === 0 ? <Text style={styles.muted}>No measurements on this item.</Text> : rows.map(([key, label]) => (
            <Text key={key}>{label} {reading?.[key]} {reading?.unit === 'cm' ? 'cm' : 'inch'}</Text>
          ))}
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  )
}

export function CalendarScreen() {
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
  const dayOrders = orders.filter(order => order.dueDate === picked || order.fittingDate === picked || order.fittingDate2 === picked)
  const shift = (delta: number) => {
    const next = new Date(year || 1970, (monthIndex || 1) - 1 + delta, 1)
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <Screen>
      <Title>Calendar</Title>
      <View style={styles.row}>
        <Button label="Previous" quiet onPress={() => shift(-1)} />
        <Text>{first.toLocaleString('en', { month: 'long', year: 'numeric' })}</Text>
        <Button label="Next" quiet onPress={() => shift(1)} />
      </View>
      <View style={styles.grid}>
        {cells.map((day, index) => day ? (
          <Pressable key={iso(day)} onPress={() => setPicked(iso(day))} style={[styles.day, picked === iso(day) ? styles.choiceOn : null]}>
            <Text>{Number(day)}</Text>
          </Pressable>
        ) : <View key={`blank-${index}`} style={styles.day} />)}
      </View>
      <Text style={styles.label}>{formatDate(picked)}</Text>
      {dayOrders.length === 0 ? <Text style={styles.muted}>Nothing is due or on trial this day.</Text> : dayOrders.map(order => (
        <View key={order.id} style={styles.card}>
          <Text style={styles.outfit}>{customerName(customers, order.customerId)}</Text>
          <Text>{order.garment}</Text>
          {order.dueDate === picked ? <Text>Delivery {formatWhen(order.dueDate, order.dueTime)}</Text> : null}
          {order.fittingDate === picked ? <Text>Trial {formatWhen(order.fittingDate, order.fittingTime)}</Text> : null}
          {order.fittingDate2 === picked ? <Text>Second trial {formatWhen(order.fittingDate2, order.fittingTime2)}</Text> : null}
        </View>
      ))}
    </Screen>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={tokens.color.inkFaint} />
    </View>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return <Text>{label}: {value}</Text>
}

const styles = StyleSheet.create({
  outfit: { fontWeight: '700', color: tokens.color.ink, fontSize: 16 },
  label: { color: tokens.color.inkSoft, fontWeight: '700', marginTop: 8 },
  input: { backgroundColor: '#fff', borderColor: tokens.color.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: tokens.color.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  choice: { borderWidth: 1, borderColor: tokens.color.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  choiceOn: { borderColor: tokens.color.brass, borderWidth: 2 },
  error: { color: '#9f1239' },
  muted: { color: tokens.color.inkSoft },
  split: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: '14.28%', minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 4 },
})
