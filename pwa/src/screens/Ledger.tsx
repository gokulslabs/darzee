import { Link } from 'react-router-dom'
import { balanceOf, customerName, formatInr } from '../data/shop.ts'
import { useShop } from '../state/ShopContext.tsx'

export function Ledger() {
  const { customers, orders } = useShop()
  const due = orders.reduce((sum, order) => sum + Math.max(0, balanceOf(order)), 0)
  return (
    <>
      <p className="kicker">What is still owed</p>
      <h1>Ledger</h1>
      <p className="lede">{formatInr(due)} outstanding across the open book.</p>
      <div className="section">
        {orders.map(order => (
          <Link className="row" key={order.id} to={`/orders/${order.id}/invoice`}>
            <span>
              <b>{order.orderNo}</b>
              <span className="muted"> {customerName(customers, order.customerId)} · {order.garment}</span>
            </span>
            <span className="money">{formatInr(balanceOf(order))}</span>
          </Link>
        ))}
      </div>
    </>
  )
}
