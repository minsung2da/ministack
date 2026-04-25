import { describe, test, expect } from 'vitest'
import {
  marshalScalar,
  unmarshalScalar,
  renderAttributeValue,
  isScalarType,
  SCALAR_TYPES,
  DdbComplexTypeNotSupportedError,
} from './attributeValue'
import type { DdbAttributeValue } from '../../../shared/types/ddb'

describe('SCALAR_TYPES + isScalarType', () => {
  test('exports the 5 D-06 scalar tags', () => {
    expect(SCALAR_TYPES).toEqual(['S', 'N', 'B', 'BOOL', 'NULL'])
  })

  test('isScalarType narrows scalars', () => {
    expect(isScalarType('S')).toBe(true)
    expect(isScalarType('N')).toBe(true)
    expect(isScalarType('B')).toBe(true)
    expect(isScalarType('BOOL')).toBe(true)
    expect(isScalarType('NULL')).toBe(true)
  })

  test('isScalarType rejects complex types', () => {
    expect(isScalarType('L')).toBe(false)
    expect(isScalarType('M')).toBe(false)
    expect(isScalarType('SS')).toBe(false)
    expect(isScalarType('NS')).toBe(false)
    expect(isScalarType('BS')).toBe(false)
    expect(isScalarType('garbage')).toBe(false)
  })
})

describe('marshalScalar', () => {
  test('S returns {S: string}', () => {
    expect(marshalScalar('hello', 'S')).toEqual({ S: 'hello' })
  })

  test('S null-safe default returns empty string', () => {
    expect(marshalScalar(null, 'S')).toEqual({ S: '' })
  })

  test('N stringifies a number input (Pitfall 7.2.1 — N is always string on wire)', () => {
    expect(marshalScalar(42, 'N')).toEqual({ N: '42' })
  })

  test('N preserves leading zeros when input is a string (Pitfall 7.2.1)', () => {
    // '01' must stay '01' — NOT become 1 via Number().
    expect(marshalScalar('01', 'N')).toEqual({ N: '01' })
  })

  test('BOOL true', () => {
    expect(marshalScalar(true, 'BOOL')).toEqual({ BOOL: true })
  })

  test('BOOL false', () => {
    expect(marshalScalar(false, 'BOOL')).toEqual({ BOOL: false })
  })

  test('NULL discards input and returns {NULL: true}', () => {
    expect(marshalScalar('anything', 'NULL')).toEqual({ NULL: true })
    expect(marshalScalar(null, 'NULL')).toEqual({ NULL: true })
    expect(marshalScalar(0, 'NULL')).toEqual({ NULL: true })
  })

  test('B passes through a pre-encoded base64 string', () => {
    expect(marshalScalar('YWJj', 'B')).toEqual({ B: 'YWJj' })
  })
})

describe('unmarshalScalar', () => {
  test('S unwraps to the string', () => {
    expect(unmarshalScalar({ S: 'hello' })).toBe('hello')
  })

  test('N preserves string form (Pitfall 7.2.1 — arbitrary precision)', () => {
    expect(unmarshalScalar({ N: '42' })).toBe('42')
    // Leading-zero regression lock.
    expect(unmarshalScalar({ N: '01' })).toBe('01')
  })

  test('BOOL unwraps to a boolean', () => {
    expect(unmarshalScalar({ BOOL: true })).toBe(true)
    expect(unmarshalScalar({ BOOL: false })).toBe(false)
  })

  test('NULL unwraps to JS null', () => {
    expect(unmarshalScalar({ NULL: true })).toBe(null)
  })

  test('B unwraps to base64 string', () => {
    expect(unmarshalScalar({ B: 'YWJj' })).toBe('YWJj')
  })

  test('throws DdbComplexTypeNotSupportedError for L with D-06 reference', () => {
    expect(() =>
      unmarshalScalar({ L: [] } as DdbAttributeValue),
    ).toThrowError(DdbComplexTypeNotSupportedError)
    try {
      unmarshalScalar({ L: [] } as DdbAttributeValue)
    } catch (err) {
      expect((err as Error).message).toContain('D-06')
      expect((err as Error).message).toContain('L')
    }
  })

  test('throws for M / SS / NS / BS', () => {
    for (const av of [
      { M: {} } as DdbAttributeValue,
      { SS: [] } as DdbAttributeValue,
      { NS: [] } as DdbAttributeValue,
      { BS: [] } as DdbAttributeValue,
    ]) {
      expect(() => unmarshalScalar(av)).toThrowError(
        DdbComplexTypeNotSupportedError,
      )
    }
  })
})

describe('renderAttributeValue', () => {
  test('flattens all 5 scalars without throwing', () => {
    expect(renderAttributeValue({ S: 'hi' })).toBe('hi')
    expect(renderAttributeValue({ N: '42' })).toBe('42')
    expect(renderAttributeValue({ BOOL: true })).toBe('true')
    expect(renderAttributeValue({ BOOL: false })).toBe('false')
    expect(renderAttributeValue({ NULL: true })).toBe('(null)')
    expect(renderAttributeValue({ B: 'YWJj' })).toContain('binary')
  })

  test('renders complex types as bracketed summaries without throwing', () => {
    expect(renderAttributeValue({ L: [{ S: 'x' }] })).toBe('[L: 1 items]')
    expect(renderAttributeValue({ M: { a: { S: 'x' } } })).toBe('[M: 1 keys]')
    expect(renderAttributeValue({ SS: ['a', 'b'] })).toBe('[SS: 2 strings]')
    expect(renderAttributeValue({ NS: ['1', '2', '3'] })).toBe(
      '[NS: 3 numbers]',
    )
    expect(renderAttributeValue({ BS: ['YWJj'] })).toBe('[BS: 1 blobs]')
  })
})
