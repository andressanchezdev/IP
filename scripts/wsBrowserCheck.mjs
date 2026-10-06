import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Uso: con 'npm run dev' corriendo -> node scripts/wsBrowserCheck.mjs  (necesita Chrome o Edge instalado)
const APP = process.env.APP_URL || 'http://localhost:3000/'
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p))

const PORT = 9333
const profile = mkdtempSync(path.join(tmpdir(), 'cdp-'))
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=1400,1000', 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let passed = 0
const failures = []
const check = (name, ok, extra) => {
  if (ok) { passed += 1; console.log('  OK   ', name) } else { failures.push(name); console.log('  FALLA', name, extra !== undefined ? JSON.stringify(extra) : '') }
}

async function main() {
  // --- conectar CDP
  let targets
  for (let i = 0; i < 40; i += 1) {
    try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.some((t) => t.type === 'page')) break } catch { /* espera */ }
    await sleep(250)
  }
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => { ws.onopen = r })
  let nextId = 1
  const pending = new Map()
  const handlers = []
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result) }
    else if (msg.method) handlers.forEach((h) => h(msg))
  }
  const send = (method, params = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    return r.result.value
  }
  const waitFor = async (fn, timeoutMs = 8000, step = 150) => {
    const t0 = Date.now()
    while (Date.now() - t0 < timeoutMs) { const v = await fn(); if (v) return v; await sleep(step) }
    return null
  }

  // --- API simulado (el WS es el REAL)
  const state = { cartRows: [], apiCalls: [] }
  const product = {
    id_producto: 11184, descripcion: 'FILTRO ACEITE TEST', categoria: 'FILTROS', marca: 'TEST', modelo: 'X1', codigo: 'REF11184',
    precio: 15000, iva: 19, exento: 0, compra: 5000, imagen_producto: [],
    stock: { 1: [{ ubicacion: 'C-12', cantidad: 10, cantidadAux: 3 }] },
  }
  const cors = [
    { name: 'access-control-allow-origin', value: '*' }, { name: 'access-control-allow-headers', value: '*' },
    { name: 'access-control-allow-methods', value: '*' }, { name: 'content-type', value: 'application/json' },
  ]
  const json = (o) => Buffer.from(JSON.stringify(o)).toString('base64')
  handlers.push(async (msg) => {
    if (msg.method !== 'Fetch.requestPaused') return
    const { requestId, request } = msg.params
    const u = new URL(request.url)
    let body = {}
    if (request.method === 'OPTIONS') {
      return send('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: cors, body: '' }).catch(() => {})
    }
    state.apiCalls.push(`${request.method} ${u.pathname}`)
    if (u.pathname.endsWith('/api/v1/general')) body = { data: { productos: [product], carrito: state.cartRows }, meta: { has_more: false } }
    else if (u.pathname.includes('/inventory/carts')) body = { data: state.cartRows, meta: { has_more: false } }
    else if (u.pathname.includes('/inventory/products')) body = { data: { productos: [product] }, meta: { has_more: false } }
    return send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: cors, body: json(body) }).catch(() => {})
  })

  // --- diagnóstico
  const consoleErrors = []
  const realFrames = []
  const wsWarnings = []
  handlers.push((msg) => {
    if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push('EXC ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text).slice(0, 300))
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') consoleErrors.push('console.error ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300))
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'warning') wsWarnings.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200))
    if (msg.method === 'Network.webSocketFrameReceived') realFrames.push(msg.params.response.payloadData.slice(0, 120))
  })

  await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: '*importadorapremium.com/client-api/*' }] })
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      const Native = window.WebSocket;
      window.__sockets = [];
      window.WebSocket = class extends Native {
        constructor(...a) {
          super(...a);
          const t = { url: String(a[0]), created: Date.now() };
          this.__t = t;
          this.addEventListener('open', () => { t.open = Date.now(); });
          this.addEventListener('close', (e) => { t.close = Date.now(); t.code = e.code; });
          if (t.url.includes('importadorapremium')) window.__sockets.push(this);
        }
      };    })()`,
  })

  // --- 1) cargar la app y crear la sesión de prueba con el propio módulo de la app
  console.log('\n[1] Carga de la app (servidor de desarrollo real)')
  await send('Page.navigate', { url: APP })
  await waitFor(() => evaluate("document.readyState === 'complete'"), 20000)
  await sleep(1500)
  await evaluate(`(async () => {
    const m = await import('/src/features/auth/utils/authStorage.js');
    await m.saveAuthSession({
      username: 'prueba@test.com', email: 'prueba@test.com', userId: 1547, tokenAccess: 'fake-token', refreshToken: null,
      displayName: 'Prueba', loggedInAt: new Date().toISOString(),
    }, true);
    return true;
  })()`)
  await send('Page.reload')
  await sleep(1000)
  await waitFor(() => evaluate("document.readyState === 'complete'"), 20000)

  const labelOf = () => evaluate(`(() => { const b = document.querySelector('.product-card__order'); return b ? b.textContent.trim() : null })()`)
  const first = await waitFor(labelOf, 15000)
  check('la app arranca y muestra la card del producto (sesión de prueba)', Boolean(first), { consoleErrors: consoleErrors.slice(0, 3) })
  check('stock libre 3 y no está en el carrito -> botón "Ordenar"', first === 'Ordenar', first)

  // --- 2) conexión real
  console.log('\n[2] Conexión al WebSocket real desde el navegador')
  const connected = await waitFor(() => evaluate('window.__sockets.some((s) => s.readyState === 1)'), 12000)
  check('hay un socket ABIERTO contra wss://api.importadorapremium.com/wss2/', Boolean(connected), await evaluate('window.__sockets.map((s) => [s.url, s.readyState])'))
  const urls = await evaluate('[...new Set(window.__sockets.map((s) => s.url))]')
  check('todos los sockets apuntan a la URL correcta', urls.length === 1 && urls[0] === 'wss://api.importadorapremium.com/wss2/', urls)
  const created10 = await evaluate('window.__sockets.length')
  console.log('   sockets creados hasta ahora:', created10)
  await sleep(6000)
  const created16 = await evaluate('window.__sockets.length')
  check('sin reconexiones en bucle (los sockets creados no crecen mientras está estable)', created16 === created10, { created10, created16 })
  check('llegan frames reales del servidor', realFrames.length > 0 || (await waitFor(() => realFrames.length > 0, 15000)), realFrames.length)

  // --- 3) mensajes del WS -> botón
  console.log('\n[3] Mensajes del WS inyectados en el socket de la app -> estado del botón')
  const inject = (obj) => evaluate(`(() => { const s = window.__sockets.filter((x) => x.readyState === 1).at(-1); s.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(JSON.stringify(obj))} })); return true })()`)
  const lis = (aux) => JSON.stringify({ 1: [{ ubicacion: 'C-12', cantidad: 10, cantidadAux: aux }] })
  const expectLabel = async (name, want, ms = 4000) => {
    const got = await waitFor(async () => (await labelOf()) === want, ms, 100) ? want : await labelOf()
    check(name, got === want, got)
  }

  await inject({ tipo: 'stock carrito', idProducto: 11184, idBodega: '1', listado: lis(0), carrito: { id_producto: 11184, id_usuario: 694, cantidad: 3, id_bodega: '1' } })
  await expectLabel('otro cliente ordena todo -> "Agotado" sin recargar', 'Agotado')

  await inject({ tipo: 'stock eliminar', idProducto: 11184, idBodega: '1', listado: lis(2) })
  await expectLabel('otro cliente lo saca de su carrito (2 libres) -> "Ordenar"', 'Ordenar')

  const callsBefore = state.apiCalls.length
  state.cartRows = [{ id_carrito: 901, id_producto: 11184, id_usuario: 1547, cantidad: 2, precio_unitario: 15000, descripcion: 'FILTRO ACEITE TEST', marca: 'TEST', modelo: 'X1', codigo: 'REF11184' }]
  await inject({ tipo: 'stock carrito', idProducto: 11184, idBodega: '1', listado: lis(0), carrito: { id_producto: 11184, id_usuario: 1547, cantidad: 2, id_bodega: '1' } })
  await expectLabel('MI otro dispositivo lo agrega -> el evento deja el botón en "Ordenado"', 'Ordenado', 6000)
  check('  no hace GET de respaldo: el payload del socket actualiza el carrito', !state.apiCalls.slice(callsBefore).some((c) => c.includes('/inventory/carts')), state.apiCalls.slice(callsBefore))

  state.cartRows = []
  await inject({ tipo: 'stock eliminar', idProducto: 11184, idBodega: '1', listado: lis(2), carrito: { id_producto: 11184, id_usuario: 1547, cantidad: 1, id_bodega: '1' } })
  await expectLabel('MI otro dispositivo lo quita -> el botón vuelve a "Ordenar"', 'Ordenar', 6000)

  // --- 4) reconexión
  console.log('\n[4] Reconexión automática')
  const before = await evaluate('window.__sockets.length')
  const tClose = await evaluate("(() => { const t = Date.now(); window.__sockets.filter((x) => x.readyState === 1).forEach((s) => s.close(4001, 'prueba')); return t })()")
  const back = await waitFor(() => evaluate(`window.__sockets.length > ${before} && window.__sockets.at(-1).readyState === 1`), 12000, 100)
  const timeline = await evaluate(`window.__sockets.slice(${before - 1}).map((s) => ({ creado: s.__t.created - ${tClose}, abierto: s.__t.open ? s.__t.open - ${tClose} : null, cerrado: s.__t.close ? s.__t.close - ${tClose} : null, codigo: s.__t.code ?? null }))`)
  console.log('   línea de tiempo (ms desde que se cerró el socket):', JSON.stringify(timeline))
  const last = timeline.at(-1)
  const retryGap = last.creado - (timeline.at(-2)?.cerrado ?? 0)
  check("tras cerrarse el socket la app reintenta sola en <= 3 s (objetivo: 1,5 s tras el evento close) y llega a conectar", Boolean(back) && last.creado <= 3000, timeline)
  console.log('   (el handshake con el servidor tardó', last.abierto - last.creado, 'ms: depende de red/servidor)')
  await inject({ tipo: 'stock carrito', idProducto: 11184, idBodega: '1', listado: lis(0), carrito: { id_producto: 11184, id_usuario: 694, cantidad: 2, id_bodega: '1' } })
  await expectLabel('y los mensajes siguen aplicándose tras reconectar -> "Agotado"', 'Agotado')

  check('el saludo {"type":"connected"} del servidor NO genera avisos de mensaje no legible', !wsWarnings.some((w) => w.includes('no legible')), wsWarnings)
  console.log('\nErrores de consola/excepciones durante la prueba:', consoleErrors.length)
  consoleErrors.slice(0, 8).forEach((e) => console.log('   -', e))
  console.log('Llamadas al API simulado:', [...new Set(state.apiCalls)].slice(0, 12).join(' | '))
  console.log('Frames reales recibidos del servidor:', realFrames.length, realFrames.slice(0, 2))
  ws.close()
}

try {
  await main()
} catch (e) {
  console.log('ERROR DEL SCRIPT', e?.stack || e)
  process.exitCode = 1
} finally {
  chrome.kill()
  await sleep(500)
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* ignore */ }
  console.log(`\nRESULTADO: ${passed} OK, ${failures.length} fallas`)
  failures.forEach((f) => console.log(' -', f))
}
