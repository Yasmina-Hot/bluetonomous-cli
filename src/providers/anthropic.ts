import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, streamText } from 'ai'
import type {
  ModelInfo,
  ProviderAdapter,
  ProviderConfig,
  TextChunk,
  TextRequest,
  TextResponse,
  ObjectRequest,
  EmbeddingRequest,
} from './types.js'

const KNOWN_MODELS: ModelInfo[] = [
  { id: 'claude-opus-4-7', displayName: 'Claude Opus 4.7', contextWindow: 200_000, capabilities: ['chat', 'vision', 'tools', 'json-mode'] },
  { id: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6', contextWindow: 200_000, capabilities: ['chat', 'vision', 'tools', 'json-mode'] },
  { id: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5', contextWindow: 200_000, capabilities: ['chat', 'vision', 'tools', 'json-mode'] },
]

export class AnthropicAdapter implements ProviderAdapter {
  readonly config: ProviderConfig
  private client

  constructor(apiKey: string, config?: Partial<ProviderConfig>) {
    this.client = createAnthropic({ apiKey })
    this.config = {
      id: 'anthropic',
      type: 'anthropic',
      displayName: 'Anthropic',
      defaultModel: 'claude-sonnet-4-6',
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
      tools: req.tools ? Object.fromEntries(req.tools.map((t) => [t.name, {
        description: t.description,
        parameters: t.parameters,
        execute: undefined as unknown as () => Promise<unknown>,
      }])) : undefined,
      abortSignal: req.signal,
    })

    for await (const chunk of result.fullStream) {
      if (chunk.type === 'text-delta') {
        yield { type: 'text', text: chunk.textDelta }
      } else if (chunk.type === 'tool-call') {
        yield { type: 'tool-call', toolCall: { id: chunk.toolCallId, name: chunk.toolName, arguments: chunk.args as Record<string, unknown> } }
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
      maxTokens: req.maxTokens,
      schema: req.schema as ReturnType<typeof z.object>,
    })
    return result.object as T
  }

  async listModels(): Promise<ModelInfo[]> {
    return KNOWN_MODELS
  }
}
