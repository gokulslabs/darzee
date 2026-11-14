import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const [pdfPath, previousPath, backupPath] = process.argv.slice(2)
if (!pdfPath || !previousPath || !backupPath) throw new Error('Provide extracted PDF JSON, previous JSON, and backup path.')
const pdf = JSON.parse(fs.readFileSync(pdfPath, 'utf8'))
const previous = JSON.parse(fs.readFileSync(previousPath, 'utf8'))
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const owner = process.env.SHOP_USER_ID || undefined
const key = c => `${c.name.toLowerCase().trim()}|${String(c.phone || '').replace(/\D/g, '')}`
const priorByKey = new Map(previous.customers.map(c => [key(c), c]))
const missing = pdf.customers.filter(c => !priorByKey.has(key(c)))
const withOwner = row => owner ? { ...row, user_id: owner } : row

async function checked(query, message) {
  const result = await query
  if (result.error) throw new Error(`${message}: ${result.error.message}`)
  return result.data
}

const backup = []
for (let start = 0; ; start += 1000) {
  const rows = await checked(client.from('customer_measurement_sets').select('*').range(start, start + 999), 'Back up current sets')
  backup.push(...rows)
  if (rows.length < 1000) break
}
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))
console.log(`Backed up ${backup.length} current sets`)

for (let start = 0; start < missing.length; start += 100) {
  const rows = missing.slice(start, start + 100).map(c => withOwner({
    id: `lc_pdf_${c.number}`,
    name: c.name,
    phone: c.phone,
    city: c.address,
    book_no: c.bookNo || null,
    created_at: new Date().toISOString(),
  }))
  await checked(client.from('customers').upsert(rows, { onConflict: 'id' }), 'Insert additional customers')
}

const sets = pdf.customers.flatMap(c => {
  const sourceId = priorByKey.get(key(c))?.sourceCustomerId || `pdf_${c.number}`
  const customerId = `lc_${sourceId}`
  return c.orders.map((order, index) => withOwner({
    id: `${customerId}_pdf_${order.orderNo || index + 1}`,
    source_customer_id: sourceId,
    customer_id: customerId,
    garment: order.garment,
    measurements: order.measurements,
  }))
})
if (new Set(sets.map(set => set.id)).size !== sets.length) throw new Error('Duplicate order identifiers in extracted PDF.')
for (let start = 0; start < sets.length; start += 50) {
  await checked(client.from('customer_measurement_sets').upsert(sets.slice(start, start + 50), { onConflict: 'id' }), `Import sets ${start + 1}-${Math.min(start + 50, sets.length)}`)
  if (start % 500 === 0) console.log(`Imported ${Math.min(start + 50, sets.length)}/${sets.length} sets`)
}

const oldIds = backup.filter(set => /^lc_.+_\d+$/.test(set.id)).map(set => set.id)
for (let start = 0; start < oldIds.length; start += 100) {
  await checked(client.from('customer_measurement_sets').delete().in('id', oldIds.slice(start, start + 100)), `Remove replaced partial sets ${start + 1}`)
}
console.log(JSON.stringify({ pdfCustomers: pdf.customers.length, addedCustomers: missing.length, importedSets: sets.length, replacedPartialSets: oldIds.length, measurementValues: sets.reduce((sum, set) => sum + set.measurements.length, 0) }))
