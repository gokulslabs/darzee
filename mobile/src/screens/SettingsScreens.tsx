import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { api } from '../api/client'
import { Card, Muted, Screen, Title } from '../components/ui'
import { formatInr, seedStaff, todayIso } from '../data/shop'
import { useSession } from '../state/Session'
import { useShop } from '../state/ShopContext'
import { tokens } from '../theme/tokens'

export function SettingsScreen({
  navigation,
}: {
  navigation: {
    navigate: (screen: 'Staff') => void
    getParent: () => { navigate: (screen: 'Customers') => void } | undefined
  }
}) {
  const { unit, setUnit, theme, setTheme } = useSession()
  return (
    <Screen>
      <Title>Profile</Title>
      <Card>
        <Text style={styles.name}>Sridevi</Text>
        <View style={styles.mark} accessibilityLabel="Ladies Collection"><Text style={styles.markText}>LC</Text></View>
      </Card>
      <Pressable onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={styles.row}>
        <Text>{theme === 'dark' ? 'Light' : 'Dark'}</Text>
      </Pressable>
      <View style={styles.row}><Text>Subscription</Text><Text style={styles.plan}>Workshop</Text></View>
      <Pressable onPress={() => navigation.navigate('Staff')} style={styles.row}><Text>Staff management</Text></Pressable>
      <Pressable onPress={() => navigation.getParent()?.navigate('Customers')} style={styles.row}><Text>Custom measurements</Text></Pressable>
      <View style={styles.row}>
        <View>
          <Text>Regional preferences</Text>
          <Muted>Currency INR</Muted>
        </View>
        <View style={styles.units}>
          <Pressable onPress={() => setUnit('inch')} style={[styles.unit, unit === 'inch' ? styles.unitOn : null]}><Text style={unit === 'inch' ? styles.unitOnText : null}>Inch</Text></Pressable>
          <Pressable onPress={() => setUnit('cm')} style={[styles.unit, unit === 'cm' ? styles.unitOn : null]}><Text style={unit === 'cm' ? styles.unitOnText : null}>Cm</Text></Pressable>
        </View>
      </View>
    </Screen>
  )
}

export function StaffScreen() {
  const [people, setPeople] = useState(seedStaff())
  useEffect(() => {
    void api.staff().then(setPeople).catch(() => setPeople(seedStaff()))
  }, [])
  return (
    <Screen>
      <Title>Staff</Title>
      {people.map(person => (
        <Card key={person.id}>
          <Text style={styles.name}>{person.name}</Text>
          <Muted>{person.role}</Muted>
        </Card>
      ))}
    </Screen>
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

export function DashboardScreen() {
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
  return (
    <Screen>
      <Title>Dashboard</Title>
      <Card>
        <View style={styles.monthRow}>
          <Pressable onPress={() => setMonth(current => shiftMonth(current, -1))} accessibilityLabel="Previous month"><Text style={styles.monthBtn}>‹</Text></Pressable>
          <Text style={styles.monthLabel}>{`Reporting ${monthLabel(month)}`}</Text>
          <Pressable onPress={() => setMonth(current => shiftMonth(current, 1))} accessibilityLabel="Next month"><Text style={styles.monthBtn}>›</Text></Pressable>
        </View>
        <View style={styles.metrics}>
          <View style={styles.metric}><Muted>Amount received</Muted><Text style={styles.received}>{formatInr(received)}</Text></View>
          <View style={styles.metric}><Muted>Sales</Muted><Text style={styles.sales}>{formatInr(sales)}</Text></View>
          <View style={styles.metric}><Muted>Orders received</Muted><Text style={styles.metricValue}>{due.length}</Text></View>
          <View style={styles.metric}><Muted>Orders closed</Muted><Text style={styles.metricValue}>{due.filter(order => order.itemStatus === 'Order completed' || order.itemStatus === 'Order delivered').length}</Text></View>
        </View>
      </Card>
      <Card>
        <View style={styles.monthRow}><Muted>Reporting sales</Muted><Text style={styles.metricValue}>{formatInr(sales)}</Text></View>
        <View style={styles.plot}>
          {weeks.map((value, index) => (
            <View key={index} style={styles.barCol}>
              <View style={[styles.bar, { height: Math.round((value / scale) * 110) }]} />
              <Muted>{`Week ${index + 1}`}</Muted>
            </View>
          ))}
        </View>
      </Card>
      <Card>
        <Text style={styles.metricValue}>Sales split</Text>
        <Muted>Stitching · Alteration</Muted>
        <View style={styles.pie}>
          <View style={styles.pieTrack} />
          {stitchShare > 0 ? (
            <View style={styles.pieRight}>
              <View style={[styles.pieFill, { transform: [{ translateX: -70 }, { rotate: `${Math.min(stitchShare * 360, 180)}deg` }, { translateX: 70 }] }]} />
            </View>
          ) : null}
          {stitchShare > 0.5 ? (
            <View style={styles.pieLeft}>
              <View style={[styles.pieFill, { left: 0, transform: [{ translateX: 70 }, { rotate: `${stitchShare * 360 - 180}deg` }, { translateX: -70 }] }]} />
            </View>
          ) : null}
          <View style={styles.pieHole}><Text style={styles.metricValue}>{(stitchShare * 100).toFixed(1)}%</Text></View>
        </View>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  name: { fontWeight: '700', color: tokens.color.ink, fontSize: 18 },
  mark: { width: 36, height: 36, borderRadius: 18, marginTop: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#F3D5E0' },
  markText: { color: '#E23D78', fontWeight: '700', fontSize: 13 },
  plan: { color: tokens.color.brass, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.line,
  },
  units: { flexDirection: 'row', gap: 8 },
  unit: { borderWidth: 1, borderColor: tokens.color.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  unitOn: { backgroundColor: tokens.color.brass, borderColor: tokens.color.brass },
  unitOnText: { color: '#fff', fontWeight: '700' },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  monthBtn: { color: '#E23D78', fontSize: 22, fontWeight: '700', paddingHorizontal: 8 },
  monthLabel: { color: tokens.color.inkSoft, flex: 1, textAlign: 'center' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { width: '46%' },
  metricValue: { color: tokens.color.ink, fontWeight: '700', fontSize: 16 },
  received: { color: '#2F5D45', fontWeight: '700', fontSize: 16 },
  sales: { color: '#D4534A', fontWeight: '700', fontSize: 16 },
  plot: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '70%', backgroundColor: '#E23D78', borderTopLeftRadius: 6, borderTopRightRadius: 6, marginBottom: 4 },
  pie: { width: 140, height: 140, alignSelf: 'center', marginTop: 8 },
  pieTrack: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#F2C14E' },
  pieRight: { position: 'absolute', width: 70, height: 140, left: 70, overflow: 'hidden' },
  pieLeft: { position: 'absolute', width: 70, height: 140, left: 0, overflow: 'hidden' },
  pieFill: { position: 'absolute', width: 140, height: 140, right: 0, borderRadius: 70, backgroundColor: '#B9A6F2' },
  pieHole: { position: 'absolute', width: 86, height: 86, borderRadius: 43, backgroundColor: '#fff', top: 27, left: 27, alignItems: 'center', justifyContent: 'center' },
})
