import { useState } from 'react'
import { Linking, Text } from 'react-native'
import { Button, Card, Muted, Screen, Title } from '../components/ui'
import { API_BASE } from '../api/client'
import { customerName, formatDate } from '../data/shop'
import { useShop } from '../state/ShopContext'

export function JobSheetScreen({ route }: { route: { params: { orderId: string } } }) {
  const { customers, orders } = useShop()
  const order = orders.find(item => item.id === route.params.orderId)
  const customer = customers.find(item => item.id === order?.customerId)
  const [error, setError] = useState<string | null>(null)
  if (!order || !customer) return <Screen><Muted>This job sheet is missing.</Muted></Screen>
  const measure = customer.measurements[0]
  const fileUrl = `${API_BASE}/orders/${order.id}/job.pdf`

  return (
    <Screen>
      <Title>Job sheet</Title>
      <Card>
        <Text>{`Order number ${order.orderNo}`}</Text>
        <Text>{`Customer ${customerName(customers, order.customerId)}`}</Text>
        <Text>{`Stage ${order.itemStatus}`}</Text>
        <Text>{`Trial ${order.fittingDate ? formatDate(order.fittingDate) : 'None'}`}</Text>
        <Text>{`Delivery ${formatDate(order.dueDate)}`}</Text>
        {measure ? <Muted>{`Waist ${measure.waist} · Seat ${measure.seat} · Chest ${measure.chest} · Length ${measure.length} ${measure.unit}`}</Muted> : <Muted>No measurements on file.</Muted>}
      </Card>
      {error ? <Text>{error}</Text> : null}
      <Button
        label="Download PDF"
        onPress={() => {
          void Linking.openURL(fileUrl).catch(() => setError('The job sheet could not be downloaded.'))
        }}
      />
    </Screen>
  )
}
