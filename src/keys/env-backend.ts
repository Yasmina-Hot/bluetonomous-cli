import type { KeyBackend } from './types.js'

const ENV_MAP: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  ollama: 'OLLAMA_API_KEY',
  'nvidia-nim': 'NVIDIA_API_KEY',
}

export class EnvBackend implements KeyBackend {
  async isAvailable(): Promise<boolean> {
    return true
  }

  async get(providerId: string): Promise<string | null> {
    const envKey = ENV_MAP[providerId] ?? `BLUETONOMOUS_${providerId.toUpperCase()}_API_KEY`
    return process.env[envKey] ?? null
  }

  async set(_providerId: string, _value: string): Promise<void> {
    // Env vars are read-only at runtime — can't persist
    throw new Error('Cannot persist API keys to environment variables. Use keychain or encrypted file.')
  }

  async delete(_providerId: string): Promise<void> {
    throw new Error('Cannot delete environment variables at runtime.')
  }

  async list(): Promise<string[]> {
    return Object.entries(ENV_MAP)
      .filter(([, envKey]) => process.env[envKey])
      .map(([providerId]) => providerId)
  }

  getEnvVarName(providerId: string): string {
    return ENV_MAP[providerId] ?? `BLUETONOMOUS_${providerId.toUpperCase()}_API_KEY`
  }
}
