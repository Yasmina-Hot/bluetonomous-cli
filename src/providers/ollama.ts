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

const DEFAULT_BASE_URL = 'http://localhost:11434/v1'

export class OllamaAdapter implements ProviderAdapter {
  readonly config: ProviderConfig
  private client

  constructor(baseUrl?: string, config?: Partial<ProviderConfig>) {
    const url = baseUrl ?? DEFAULT_BASE_URL
    this.client = createOpenAI({ baseURL: url, apiKey: 'ollama', compatibility: 'compatible' })
    this.config = {
      id: 'ollama',
      type: 'ollama',
      displayName: 'Ollama (Local)',
      defaultModel: 'llama3.2',
      baseUrl: url,
      capabilities: ['chat', 'vision', 'tools'],
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
    // Query Ollama's local API for installed models
    try {
      const resp = await fetch(`${this.config.baseUrl?.replace('/v1', '')}/api/tags`)
      if (!resp.ok) return []
      const data = await resp.json() as { models: Array<{ name: string; details?: { parameter_size?: string } }> }
      return data.models.map((m) => ({
        id: m.name,
        displayName: m.name,
        capabilities: ['chat'],
      }))
    } catch {
      return []
    }
  }
}
