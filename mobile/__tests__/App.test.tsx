import { balanceOf, createSeed, nextStage } from '../src/data/shop'

test('seed balances and the stage order', () => {
  const { orders } = createSeed()
  const sherwani = orders.find(order => order.orderNo === 'SL-1041')
  expect(sherwani).toBeTruthy()
  expect(balanceOf(sherwani!)).toBe(13500)
  expect(nextStage('Cutting')).toBe('Stitching')
  expect(nextStage('Ready')).toBeNull()
})
