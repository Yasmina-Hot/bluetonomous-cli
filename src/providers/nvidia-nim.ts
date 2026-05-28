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

const NVIDIA_NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1'

const KNOWN_MODELS: ModelInfo[] = [
  { id: 'meta/llama-3.1-8b-instruct', displayName: 'Llama 3.1 8B', contextWindow: 128_000, capabilities: ['chat', 'tools'] },
  { id: 'meta/llama-3.1-70b-instruct', displayName: 'Llama 3.1 70B', contextWindow: 128_000, capabilities: ['chat', 'tools'] },
  { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', displayName: 'Nemotron Ultra 253B', contextWindow: 128_000, capabilities: ['chat', 'tools'] },
  { id: 'mistralai/mistral-large-2-instruct', displayName: 'Mistral Large 2', contextWindow: 131_072, capabilities: ['chat', 'tools'] },
]

export class NvidiaNimAdapter implements ProviderAdapter {
  readonly config: ProviderConfig
  private client

  constructor(apiKey: string, config?: Partial<ProviderConfig>) {
    this.client = createOpenAI({
      apiKey,
      baseURL: config?.baseUrl ?? NVIDIA_NIM_BASE_URL,
      compatibility: 'compatible',
    })
    this.config = {
      id: 'nvidia-nim',
      type: 'nvidia-nim',
      displayName: 'NVIDIA NIM',
      defaultModel: 'meta/llama-3.1-8b-instruct',
      baseUrl: NVIDIA_NIM_BASE_URL,
      capabilities: ['chat', 'tools'],
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
