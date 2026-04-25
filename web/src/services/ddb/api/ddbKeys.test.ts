import { describe, test, expect } from 'vitest'
import { ddbKeys } from './ddbKeys'

describe('ddbKeys', () => {
  test('all is the root namespace', () => {
    expect(ddbKeys.all).toEqual(['ddb'])
  })

  test('tables() returns [ddb, tables]', () => {
    expect(ddbKeys.tables()).toEqual(['ddb', 'tables'])
  })

  test('table(name) returns [ddb, table, name]', () => {
    expect(ddbKeys.table('orders')).toEqual(['ddb', 'table', 'orders'])
  })

  test('scan(name, null, null) encodes nulls for no-filter / no-ESK', () => {
    expect(ddbKeys.scan('orders', null, null)).toEqual([
      'ddb',
      'scan',
      'orders',
      null,
      null,
    ])
  })

  test('scan encodes LastEvaluatedKey as JSON-stringified map (Pitfall 7.2.2)', () => {
    const eskJson = JSON.stringify({ pk: { S: 'abc' } })
    const key = ddbKeys.scan('orders', 'status = :s', eskJson)
    expect(key).toEqual(['ddb', 'scan', 'orders', 'status = :s', eskJson])
    // The stringified ESK lives at index 4 — regression-lock for Pitfall 7.2.2.
    expect(key[4]).toBe(eskJson)
    expect(typeof key[4]).toBe('string')
  })

  test('query(name, pkValue, null) returns the 5-tuple with null ESK', () => {
    expect(ddbKeys.query('orders', 'customer-1', null)).toEqual([
      'ddb',
      'query',
      'orders',
      'customer-1',
      null,
    ])
  })

  test('query encodes ESK as JSON-stringified map (Pitfall 7.2.2)', () => {
    const eskJson = JSON.stringify({ pk: { S: 'c-1' }, sk: { S: '2026-04-01' } })
    expect(ddbKeys.query('orders', 'c-1', eskJson)).toEqual([
      'ddb',
      'query',
      'orders',
      'c-1',
      eskJson,
    ])
  })

  test('item(name, pkJson) returns the 4-tuple with JSON-stringified pkJson', () => {
    const pkJson = JSON.stringify({ pk: { S: 'abc' }, sk: { S: 'x' } })
    expect(ddbKeys.item('orders', pkJson)).toEqual([
      'ddb',
      'item',
      'orders',
      pkJson,
    ])
  })
})
