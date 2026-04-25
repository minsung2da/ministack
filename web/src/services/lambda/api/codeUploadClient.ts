/**
 * Base64-encode a File (intended for .zip uploads) for inclusion in the
 * `Code.ZipFile` field of CreateFunction / UpdateFunctionCode requests.
 *
 * Reads the file into an ArrayBuffer (prefers `Blob.arrayBuffer()` which
 * is available in modern browsers; falls back to `FileReader` for jsdom
 * and older environments), converts to a binary string in 32 KB chunks
 * to avoid `String.fromCharCode(...bigArray)` blowing the argument-list
 * size limit, then base64-encodes via `btoa`.
 *
 * Registry Safety [Pitfall C-2]: zero new dependencies — no `jszip`, no
 * base64 library; browser-native only.
 *
 * Practical ceiling ~50 MB (File + ArrayBuffer + binary string + base64
 * string ≈ 3x the file size in memory). Larger uploads should use S3
 * code source (D-02) which bypasses the browser.
 */
export async function fileToBase64(file: File): Promise<string> {
  const buffer = await readAsArrayBuffer(file)
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000 // 32 KB
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function readAsArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  // Prefer Blob.arrayBuffer() when available.
  if (typeof (file as Blob).arrayBuffer === 'function') {
    return (file as Blob).arrayBuffer() as Promise<ArrayBuffer>
  }
  // Fallback — FileReader is universal (browser + jsdom).
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'))
    reader.readAsArrayBuffer(file)
  })
}
