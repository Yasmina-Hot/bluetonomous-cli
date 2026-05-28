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
  EmbeddingRequest,
  ImageGenRequest,
  ImageGenResult,
} from './types.js'

const KNOWN_MODELS: ModelInfo[] = [
  { id: 'gpt-4o', displayName: 'GPT-4o', contextWindow: 128_000, capabilities: ['chat', 'vision', 'tools', 'json-mode'] },
  { id: 'gpt-4o-mini', displayName: 'GPT-4o Mini', contextWindow: 128_000, capabilities: ['chat', 'vision', 'tools', 'json-mode'] },
  { id: 'o3', displayName: 'o3', contextWindow: 200_000, capabilities: ['chat', 'tools'] },
  { id: 'o4-mini', displayName: 'o4 Mini', contextWindow: 200_000, capabilities: ['chat', 'tools'] },
]

export class OpenAIAdapter implements ProviderAdapter {
  readonly config: ProviderConfig
  private client

  constructor(apiKey: string, config?: Partial<ProviderConfig> & { baseUrl?: string }) {
    this.client = createOpenAI({ apiKey, baseURL: config?.baseUrl })
    this.config = {
      id: 'openai',
      type: 'openai',
      displayName: 'OpenAI',
      defaultModel: 'gpt-4o',
      capabilities: ['chat', 'vision', 'tools', 'json-mode', 'embeddings', 'image-gen', 'stt', 'tts'],
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

  async createEmbedding(req: EmbeddingRequest): Promise<number[][]> {
    const { embedMany } = await import('ai')
    const inputs = Array.isArray(req.input) ? req.input : [req.input]
    const result = await embedMany({
      model: this.client.embedding(req.model),
      values: inputs,
    })
    return result.embeddings
  }

  async generateImage(req: ImageGenRequest): Promise<ImageGenResult> {
    // Use OpenAI SDK directly for image generation
    const openai = (await import('openai')).default
    const client = new openai({ apiKey: this.config.id })
    const result = await (client as unknown as { images: { generate: (p: Record<string, unknown>) => Promise<{ data: Array<{ url?: string; b64_json?: string }> }> } }).images.generate({
      model: req.model,
      prompt: req.prompt,
      size: req.size ?? '1024x1024',
      quality: req.quality ?? 'standard',
      n: req.n ?? 1,
    })
    return {
      images: result.data.map((d: { url?: string; b64_json?: string }) => ({
        url: d.url,
        base64: d.b64_json,
      })),
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return KNOWN_MODELS
  }
}
