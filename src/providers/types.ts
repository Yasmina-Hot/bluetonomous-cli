export type ProviderType =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'ollama'
  | 'openrouter'
  | 'groq'
  | 'nvidia-nim'

export type ProviderCapability =
  | 'chat'
  | 'vision'
  | 'tools'
  | 'embeddings'
  | 'image-gen'
  | 'tts'
  | 'stt'
  | 'json-mode'

export interface ProviderConfig {
  id: string
  type: ProviderType
  displayName: string
  baseUrl?: string
  defaultModel?: string
  capabilities: ProviderCapability[]
  rateLimits?: { rpm?: number; tpm?: number }
}

export interface ModelInfo {
  id: string
  displayName?: string
  contextWindow?: number
  capabilities: ProviderCapability[]
  inputCostPer1k?: number
  outputCostPer1k?: number
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | MessagePart[]
  toolCallId?: string
  toolCalls?: ToolCall[]
}

export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'file'; data: string; mimeType: string }

export interface TextRequest {
  model: string
  messages: Message[]
  system?: string
  maxTokens?: number
  temperature?: number
  tools?: ToolDefinition[]
  signal?: AbortSignal
}

export interface TextChunk {
  type: 'text' | 'tool-call' | 'usage' | 'finish'
  text?: string
  toolCall?: ToolCall
  usage?: { inputTokens: number; outputTokens: number }
  finishReason?: 'stop' | 'tool-calls' | 'length' | 'error'
}

export interface TextResponse {
  text: string
  toolCalls?: ToolCall[]
  usage?: { inputTokens: number; outputTokens: number }
  finishReason: string
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  result: unknown
  isError?: boolean
}

export interface ObjectRequest<T> {
  model: string
  messages: Message[]
  system?: string
  schema: unknown
  maxTokens?: number
  temperature?: number
}

export interface EmbeddingRequest {
  model: string
  input: string | string[]
}

export interface AudioRequest {
  model: string
  audio: Buffer
  mimeType: string
  language?: string
}

export interface TranscriptionResult {
  text: string
  segments?: Array<{ start: number; end: number; text: string }>
  language?: string
}

export interface ImageGenRequest {
  model: string
  prompt: string
  size?: string
  quality?: string
  n?: number
}

export interface ImageGenResult {
  images: Array<{ url?: string; base64?: string }>
}

export interface ProviderAdapter {
  readonly config: ProviderConfig
  streamText(req: TextRequest): AsyncIterable<TextChunk>
  generateText(req: TextRequest): Promise<TextResponse>
  generateObject<T>(req: ObjectRequest<T>): Promise<T>
  createEmbedding?(req: EmbeddingRequest): Promise<number[][]>
  transcribeAudio?(req: AudioRequest): Promise<TranscriptionResult>
  generateImage?(req: ImageGenRequest): Promise<ImageGenResult>
  listModels?(): Promise<ModelInfo[]>
}
