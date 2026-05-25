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

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

export class OpenRouterAdapter implements ProviderAdapter {
  readonly config: ProviderConfig
  private client

  constructor(apiKey: string, config?: Partial<ProviderConfig>) {
    this.client = createOpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      compatibility: 'compatible',
      headers: {
        'HTTP-Referer': 'https://github.com/yasmina-hot/bluetonomous-cli',
        'X-Title': 'bluetonomous-cli',
      },
    })
    this.config = {
      id: 'openrouter',
      type: 'openrouter',
      displayName: 'OpenRouter',
      defaultModel: 'anthropic/claude-sonnet-4-6',
      baseUrl: OPENROUTER_BASE_URL,
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
    // OpenRouter has hundreds of models — return commonly used ones
    return [
      { id: 'anthropic/claude-opus-4-7', displayName: 'Claude Opus 4.7 (via OR)', contextWindow: 200_000, capabilities: ['chat', 'vision', 'tools'] },
      { id: 'anthropic/claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6 (via OR)', contextWindow: 200_000, capabilities: ['chat', 'vision', 'tools'] },
      { id: 'openai/gpt-4o', displayName: 'GPT-4o (via OR)', contextWindow: 128_000, capabilities: ['chat', 'vision', 'tools'] },
      { id: 'google/gemini-2.5-pro', displayName: 'Gemini 2.5 Pro (via OR)', contextWindow: 1_048_576, capabilities: ['chat', 'vision', 'tools'] },
      { id: 'meta-llama/llama-3.3-70b-instruct', displayName: 'Llama 3.3 70B (via OR)', contextWindow: 131_072, capabilities: ['chat', 'tools'] },
    ]
  }
}
