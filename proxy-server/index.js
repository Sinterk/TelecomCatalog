import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const upload = multer({ storage: multer.memoryStorage() })

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT             = process.env.PORT             ?? 3001
const ALLOWED_ORIGIN   = process.env.ALLOWED_ORIGIN   ?? 'http://localhost:5173'
const ROOT_FOLDER_ID   = process.env.DRIVE_ROOT_FOLDER_ID ?? ''

// ─── Datos locales (preventivos) ─────────────────────────────────────────────
const DATA_DIR         = join(__dirname, 'data')
const PREVENTIVOS_FILE = join(DATA_DIR, 'preventivos.json')

if (!existsSync(DATA_DIR))         mkdirSync(DATA_DIR)
if (!existsSync(PREVENTIVOS_FILE)) writeFileSync(PREVENTIVOS_FILE, '[]', 'utf-8')

function readPreventivos()       { try { return JSON.parse(readFileSync(PREVENTIVOS_FILE, 'utf-8')) } catch { return [] } }
function writePreventivos(data)  { writeFileSync(PREVENTIVOS_FILE, JSON.stringify(data, null, 2), 'utf-8') }

// ─── Google Drive ─────────────────────────────────────────────────────────────
function loadServiceAccount() {
  if (process.env.SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.SERVICE_ACCOUNT_JSON)
  const f = process.env.SERVICE_ACCOUNT_KEY_FILE ?? './service-account.json'
  if (!existsSync(f)) return null
  return JSON.parse(readFileSync(f, 'utf-8'))
}

const sa = loadServiceAccount()
let drive = null

if (sa) {
  const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/drive'] })
  drive = google.drive({ version: 'v3', auth })
  console.info('[drive] Conectado ✓')
} else {
  console.warn('[drive] ⚠ Sin credenciales — endpoints de Drive deshabilitados')
}

// ─── Helpers Drive ────────────────────────────────────────────────────────────

/**
 * Caché en memoria de IDs de carpetas: "nombre::parentId" → folderId
 * Se pierde al reiniciar el servidor, pero evita llamadas redundantes a Drive
 * durante la misma sesión (el caso más frecuente en terreno).
 */
const folderCache = new Map()
/**
 * Promesas en vuelo para evitar race conditions: dos requests simultáneos
 * no crearán carpetas duplicadas aunque el caché esté vacío.
 */
const folderCreating = new Map()

/** Crea o devuelve una carpeta existente, con caché en memoria y sin race conditions */
async function ensureFolder(name, parentId) {
  const safe  = parentId || ROOT_FOLDER_ID
  const cacheKey = `${name}::${safe}`

  if (folderCache.has(cacheKey)) return folderCache.get(cacheKey)
  // Si ya hay una llamada en vuelo para esta carpeta, esperar esa misma promise
  if (folderCreating.has(cacheKey)) return folderCreating.get(cacheKey)

  const promise = (async () => {
    const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${safe}' in parents and trashed=false`
    const res = await drive.files.list({ q, fields: 'files(id,name)', spaces: 'drive' })

    let id
    if (res.data.files?.length) {
      id = res.data.files[0].id
    } else {
      const created = await drive.files.create({
        requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [safe] },
        fields: 'id',
      })
      id = created.data.id
    }

    folderCache.set(cacheKey, id)
    folderCreating.delete(cacheKey)
    return id
  })()

  folderCreating.set(cacheKey, promise)
  return promise
}

/**
 * Sube o sobreescribe un archivo en Drive.
 * Si ya existe un archivo con el mismo nombre en la carpeta, lo actualiza (no duplica).
 */
async function upsertFile(name, mimeType, buffer, folderId) {
  const q = `name='${name.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`
  const existing = await drive.files.list({ q, fields: 'files(id)', spaces: 'drive' })

  const stream = () => { const s = new Readable(); s.push(buffer); s.push(null); return s }

  if (existing.data.files?.length) {
    // Actualizar contenido del archivo existente
    const fileId = existing.data.files[0].id
    await drive.files.update({
      fileId,
      media: { mimeType, body: stream() },
    })
    return fileId
  }

  // Crear nuevo
  const res = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType, body: stream() },
    fields: 'id',
  })
  return res.data.id
}

/**
 * Nombre seguro para carpetas y archivos (sin caracteres especiales).
 * Formato: "cuadrante_comuna"  →  "C-042_Providencia"
 */
function cuadranteSlug(cuadrante) {
  const raw = [cuadrante?.cuadrante, cuadrante?.comuna]
    .filter(Boolean)
    .join('_')
  return raw.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '-').slice(0, 60) || 'sin-nombre'
}

/**
 * Genera y sube el JSON de metadata del cuadrante.
 * Se llama automáticamente después de cada subida de foto.
 */
