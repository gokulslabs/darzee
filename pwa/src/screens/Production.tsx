import { useState } from 'react'
import { Link } from 'react-router-dom'
import { customerName, formatDate, formatWeekday, nextStage, STAGES, todayIso } from '../data/shop.ts'
import { useShop } from '../state/ShopContext.tsx'

export function Production() {
  const { customers, orders, advanceStage } = useShop()
  const [error, setError] = useState<string | null>(null)
  const today = todayIso()
  const underNeedle = orders.filter(order => order.stage === 'Stitching').length
  const dueToday = orders.filter(order => order.dueDate === today && order.stage !== 'Ready').length
  const waitingTrial = orders.filter(order => order.stage === 'Trial').length

  async function advance(orderId: string) {
    setError(null)
    try {
      await advanceStage(orderId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The piece could not be moved.')
    }
  }

  return (
    <>
      <p className="kicker">Today's stitching</p>
      <div className="page-head">
        <div>
          <h1>On the needle</h1>
          <p className="lede">
            {formatWeekday()}. {underNeedle} {underNeedle === 1 ? 'piece' : 'pieces'} under the needle. {dueToday} due today. {waitingTrial} waiting for trial.
          </p>
        </div>
      </div>
      <section className="stats three">
        <article className="stat dominant"><span>Under the needle</span><strong>{underNeedle}</strong></article>
        <article className="stat"><span>Due today</span><strong>{dueToday}</strong></article>
        <article className="stat"><span>Waiting for trial</span><strong>{waitingTrial}</strong></article>
      </section>
      {error ? <p className="error">{error}</p> : null}
      <div className="floor">
        {STAGES.map(stage => (
          <section className={stage === 'Stitching' ? 'card bench dominant' : 'card bench'} key={stage}>
            <h2>{stage}</h2>
            {orders.filter(order => order.stage === stage).length === 0 ? <p className="muted">Nothing on this bench.</p> : null}
            {orders.filter(order => order.stage === stage).map(order => {
              const upcoming = nextStage(order.stage)
              const customer = customers.find(item => item.id === order.customerId)
              return (
                <article className="garment" key={order.id}>
                  <p className="outfit">{order.garment}</p>
                  <p>{customer?.name ?? customerName(customers, order.customerId)}</p>
                  <p className="muted">{order.dueDate === today ? 'Due today' : `Due ${formatDate(order.dueDate)}`}</p>
                  <p><span className={stage === 'Stitching' ? 'pill brass' : 'pill'}>{order.stage}</span></p>
                  {upcoming ? (
                    <button className="btn" type="button" onClick={() => void advance(order.id)}>Move to {upcoming}</button>
                  ) : (
                    <p className="muted">Ready to hand over</p>
                  )}
                  <p className="side-links">
                    <Link to={`/customers/${order.customerId}`}>Measurements</Link>
                    <Link to={`/orders/${order.id}/invoice`}>Balance</Link>
                  </p>
                </article>
              )
            })}
          </section>
        ))}
      </div>
    </>
  )
}
