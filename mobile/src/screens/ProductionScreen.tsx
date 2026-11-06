import { useMemo, useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Screen } from '../components/ui'
import { addDays, balanceOf, customerName, formatDate, formatInr, todayIso, type Order, type SaleMode } from '../data/shop'
import type { FloorParamList } from '../navigation/types'
import { useSession } from '../state/Session'
import { useShop } from '../state/ShopContext'
import { tokens } from '../theme/tokens'

type Period = 'Today' | 'Weekly' | 'All time'
type Focus = 'all' | 'delivery' | 'past' | 'trial'

function inMode(order: Order, mode: SaleMode) {
  if (mode === 'product') return order.saleMode === 'product'
  if (mode === 'service') return order.saleMode !== 'product'
  return true
}

function dueInWindow(order: Order, period: Period, today: string, weekEnd: string) {
  if (period === 'Today') return order.dueDate === today
  if (period === 'Weekly') return order.dueDate >= today && order.dueDate <= weekEnd
  return order.dueDate >= today
}

function trialInWindow(order: Order, period: Period, today: string, weekEnd: string) {
  if (!order.fittingDate) return false
  if (period === 'Today') return order.fittingDate === today
  if (period === 'Weekly') return order.fittingDate >= today && order.fittingDate <= weekEnd
  return true
}

function statusLabel(status: string) {
  return status === 'Order accepted' ? 'Accepted' : status
}

