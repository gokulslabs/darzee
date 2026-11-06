import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Button, Card, Field, Kicker, Muted, Pill, Screen, Title } from '../components/ui'
import {
  atelier,
  balanceOf,
  customerName,
  formatDate,
  formatInr,
  nextStage,
  paidOf,
  STAGES,
  type PayMethod,
  type Stage,
} from '../data/shop'
import type { DetailProps } from '../navigation/types'
import { useShop } from '../state/ShopContext'
import { tokens } from '../theme/tokens'

export function OrderListScreen({
  navigation,
}: {
  navigation: { navigate: (screen: 'OrderDetail', params: { orderId: string }) => void }
}) {
  const { customers, orders } = useShop()
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<Stage | 'All'>('All')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return orders.filter(order => {
      const name = customerName(customers, order.customerId).toLowerCase()
      const matches = !needle || [order.orderNo, order.garment, name].join(' ').toLowerCase().includes(needle)
      return matches && (stage === 'All' || order.stage === stage)
    })
  }, [customers, orders, query, stage])

  return (
    <Screen>
      <Kicker>Work in hand</Kicker>
      <Title>Orders</Title>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search order, garment, or customer" placeholderTextColor={tokens.color.inkFaint} style={styles.search} />
      <View style={styles.chips}>
        {(['All', ...STAGES] as const).map(item => (
          <Pressable key={item} onPress={() => setStage(item)} style={[styles.chip, item === stage ? styles.chipOn : null]}>
            <Text style={item === stage ? styles.chipOnText : styles.chipText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      {filtered.map(order => (
        <Pressable key={order.id} style={styles.row} onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}>
          <Text style={styles.name}>{order.garment}</Text>
          <Muted>{`${customerName(customers, order.customerId)} · due ${formatDate(order.dueDate)}`}</Muted>
          <Text>{formatInr(balanceOf(order))} · {order.stage}</Text>
        </Pressable>
      ))}
    </Screen>
  )
}

export function OrderDetailScreen({ route, navigation }: DetailProps) {
  const { customers, orders, advanceStage } = useShop()
  const order = orders.find(item => item.id === route.params.orderId)
  const [error, setError] = useState<string | null>(null)
  if (!order) return <Screen><Muted>This order is not in the book.</Muted></Screen>
  const upcoming = nextStage(order.stage)

  return (
    <Screen>
      <Kicker>{order.orderNo}</Kicker>
      <Title>{order.garment}</Title>
      <Muted>{`${customerName(customers, order.customerId)} · due ${formatDate(order.dueDate)}`}</Muted>
      <Pill label={order.stage} />
      <Card>
        <Muted>{`Price ${formatInr(order.price)}`}</Muted>
        <Muted>{`Paid ${formatInr(paidOf(order))}`}</Muted>
        <Text style={styles.balance}>{formatInr(balanceOf(order))} balance</Text>
      </Card>
      {order.notes ? <Text>{order.notes}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={upcoming ? `Move to ${upcoming}` : 'Ready for collection'}
        disabled={!upcoming}
        onPress={() => {
          void advanceStage(order.id).catch(err => setError(err instanceof Error ? err.message : 'The stage could not be updated.'))
        }}
      />
      <Button label="Open invoice" quiet onPress={() => navigation.navigate('Invoice', { orderId: order.id })} />
      <Button label="Job sheet" quiet onPress={() => navigation.navigate('JobSheet', { orderId: order.id })} />
    </Screen>
  )
}

export function InvoiceScreen({ route }: { route: { params: { orderId: string } } }) {
  const { customers, orders, recordPayment } = useShop()
  const order = orders.find(item => item.id === route.params.orderId)
  const customer = customers.find(item => item.id === order?.customerId)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PayMethod>('UPI')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!order) return <Screen><Muted>This invoice is not in the book.</Muted></Screen>
  const bill = order
  const balance = balanceOf(bill)

  async function save() {
    const value = Math.round(Number(amount))
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    try {
      await recordPayment(bill.id, { amount: value, method, note })
      setAmount('')
      setNote('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The payment could not be saved.')
    }
  }

  return (
    <Screen>
      <Text style={styles.mark}>Tailor</Text>
      <Muted>{`${atelier.street}, ${atelier.city}`}</Muted>
      <Kicker>Invoice</Kicker>
      <Title>{bill.orderNo}</Title>
      <Text style={styles.name}>{customer?.name ?? customerName(customers, bill.customerId)}</Text>
      {customer ? <Muted>{`${customer.city} · ${customer.phone}`}</Muted> : null}
      <Card>
        <Text>{bill.garment} · {formatInr(bill.price)}</Text>
        {bill.payments.map(payment => (
          <Muted key={payment.id}>{`${formatDate(payment.date)} · ${payment.method} · ${formatInr(payment.amount)}`}</Muted>
        ))}
        <Text style={styles.balance}>{formatInr(balance)}</Text>
        <Kicker>Balance due</Kicker>
      </Card>
      {balance > 0 ? (
        <Card>
          <Field label="Amount (INR)" value={amount} keyboard="number-pad" onChangeText={setAmount} />
          <View style={styles.chips}>
            {(['UPI', 'Cash', 'Card'] as const).map(item => (
              <Pressable key={item} onPress={() => setMethod(item)} style={[styles.chip, item === method ? styles.chipOn : null]}>
                <Text style={item === method ? styles.chipOnText : styles.chipText}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Note" value={note} onChangeText={setNote} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Record payment" onPress={() => void save()} />
        </Card>
      ) : (
        <Muted>Settled.</Muted>
      )}
    </Screen>
  )
}

export function LedgerScreen({
  navigation,
}: {
  navigation: { navigate: (screen: 'Invoice', params: { orderId: string }) => void }
}) {
  const { customers, orders } = useShop()
  const due = orders.reduce((sum, order) => sum + Math.max(0, balanceOf(order)), 0)
  return (
    <Screen>
      <Kicker>What is still owed</Kicker>
      <Title>Ledger</Title>
      <Muted>{`${formatInr(due)} outstanding across the open book.`}</Muted>
      {orders.map(order => (
        <Pressable key={order.id} style={styles.row} onPress={() => navigation.navigate('Invoice', { orderId: order.id })}>
          <Text style={styles.name}>{order.orderNo}</Text>
          <Muted>{`${customerName(customers, order.customerId)} · ${order.garment}`}</Muted>
          <Text>{formatInr(balanceOf(order))}</Text>
        </Pressable>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  search: { backgroundColor: tokens.color.paperRaised, borderColor: tokens.color.line, borderWidth: 1, borderRadius: 12, padding: 12, color: tokens.color.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: tokens.color.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { borderColor: tokens.color.brass },
  chipText: { color: tokens.color.ink },
  chipOnText: { color: tokens.color.brass },
  row: { paddingVertical: 12, borderBottomColor: tokens.color.line, borderBottomWidth: 1, gap: 2 },
  name: { fontWeight: '600', color: tokens.color.ink, fontSize: 16 },
  balance: { fontFamily: tokens.font.serif, fontSize: 28, color: tokens.color.ink },
  mark: { fontFamily: tokens.font.serif, fontStyle: 'italic', fontSize: 28, color: tokens.color.ink },
  error: { color: tokens.color.alert },
})
