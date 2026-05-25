import { z } from 'zod'

export const ProviderTypeSchema = z.enum([
  'anthropic',
  'openai',
  'google',
  'ollama',
  'openrouter',
  'groq',
  'nvidia-nim',
])

export const ProviderConfigSchema = z.object({
  type: ProviderTypeSchema,
  displayName: z.string(),
  baseUrl: z.string().url().optional(),
  defaultModel: z.string().optional(),
  enabled: z.boolean().default(true),
})

export const MCPServerConfigSchema = z.object({
  transport: z.enum(['stdio', 'sse', 'http']),
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).default({}),
  url: z.string().url().optional(),
  headers: z.record(z.string()).default({}),
  enabled: z.boolean().default(true),
  autoConnect: z.boolean().default(true),
  timeout: z.number().default(30000),
})

export const AppConfigSchema = z.object({
  version: z.number().default(1),
  defaultProvider: ProviderTypeSchema.optional(),
  defaultModel: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().default(8192),
  streamingEnabled: z.boolean().default(true),
  theme: z.enum(['dark', 'light', 'auto']).default('auto'),
  syntaxHighlighting: z.boolean().default(true),
  markdownRendering: z.boolean().default(true),
  showCostBadge: z.boolean().default(true),
  logLevel: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('warn'),
  providers: z.record(ProviderConfigSchema).default({}),
  mcpServers: z.record(MCPServerConfigSchema).default({}),
  telemetryEnabled: z.boolean().default(false),
  workflowsDir: z.string().optional(),
  agentsDir: z.string().optional(),
})

export type AppConfig = z.infer<typeof AppConfigSchema>
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>
export type ProviderType = z.infer<typeof ProviderTypeSchema>