export function ProductionScreen({ navigation }: NativeStackScreenProps<FloorParamList, 'Floor'>) {
  const { customers, orders } = useShop()
  const { mode, setMode, ownerName } = useSession()
  const [period, setPeriod] = useState<Period>('Today')
  const [focus, setFocus] = useState<Focus>('all')
  const [outfit, setOutfit] = useState('')
  const [query, setQuery] = useState('')
  const today = todayIso()
  const weekEnd = addDays(today, 7)

  const view = useMemo(() => {
    const book = orders.filter(order => inMode(order, mode))
    const open = book.filter(order => order.itemStatus !== 'Order delivered')
    const deliveryCount = open.filter(order => dueInWindow(order, period, today, weekEnd)).length
    const pastCount = open.filter(order => order.dueDate < today).length
    const trialCount = open.filter(order => trialInWindow(order, period, today, weekEnd)).length
    const visible = book.filter(order => {
      if (focus === 'delivery' && !(dueInWindow(order, period, today, weekEnd) && order.itemStatus !== 'Order delivered')) return false
      if (focus === 'past' && !(order.dueDate < today && order.itemStatus !== 'Order delivered')) return false
      if (focus === 'trial' && !(trialInWindow(order, period, today, weekEnd) && order.itemStatus !== 'Order delivered')) return false
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
    const onBookDay = (date: string) => period === 'All time' || (period === 'Today' ? date === today : date >= today && date <= weekEnd)
    const received = book.filter(order => onBookDay(order.dueDate))
    const weekStart = addDays(today, -6)
    const newCustomers = customers.filter(customer => {
      const created = customer.createdAt ?? ''
      if (period === 'All time') return true
      if (!created) return false
      if (period === 'Today') return created === today
      return created >= weekStart && created <= today
    }).length
    return {
      visible,
      deliveryCount,
      pastCount,
      trialCount,
      count,
      ordersReceived: received.length,
      ordersDelivered: received.filter(order => order.itemStatus === 'Order delivered').length,
      pendingAmount: received.filter(order => balanceOf(order) > 0).reduce((sum, order) => sum + balanceOf(order), 0),
      newCustomers,
    }
  }, [customers, focus, mode, orders, outfit, period, query, today, weekEnd])

  return (
    <Screen>
      <View style={styles.hello}>
        <View style={styles.create}><Text style={styles.createText}>Workflow</Text></View>
        <Pressable accessibilityRole="button" style={styles.create} onPress={() => navigation.navigate('Outfit')}>
          <Text style={styles.createText}>Create order</Text>
        </Pressable>
      </View>
      <View style={styles.photo} />
      <View style={styles.shopId}>
        <Text style={styles.name}>{ownerName}</Text>
        <View style={styles.mark} accessibilityLabel="Ladies Collection"><Text style={styles.markText}>LC</Text></View>
      </View>
      <Text style={styles.muted}>Stitching and ready cloth, under one roof.</Text>
      <View style={styles.seg}>
        {([
          ['service', 'Service'],
          ['product', 'Product'],
          ['both', 'Both'],
        ] as const).map(([value, label]) => (
          <Pressable key={value} onPress={() => setMode(value)} style={[styles.segBtn, mode === value ? styles.segOn : null]}>
            <Text style={mode === value ? styles.segOnText : styles.segText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.muted}>Service is stitching or alteration. Product is a ready cloth sale. Both shows both.</Text>
      <View style={styles.seg}>
        {(['Today', 'Weekly', 'All time'] as const).map(item => (
          <Pressable key={item} onPress={() => setPeriod(item)} style={[styles.segBtn, period === item ? styles.segOn : null]}>
            <Text style={period === item ? styles.segOnText : styles.segText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row3}>
        <Chip label="Payment pending" value={view.pendingAmount} money />
        <Chip label="Orders received" value={view.ordersReceived} />
        <Chip label="New customers" value={view.newCustomers} />
        <Chip label="Orders delivered" value={view.ordersDelivered} />
      </View>
      <Pressable onPress={() => navigation.navigate('Calendar')}><Text style={styles.link}>Calendar</Text></Pressable>
      <View style={styles.row3}>
        <Chip label="Delivery due" value={view.deliveryCount} on={focus === 'delivery'} onPress={() => setFocus(focus === 'delivery' ? 'all' : 'delivery')} />
        <Chip label="Past due" value={view.pastCount} on={focus === 'past'} onPress={() => setFocus(focus === 'past' ? 'all' : 'past')} />
        <Chip label="Trials due" value={view.trialCount} on={focus === 'trial'} onPress={() => setFocus(focus === 'trial' ? 'all' : 'trial')} />
      </View>
      <Text style={styles.kicker}>In production</Text>
      <View style={styles.row4}>
        {[
          ['Kurta pajama', view.count('Kurta pajama')],
          ['Dress', view.count('Dress')],
          ['Blouse', view.count('Blouse')],
          ["Men's suit", view.count("Men's suit")],
        ].map(([label, value]) => (
          <Pressable key={String(label)} onPress={() => setOutfit(String(label))} style={[styles.amber, outfit === label ? styles.amberOn : null]}>
            <Text style={styles.amberLabel}>{label}</Text>
            <Text style={styles.amberValue}>{value}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.head}>
        <Text style={styles.items}>Items ({view.visible.length})</Text>
        <Text style={styles.link}>+ Create order</Text>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or order number"
        placeholderTextColor={tokens.color.inkFaint}
        style={styles.search}
      />
      {view.visible.map(order => (
        <View key={order.id} style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.name}>{customerName(customers, order.customerId)}</Text>
            <Text style={styles.status}>{statusLabel(order.itemStatus)}</Text>
            {order.urgent ? <Text style={styles.urgent}>Urgent</Text> : null}
          </View>
          <Text style={styles.muted}>Order no: {order.orderNo}</Text>
          <Text style={styles.body}>{order.garment} · {order.workType}</Text>
          <Text style={styles.body}>Trial date {order.fittingDate ? formatDate(order.fittingDate) : '—'}</Text>
          <Text style={styles.body}>Delivery date {formatDate(order.dueDate)}</Text>
          <Pressable onPress={() => navigation.navigate('JobSheet', { orderId: order.id })}>
            <Text style={styles.link}>Job sheet</Text>
          </Pressable>
        </View>
      ))}
      {view.visible.length === 0 ? <Text style={styles.muted}>No items in this view.</Text> : null}
    </Screen>
  )
}

function Chip({ label, value, on, onPress, money }: { label: string; value: number; on?: boolean; onPress?: () => void; money?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on ? styles.chipOn : null]}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{money ? formatInr(value) : value}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  hello: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  greet: { fontSize: 22, fontWeight: '700', color: tokens.color.ink },
  brand: { color: tokens.color.inkSoft, marginTop: 2 },
  mark: { width: 36, height: 36, borderRadius: 18, marginTop: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#F3D5E0' },
  markText: { color: '#E23D78', fontWeight: '700', fontSize: 13 },
  photo: { height: 120, borderRadius: 16, backgroundColor: '#F7D5E3', justifyContent: 'flex-end', padding: 12 },
  shopId: { marginTop: 8 },
  create: { backgroundColor: '#2F6FED', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  createText: { color: '#fff', fontWeight: '700' },
  seg: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segBtn: { borderWidth: 1, borderColor: tokens.color.line, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  segOn: { backgroundColor: '#2F6FED', borderColor: '#2F6FED' },
  segText: { color: tokens.color.ink },
  segOnText: { color: '#fff', fontWeight: '700' },
  row3: { flexDirection: 'row', gap: 8 },
  row4: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: tokens.color.line, borderRadius: 12, padding: 10 },
  chipOn: { borderColor: '#2F6FED', borderWidth: 2 },
  chipLabel: { color: tokens.color.inkSoft, fontSize: 12 },
  chipValue: { fontSize: 22, fontWeight: '700', color: tokens.color.ink },
  kicker: { color: '#2F6FED', letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12, fontWeight: '700' },
  amber: { width: '23%', minWidth: 72, backgroundColor: '#FFF0F5', borderRadius: 12, padding: 8 },
  amberOn: { borderWidth: 2, borderColor: '#2F6FED' },
  amberLabel: { color: '#8A4B08', fontSize: 12 },
  amberValue: { color: '#8A4B08', fontSize: 20, fontWeight: '700' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  items: { fontSize: 18, fontWeight: '700', color: tokens.color.ink },
  link: { color: '#1D4FB8', fontWeight: '700' },
  search: {
    backgroundColor: '#fff',
    borderColor: tokens.color.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: tokens.color.ink,
  },
  card: { backgroundColor: '#fff', borderColor: tokens.color.line, borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  cardTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  name: { fontWeight: '700', color: tokens.color.ink, fontSize: 16 },
  status: { color: '#1D4FB8' },
  urgent: { color: '#9A3412', fontWeight: '700' },
  muted: { color: tokens.color.inkSoft },
  body: { color: tokens.color.ink },
})
