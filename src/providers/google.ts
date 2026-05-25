import { createGoogleGenerativeAI } from '@ai-sdk/google'
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

const KNOWN_MODELS: ModelInfo[] = [
  { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', contextWindow: 1_048_576, capabilities: ['chat', 'vision', 'tools', 'json-mode'] },
  { id: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', contextWindow: 1_048_576, capabilities: ['chat', 'vision', 'tools', 'json-mode'] },
  { id: 'gemini-2.0-flash-lite', displayName: 'Gemini 2.0 Flash Lite', contextWindow: 1_048_576, capabilities: ['chat', 'vision'] },
]

export class GoogleAdapter implements ProviderAdapter {
  readonly config: ProviderConfig
  private client

  constructor(apiKey: string, config?: Partial<ProviderConfig>) {
    this.client = createGoogleGenerativeAI({ apiKey })
    this.config = {
      id: 'google',
      type: 'google',
      displayName: 'Google Gemini',
      defaultModel: 'gemini-2.0-flash',
      capabilities: ['chat', 'vision', 'tools', 'json-mode'],
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
