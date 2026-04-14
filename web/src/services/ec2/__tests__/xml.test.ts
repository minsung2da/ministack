import { describe, test } from 'vitest'

describe('xml.ts parser utilities', () => {
  describe('parseXml', () => {
    test.todo('parses valid XML string to Document')
  })

  describe('getText', () => {
    test.todo('extracts text from named tag')
    test.todo('returns empty string for missing tag')
  })

  describe('getItems', () => {
    test.todo('returns array of item elements from named set')
    test.todo('returns empty array for missing set')
  })

  describe('getNameTag', () => {
    test.todo('extracts Name tag value from tagSet')
    test.todo('returns empty string when no Name tag')
  })
})