async function updateMetadata(preventivo, cuadranteFolderId) {
  const slug = cuadranteSlug(preventivo.cuadrante)
  const fileName = `metadata_${slug}.json`

  const payload = {
    exportadoEn: new Date().toISOString(),
    cuadrante: preventivo.cuadrante,
    puntos: preventivo.puntos.map((p) => ({
      id: p.id,
      nombre: p.nombre ?? '',
      descripcion: p.descripcion,
      direccion: p.direccion,
      correccion: p.correccion ?? '',
      fotos: {
        levantamiento: p.fotoLevantamiento?.fileName ?? null,
        antes:         p.fotoAntes?.fileName         ?? null,
        despues:       p.fotoDespues?.fileName        ?? null,
      },
    })),
  }

  const buf = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8')
  await upsertFile(fileName, 'application/json', buf, cuadranteFolderId)
  console.info(`[metadata] ✓ ${fileName}`)
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    const allowed = ALLOWED_ORIGIN.split(',').map(s => s.trim())
    if (!origin || allowed.includes(origin) || allowed.includes('*')) return cb(null, true)
    cb(new Error('CORS bloqueado: ' + origin))
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// ─── PREVENTIVOS CRUD ─────────────────────────────────────────────────────────

app.get('/api/preventivos', (_, res) => res.json(readPreventivos()))

app.post('/api/preventivos', (req, res) => {
  const list = readPreventivos()
  const p = req.body
  if (!p?.id) return res.status(400).json({ error: 'id requerido' })
  if (list.find(x => x.id === p.id)) return res.status(409).json({ error: 'Ya existe' })
  list.push(p)
  writePreventivos(list)
  res.status(201).json(p)
})

app.put('/api/preventivos/:id', (req, res) => {
  const list = readPreventivos()
  const idx = list.findIndex(x => x.id === req.params.id)
  if (idx === -1) list.push(req.body)
  else list[idx] = req.body
  writePreventivos(list)
  res.json(req.body)
})

app.delete('/api/preventivos/:id', (req, res) => {
  writePreventivos(readPreventivos().filter(x => x.id !== req.params.id))
  res.json({ ok: true })
})

// ─── DRIVE: subir foto ────────────────────────────────────────────────────────
/**
 * POST /api/drive/upload
 * Body (multipart): file, preventivoId, mimeType, metadata (JSON string)
 *
 * Estructura resultante en Drive:
 *   Root/
 *     Preventivos/
 *       C-042_Providencia/
 *         P1_levantamiento.jpeg
 *         metadata_C-042_Providencia.json  ← se actualiza automáticamente
 */
app.post('/api/drive/upload', upload.single('file'), async (req, res) => {
  if (!drive) return res.status(503).json({ error: 'Drive no configurado' })
  try {
    const { preventivoId, mimeType } = req.body
    const file = req.file
    if (!file) return res.status(400).json({ error: 'No file' })

    // 1. Obtener info del preventivo para construir la ruta
    const preventivos = readPreventivos()
    const preventivo  = preventivos.find(p => p.id === preventivoId)
    if (!preventivo)  return res.status(404).json({ error: 'Preventivo no encontrado' })

    const slug = cuadranteSlug(preventivo.cuadrante)

    // 2. Resolver / crear carpetas: Root → Preventivos → NombreCuadrante
    const preventivosFolderId  = await ensureFolder('Preventivos', ROOT_FOLDER_ID)
    const cuadranteFolderId    = await ensureFolder(slug, preventivosFolderId)

    // 3. Subir foto y actualizar metadata EN PARALELO
    const [fileId] = await Promise.all([
      upsertFile(file.originalname, mimeType || file.mimetype, file.buffer, cuadranteFolderId),
      updateMetadata(preventivo, cuadranteFolderId),
    ])
    console.info(`[upload] ✓ ${file.originalname} → ${slug}/`)

    return res.json({ fileId, folder: slug })
  } catch (err) {
    console.error('[upload]', err)
    return res.status(500).json({ error: String(err) })
  }
})

// ─── DRIVE: servir imagen por fileId ─────────────────────────────────────────
/**
 * GET /api/drive/file/:fileId
 * Sirve la imagen directamente desde Drive usando la Service Account.
 * Permite mostrar previews en modo oficina (u otro dispositivo) sin exponer
 * credenciales al cliente.
 */
app.get('/api/drive/file/:fileId', async (req, res) => {
  if (!drive) return res.status(503).json({ error: 'Drive no configurado' })
  try {
    const { fileId } = req.params
    const [metaRes, streamRes] = await Promise.all([
      drive.files.get({ fileId, fields: 'mimeType' }),
      drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' }),
    ])
    res.setHeader('Content-Type', metaRes.data.mimeType || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    streamRes.data.pipe(res)
  } catch (err) {
    console.error('[drive/file]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ─── DRIVE: carpeta raíz del módulo (legacy, por compatibilidad) ──────────────
app.post('/api/drive/folder', async (req, res) => {
  if (!drive) return res.status(503).json({ error: 'Drive no configurado' })
  try {
    const { name, parentId } = req.body
    const id = await ensureFolder(name, parentId || ROOT_FOLDER_ID)
    res.json({ id, name })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.get('/api/drive/root/:moduleId', async (req, res) => {
  if (!drive) return res.status(503).json({ error: 'Drive no configurado' })
  try {
    const id = await ensureFolder(req.params.moduleId, ROOT_FOLDER_ID)
    res.json({ folderId: id })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, drive: !!drive, rootFolder: ROOT_FOLDER_ID || '(no configurado)' }))

app.listen(PORT, () => {
  console.info(`\n[proxy] http://localhost:${PORT}`)
  console.info(`[proxy] CORS: ${ALLOWED_ORIGIN}`)
  if (!ROOT_FOLDER_ID && drive) console.warn('[proxy] ⚠ DRIVE_ROOT_FOLDER_ID no configurado\n')
})
