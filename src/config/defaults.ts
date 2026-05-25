import type { AppConfig } from './schema.js'

export const DEFAULT_CONFIG: Partial<AppConfig> = {
  version: 1,
  temperature: 0.7,
  maxTokens: 8192,
  streamingEnabled: true,
  theme: 'auto',
  syntaxHighlighting: true,
  markdownRendering: true,
  showCostBadge: true,
  logLevel: 'warn',
  providers: {},
  mcpServers: {},
  telemetryEnabled: false,
}

export const PROVIDER_DEFAULTS: Record<string, { displayName: string; defaultModel: string }> = {
  anthropic: { displayName: 'Anthropic', defaultModel: 'claude-sonnet-4-6' },
  openai: { displayName: 'OpenAI', defaultModel: 'gpt-4o' },
  google: { displayName: 'Google Gemini', defaultModel: 'gemini-2.0-flash' },
  ollama: { displayName: 'Ollama (Local)', defaultModel: 'llama3.2' },
  openrouter: { displayName: 'OpenRouter', defaultModel: 'anthropic/claude-sonnet-4-6' },
  groq: { displayName: 'Groq', defaultModel: 'llama-3.3-70b-versatile' },
  'nvidia-nim': { displayName: 'NVIDIA NIM', defaultModel: 'meta/llama-3.1-8b-instruct' },
}
