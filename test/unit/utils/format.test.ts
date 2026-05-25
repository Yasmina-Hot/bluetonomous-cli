import { describe, it, expect } from 'vitest'
import { maskKey, formatDuration, formatBytes, formatCost, truncate } from '../../../src/utils/format.js'

describe('maskKey', () => {
  it('masks middle of key', () => {
    expect(maskKey('sk-ant-abc123def456')).toBe('sk-a****f456')
  })

  it('fully masks short keys', () => {
    expect(maskKey('abc')).toBe('****')
  })
})

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms')
  })

  it('formats seconds', () => {
    expect(formatDuration(2500)).toBe('2.5s')
  })

  it('formats minutes', () => {
    expect(formatDuration(65_000)).toBe('1m 5s')
  })
})

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512B')
    expect(formatBytes(1536)).toBe('1.5KB')
    expect(formatBytes(1_500_000)).toBe('1.4MB')
  })
})

describe('formatCost', () => {
  it('formats small amounts', () => {
    expect(formatCost(0.0001)).toBe('<$0.001')
    expect(formatCost(0.1234)).toBe('$0.1234')
  })
})

describe('truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
    expect(truncate('short', 10)).toBe('short')
  })
})
