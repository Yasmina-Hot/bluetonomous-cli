import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EnvBackend } from '../../../src/keys/env-backend.js'

describe('EnvBackend', () => {
  const original = process.env

  beforeEach(() => {
    process.env = { ...original }
  })

  it('reads ANTHROPIC_API_KEY from env', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
    const backend = new EnvBackend()
    const key = await backend.get('anthropic')
    expect(key).toBe('sk-ant-test-key')
  })

  it('returns null when env var not set', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const backend = new EnvBackend()
    const key = await backend.get('anthropic')
    expect(key).toBeNull()
  })

  it('lists providers with keys set', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    process.env.OPENAI_API_KEY = 'sk-openai-test'
    delete process.env.GOOGLE_API_KEY
    const backend = new EnvBackend()
    const list = await backend.list()
    expect(list).toContain('anthropic')
    expect(list).toContain('openai')
    expect(list).not.toContain('google')
  })

  it('throws when trying to set a key', async () => {
    const backend = new EnvBackend()
    await expect(backend.set('anthropic', 'key')).rejects.toThrow()
  })

  it('returns correct env var names', () => {
    const backend = new EnvBackend()
    expect(backend.getEnvVarName('anthropic')).toBe('ANTHROPIC_API_KEY')
    expect(backend.getEnvVarName('openai')).toBe('OPENAI_API_KEY')
    expect(backend.getEnvVarName('custom')).toBe('BLUETONOMOUS_CUSTOM_API_KEY')
  })
})
