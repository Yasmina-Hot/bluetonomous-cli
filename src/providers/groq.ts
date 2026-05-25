import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'
import type {
  ModelInfo,
  ProviderAdapter,
  ProviderConfig,
  TextChunk,
  TextRequest,
  TextResponse,
  ObjectRequest,
} from './types.js'

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'

const KNOWN_MODELS: ModelInfo[] = [
  { id: 'llama-3.3-70b-versatile', displayName: 'Llama 3.3 70B', contextWindow: 128_000, capabilities: ['chat', 'tools', 'json-mode'] },
  { id: 'llama-3.1-8b-instant', displayName: 'Llama 3.1 8B Instant', contextWindow: 128_000, capabilities: ['chat', 'tools'] },
  { id: 'gemma2-9b-it', displayName: 'Gemma2 9B', contextWindow: 8_192, capabilities: ['chat'] },
  { id: 'mixtral-8x7b-32768', displayName: 'Mixtral 8x7B', contextWindow: 32_768, capabilities: ['chat', 'tools'] },
]

export class GroqAdapter implements ProviderAdapter {
  readonly config: ProviderConfig
  private client

  constructor(apiKey: string, config?: Partial<ProviderConfig>) {
    this.client = createOpenAI({ apiKey, baseURL: GROQ_BASE_URL, compatibility: 'compatible' })
    this.config = {
      id: 'groq',
      type: 'groq',
      displayName: 'Groq',
      defaultModel: 'llama-3.3-70b-versatile',
      baseUrl: GROQ_BASE_URL,
      capabilities: ['chat', 'tools', 'json-mode', 'stt'],
      ...config,
    }
  }

  async *streamText(req: TextRequest): AsyncIterable<TextChunk> {
    const result = streamText({
      model: this.client(req.model),
      messages: req.messages as Parameters<typeof streamText>[0]['messages'],
      system: req.system,
      maxTokens: req.maxTokens,
      temperature: req.temperature,
      abortSignal: req.signal,
    })

    for await (const chunk of result.fullStream) {
      if (chunk.type === 'text-delta') {
        yield { type: 'text', text: chunk.textDelta }
      } else if (chunk.type === 'finish') {
        yield { type: 'finish', finishReason: chunk.finishReason as TextChunk['finishReason'] }
      }
    }

    const usage = await result.usage
    if (usage) {
      yield { type: 'usage', usage: { inputTokens: usage.promptTokens, outputTokens: usage.completionTokens } }
    }
  }

  async generateText(req: TextRequest): Promise<TextResponse> {
    const result = await generateText({
      model: this.client(req.model),
      messages: req.messages as Parameters<typeof generateText>[0]['messages'],
      system: req.system,
      maxTokens: req.maxTokens,
      temperature: req.temperature,
      abortSignal: req.signal,
    })

    return {
      text: result.text,
      usage: { inputTokens: result.usage.promptTokens, outputTokens: result.usage.completionTokens },
      finishReason: result.finishReason,
    }
  }

  async generateObject<T>(req: ObjectRequest<T>): Promise<T> {
    const { generateObject } = await import('ai')
    const { z } = await import('zod')
    const result = await generateObject({
      model: this.client(req.model),
      messages: req.messages as Parameters<typeof generateText>[0]['messages'],
      system: req.system,
      schema: req.schema as ReturnType<typeof z.object>,
    })
    return result.object as T
  }

  async listModels(): Promise<ModelInfo[]> {
    return KNOWN_MODELS
  }
}
