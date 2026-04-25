import type {
  DdbAttributeValue,
  DdbScalarType,
} from '../../../shared/types/ddb'

/**
 * AttributeValue codec — scalars (D-06 in-scope).
 *
 * Wire shape: 05-RESEARCH.md §3 (lines 473–508).
 * D-06 scope: S / N / B / BOOL / NULL only. Complex types (L / M / SS / NS / BS)
 * throw on marshal; on read they flow through `renderAttributeValue` for display.
 *
 * Pitfall 7.2.1: N is ALWAYS a string on the wire.
 * Reference implementations (including AWS SDKs) reject `{"N": 42}` and accept
 * only `{"N": "42"}` because N preserves arbitrary-precision semantics.
 * marshalScalar therefore stringifies ALL numeric input.
 */

export const SCALAR_TYPES: readonly DdbScalarType[] = [
  'S',
  'N',
  'B',
  'BOOL',
  'NULL',
] as const

export function isScalarType(t: string): t is DdbScalarType {
  return (SCALAR_TYPES as readonly string[]).includes(t)
}

/**
 * Thrown when a complex AttributeValue type reaches the scalar codec.
 * The ItemForm (D-03 / D-06) catches this and renders a "use JSON mode" hint.
 */
export class DdbComplexTypeNotSupportedError extends Error {
  constructor(type: string) {
    super(
      `AttributeValue type "${type}" requires JSON advanced mode (D-06 — scalar-only form)`,
    )
    this.name = 'DdbComplexTypeNotSupportedError'
  }
}

/**
 * Native JS value + declared scalar type → AttributeValue wire shape.
 */
export function marshalScalar(
  value: string | number | boolean | null,
  type: DdbScalarType,
): DdbAttributeValue {
  switch (type) {
    case 'S':
      return { S: String(value ?? '') }
    // Pitfall 7.2.1: always stringify. Caller may pass a number, a string
    // like '01' (leading zero preserved), or a bigint-y string literal.
    case 'N':
      return { N: String(value ?? '0') }
    case 'BOOL':
      return { BOOL: Boolean(value) }
    // NULL is a pure marker — discard any input value.
    case 'NULL':
      return { NULL: true }
    // B expects pre-encoded base64 from the File upload widget.
    case 'B':
      return { B: String(value ?? '') }
  }
}

/**
 * AttributeValue scalar → native JS value for form population.
 * N returns the string verbatim (preserves arbitrary precision — caller
 * decides when to `Number()` for display).
 * Throws `DdbComplexTypeNotSupportedError` for L / M / SS / NS / BS.
 */
export function unmarshalScalar(
  av: DdbAttributeValue,
): string | number | boolean | null {
  if ('S' in av) return av.S
  if ('N' in av) return av.N // preserve string — D-06 + Pitfall 7.2.1
  if ('BOOL' in av) return av.BOOL
  if ('NULL' in av) return null
  if ('B' in av) return av.B
  const type = Object.keys(av)[0] ?? 'unknown'
  throw new DdbComplexTypeNotSupportedError(type)
}

/**
 * Display-only flattener — used by the items Table cell renderer.
 * Accepts ALL 10 wire types (scalar + complex) because the read path may
 * legitimately surface complex values even though the form cannot author them.
 */
export function renderAttributeValue(av: DdbAttributeValue): string {
  if ('S' in av) return av.S
  if ('N' in av) return av.N
  if ('BOOL' in av) return av.BOOL ? 'true' : 'false'
  if ('NULL' in av) return '(null)'
  if ('B' in av) return `(binary, ${av.B.length} b64 chars)`
  if ('L' in av) return `[L: ${av.L.length} items]`
  if ('M' in av) return `[M: ${Object.keys(av.M).length} keys]`
  if ('SS' in av) return `[SS: ${av.SS.length} strings]`
  if ('NS' in av) return `[NS: ${av.NS.length} numbers]`
  if ('BS' in av) return `[BS: ${av.BS.length} blobs]`
  return JSON.stringify(av)
}
