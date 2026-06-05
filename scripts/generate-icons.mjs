#!/usr/bin/env node
/**
 * Genera iconos PNG placeholder para la PWA (192×192 y 512×512).
 * Gradiente diagonal: slate-900 (#0f172a) → brand-blue (#1e40af).
 * Reemplaza public/icons/icon-*.png con assets reales cuando estén listos.
 *
 * Uso: node scripts/generate-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

// ── PNG chunk ─────────────────────────────────────────────────────────────────
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

// ── Image data ────────────────────────────────────────────────────────────────
function makePNG(size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB color type

  // Gradiente diagonal slate-900 → brand-blue con círculo central
  const raw = Buffer.alloc(size * (1 + size * 3))
  const cx = size / 2, cy = size / 2, radius = size * 0.38

  for (let y = 0; y < size; y++) {
    const base = y * (1 + size * 3)
    raw[base] = 0 // filtro: None
    for (let x = 0; x < size; x++) {
      // Gradiente de fondo: diagonal TL→BR
      const t = (x + y) / (2 * (size - 1))
      let r = Math.round(15 + t * 15)
      let g = Math.round(23 + t * 41)
      let b = Math.round(42 + t * 133)

      // Círculo central más claro (simula ícono)
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (dist < radius) {
        const blend = 1 - dist / radius
        r = Math.round(r + blend * (56 - r))
        g = Math.round(g + blend * (189 - g))
        b = Math.round(b + blend * (248 - b))
      }

      raw[base + 1 + x * 3 + 0] = Math.min(255, r)
      raw[base + 1 + x * 3 + 1] = Math.min(255, g)
      raw[base + 1 + x * 3 + 2] = Math.min(255, b)
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
for (const size of [192, 512]) {
  const png = makePNG(size)
  writeFileSync(`public/icons/icon-${size}.png`, png)
  console.log(`✓ icon-${size}.png  (${(png.length / 1024).toFixed(1)} KB)`)
}
console.log('Reemplaza estos archivos con iconos reales cuando estén disponibles.')
