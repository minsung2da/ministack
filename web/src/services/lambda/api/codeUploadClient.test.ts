import { describe, test, expect } from 'vitest'
import { fileToBase64 } from './codeUploadClient'

function bytesToBase64Reference(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function makeFile(bytes: Uint8Array, name = 'code.zip'): File {
  // Copy into a plain ArrayBuffer so Blob accepts it across TS DOM lib
  // variations (SharedArrayBuffer vs ArrayBuffer).
  const copy = new Uint8Array(bytes.length)
  copy.set(bytes)
  return new File([copy.buffer], name, { type: 'application/zip' })
}

describe('fileToBase64', () => {
  test('encodes a small zip to base64 matching btoa(binary) of bytes', async () => {
    // PK\x03\x04 local file header magic + a few trailing bytes
    const bytes = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00, 0x00, 0x00, 0x08, 0x00,
    ])
    const file = makeFile(bytes)

    const encoded = await fileToBase64(file)
    expect(encoded).toBe(bytesToBase64Reference(bytes))
  })

  test('round-trips a 100 KB deterministic payload (no chunk-boundary errors)', async () => {
    const size = 100 * 1024
    const bytes = new Uint8Array(size)
    for (let i = 0; i < size; i++) bytes[i] = i & 0xff
    const file = makeFile(bytes, 'big.zip')

    const encoded = await fileToBase64(file)

    // Decode back via atob and compare byte-by-byte.
    const decoded = atob(encoded)
    expect(decoded.length).toBe(size)
    for (let i = 0; i < size; i++) {
      expect(decoded.charCodeAt(i)).toBe(i & 0xff)
    }
  })

  test('preserves UTF-8 byte fidelity (Japanese ア = 0xE3 0x82 0xA2)', async () => {
    const bytes = new Uint8Array([0xe3, 0x82, 0xa2, 0x00, 0xff, 0xde, 0xad])
    const file = makeFile(bytes)

    const encoded = await fileToBase64(file)
    const decoded = atob(encoded)
    const roundTrip = new Uint8Array(decoded.length)
    for (let i = 0; i < decoded.length; i++) {
      roundTrip[i] = decoded.charCodeAt(i)
    }
    expect(Array.from(roundTrip)).toEqual(Array.from(bytes))
  })
})
