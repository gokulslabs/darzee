import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { jobSheetPdf } from './pdf.ts'
import {
  addMeasurement,
  advanceOrder,
  createCustomer,
  ensureSeed,
  getCustomer,
  getOrder,
  jobSheetDocument,
  listCustomers,
  listOrders,
  assignOrder,
  createOrder,
  listMoves,
  listRolls,
  listStaff,
  moveStock,
  recordPayment,
  setItemStatus,
  StoreError,
} from './store.ts'

const port = Number(process.env.PORT) || 4000

function sendPdf(res: ServerResponse, filename: string, bytes: Buffer): void {
  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Disposition',
    'Content-Length': bytes.length,
  })
  res.end(bytes)
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}
  return JSON.parse(raw) as unknown
}

function pathOf(req: IncomingMessage): string {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = url.pathname.replace(/\/+$/, '')
  return path || '/'
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  const path = pathOf(req)
  const parts = path.split('/').filter(Boolean)
  const method = req.method ?? 'GET'

  if (method === 'GET' && path === '/health') {
    await listCustomers()
    send(res, 200, { ok: true, store: 'supabase' })
    return
  }
  if (method === 'GET' && path === '/customers') {
    send(res, 200, await listCustomers())
    return
  }
  if (method === 'GET' && parts[0] === 'customers' && parts[1] && parts.length === 2) {
    send(res, 200, await getCustomer(parts[1]))
    return
  }
  if (method === 'POST' && path === '/customers') {
    const body = (await readJson(req)) as {
      name?: unknown
      phone?: unknown
      city?: unknown
      measurement?: unknown
    }
    send(res, 201, await createCustomer(body))
    return
  }
  if (method === 'POST' && parts[0] === 'customers' && parts[1] && parts[2] === 'measurements' && parts.length === 3) {
    send(res, 201, await addMeasurement(parts[1], await readJson(req)))
    return
  }
  if (method === 'GET' && path === '/orders') {
    send(res, 200, await listOrders())
    return
  }
  if (method === 'GET' && parts[0] === 'orders' && parts[1] && parts[2] === 'job.pdf') {
    const document = await jobSheetDocument(parts[1])
    sendPdf(res, document.filename, jobSheetPdf(document.lines))
    return
  }
  if (method === 'GET' && parts[0] === 'orders' && parts[1] && parts.length === 2) {
    send(res, 200, await getOrder(parts[1]))
    return
  }
  if (method === 'POST' && parts[0] === 'orders' && parts[1] && parts[2] === 'advance' && parts.length === 3) {
    send(res, 200, await advanceOrder(parts[1]))
    return
  }
  if (method === 'GET' && path === '/staff') {
    send(res, 200, await listStaff())
    return
  }
  if (method === 'GET' && path === '/inventory') {
    send(res, 200, { rolls: await listRolls(), moves: await listMoves() })
    return
  }
  if (method === 'POST' && parts[0] === 'inventory' && parts[1] && parts[2] === 'move') {
    send(res, 200, await moveStock(parts[1], (await readJson(req)) as Record<string, unknown>))
    return
  }
  if (method === 'POST' && path === '/orders') {
    send(res, 201, await createOrder((await readJson(req)) as Record<string, unknown>))
    return
  }
  if (method === 'POST' && parts[0] === 'orders' && parts[1] && parts[2] === 'status') {
    const body = (await readJson(req)) as { status?: unknown }
    send(res, 200, await setItemStatus(parts[1], String(body.status ?? '')))
    return
  }
  if (method === 'POST' && parts[0] === 'orders' && parts[1] && parts[2] === 'assign') {
    const body = (await readJson(req)) as { assignee?: unknown }
    send(res, 200, await assignOrder(parts[1], String(body.assignee ?? '')))
    return
  }
  if (method === 'POST' && parts[0] === 'orders' && parts[1] && parts[2] === 'payments' && parts.length === 3) {
    const body = (await readJson(req)) as { amount?: unknown; method?: unknown; note?: unknown }
    send(res, 200, await recordPayment(parts[1], body))
    return
  }

  send(res, 404, { error: 'Not found' })
}

const server = createServer((req, res) => {
  route(req, res).catch(error => {
    if (error instanceof StoreError) {
      send(res, error.status, { error: error.message })
      return
    }
    if (error instanceof SyntaxError) {
      send(res, 400, { error: 'Send JSON.' })
      return
    }
    console.error(error instanceof Error ? error.message : 'Request failed')
    send(res, 500, { error: 'The floor book could not be updated.' })
  })
})

await ensureSeed()
server.listen(port, () => {
  console.log(`Tailor API listening on http://localhost:${port}`)
})
