import { describe, test, expect } from 'vitest'
import { lambdaKeys } from './lambdaKeys'

describe('lambdaKeys', () => {
  test('all key', () => {
    expect(lambdaKeys.all).toEqual(['lambda'])
  })

  test('functions(null) returns stable tuple', () => {
    expect(lambdaKeys.functions()).toEqual(['lambda', 'functions', null])
    expect(lambdaKeys.functions(null)).toEqual(['lambda', 'functions', null])
  })

  test('functions(marker) carries marker as third element', () => {
    expect(lambdaKeys.functions('hello')).toEqual([
      'lambda',
      'functions',
      'hello',
    ])
  })

  test('function(name)', () => {
    expect(lambdaKeys.function('hello')).toEqual(['lambda', 'function', 'hello'])
  })

  test('triggers(name)', () => {
    expect(lambdaKeys.triggers('hello')).toEqual(['lambda', 'triggers', 'hello'])
  })

  test('functionUrl(name)', () => {
    expect(lambdaKeys.functionUrl('hello')).toEqual([
      'lambda',
      'functionUrl',
      'hello',
    ])
  })
})
