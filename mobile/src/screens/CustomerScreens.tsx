import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Button, Card, Field, Kicker, Muted, Screen, Title } from '../components/ui'
import { customerName, draftIsBlank, emptyDraft, formatDate, parseDraft, type MeasurementDraft } from '../data/shop'
import type { CustomerDetailProps } from '../navigation/types'
import { useShop } from '../state/ShopContext'
import { tokens } from '../theme/tokens'

const keys = ['chest', 'waist', 'hip', 'shoulder', 'sleeve', 'neck', 'inseam', 'length'] as const

export function CustomerListScreen({
  navigation,
}: {
  navigation: { navigate: (screen: 'CustomerDetail' | 'NewCustomer', params?: { customerId: string }) => void }
}) {
  const { customers } = useShop()
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return customers
    return customers.filter(customer => [customer.name, customer.city, customer.phone].join(' ').toLowerCase().includes(needle))
  }, [customers, query])

  return (
    <Screen>
      <Kicker>Measurements</Kicker>
      <Title>Customers</Title>
      <Button label="Add customer" onPress={() => navigation.navigate('NewCustomer')} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search name, city, or phone"
        placeholderTextColor={tokens.color.inkFaint}
        style={styles.search}
      />
      {filtered.map(customer => (
        <Pressable key={customer.id} style={styles.row} onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}>
          <Text style={styles.name}>{customer.name}</Text>
          <Muted>{`${customer.city} · ${customer.phone}`}</Muted>
        </Pressable>
      ))}
      {filtered.length === 0 ? <Muted>No one matches that search.</Muted> : null}
    </Screen>
  )
}

export function CustomerDetailScreen({ route, navigation }: CustomerDetailProps) {
  const { customers, orders, addMeasurement } = useShop()
  const customer = customers.find(item => item.id === route.params.customerId)
  const [draft, setDraft] = useState<MeasurementDraft>(emptyDraft())
  const [error, setError] = useState<string | null>(null)
  if (!customer) return <Screen><Muted>This customer is not in the book.</Muted></Screen>
  const person = customer
  const ownOrders = orders.filter(order => order.customerId === person.id)

  async function save() {
    const parsed = parseDraft(draft)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    try {
      await addMeasurement(person.id, parsed.value)
      setDraft(emptyDraft())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The measurement could not be saved.')
    }
  }

  return (
    <Screen>
      <Kicker>{person.city}</Kicker>
      <Title>{person.name}</Title>
      <Muted>{person.phone}</Muted>
      {person.measurements.map(set => (
        <Card key={set.id}>
          <Kicker>{formatDate(set.recordedOn)}</Kicker>
          <Text style={styles.name}>{set.label}</Text>
          <Muted>{`Chest ${set.chest} · Waist ${set.waist} · Hip ${set.hip} · Shoulder ${set.shoulder}`}</Muted>
          <Muted>{`Sleeve ${set.sleeve} · Neck ${set.neck} · Inseam ${set.inseam} · Length ${set.length} in`}</Muted>
          {set.note ? <Text>{set.note}</Text> : null}
        </Card>
      ))}
      <Text style={styles.name}>Orders</Text>
      {ownOrders.map(order => (
        <Pressable key={order.id} style={styles.row} onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}>
          <Text>{order.garment}</Text>
          <Muted>{`${order.orderNo} · ${order.stage}`}</Muted>
        </Pressable>
      ))}
      <Card>
        <Text style={styles.name}>New measurement set</Text>
        <Field label="Set name" value={draft.label} onChangeText={label => setDraft({ ...draft, label })} />
        <View style={styles.grid}>
          {keys.map(key => (
            <View key={key} style={styles.half}>
              <Field label={`${key} (in)`} value={draft[key]} keyboard="decimal-pad" onChangeText={value => setDraft({ ...draft, [key]: value })} />
            </View>
          ))}
        </View>
        <Field label="Note" value={draft.note} multiline onChangeText={note => setDraft({ ...draft, note })} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Save measurements" disabled={draftIsBlank(draft)} onPress={() => void save()} />
      </Card>
      <Muted>{customerName(customers, person.id)}</Muted>
    </Screen>
  )
}

const places = ['Lucknow Civil Lines', 'Amritsar Hall Bazaar', 'Delhi Khan Market', 'Bengaluru Jayanagar', 'Chennai Mylapore', 'Jaipur C-Scheme', 'Mumbai Bandra', 'Kochi Fort Kochi']

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'NA'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function NewCustomerScreen({
  navigation,
}: {
  navigation: { replace: (screen: 'CustomerDetail', params: { customerId: string }) => void }
}) {
  const { addCustomer } = useShop()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female'>('Female')
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [error, setError] = useState<string | null>(null)
  const matches = places.filter(place => address.trim() && place.toLowerCase().includes(address.trim().toLowerCase()))

  async function save() {
    if (name.trim().length < 2 || phone.replace(/\D/g, '').length < 8) {
      setError('Enter a full name and a phone number.')
      return
    }
    try {
      const created = await addCustomer({
        name,
        phone: `+91 ${phone.replace(/\D/g, '')}`,
        city: address.trim() || 'Lucknow',
        gender,
        email,
        birthDate,
        landmark,
      })
      navigation.replace('CustomerDetail', { customerId: created.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The customer could not be saved.')
    }
  }

  return (
    <Screen>
      <Title>Add new customer</Title>
      <View style={styles.initials}><Text style={styles.initialsText}>{initials(name)}</Text></View>
      <Field label="Full name" value={name} onChangeText={setName} />
      <Text style={styles.name}>Gender</Text>
      <View style={styles.grid}>
        {(['Male', 'Female'] as const).map(item => (
          <Pressable key={item} onPress={() => setGender(item)} style={[styles.choice, gender === item ? styles.choiceOn : null]}>
            <Text>{item}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Phone number +91" value={phone} keyboard="phone-pad" onChangeText={setPhone} />
      <Field label="Email" value={email} onChangeText={setEmail} />
      <Field label="Date of birth (YYYY-MM-DD)" value={birthDate} onChangeText={setBirthDate} />
      <Field label="Address" value={address} onChangeText={setAddress} />
      {matches.map(place => (
        <Pressable key={place} onPress={() => setAddress(place)}><Muted>{place}</Muted></Pressable>
      ))}
      <Field label="House number / landmark (optional)" value={landmark} onChangeText={setLandmark} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Save & continue" onPress={() => void save()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: tokens.color.paperRaised,
    borderColor: tokens.color.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: tokens.color.ink,
  },
  row: { paddingVertical: 12, borderBottomColor: tokens.color.line, borderBottomWidth: 1 },
  name: { fontWeight: '600', color: tokens.color.ink, fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  half: { width: '48%' },
  error: { color: tokens.color.alert },
  initials: { width: 84, height: 84, borderRadius: 42, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE4EE' },
  initialsText: { color: tokens.color.brass, fontSize: 22, fontWeight: '700' },
  choice: { borderWidth: 1, borderColor: tokens.color.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  choiceOn: { backgroundColor: tokens.color.brass, borderColor: tokens.color.brass },
})
