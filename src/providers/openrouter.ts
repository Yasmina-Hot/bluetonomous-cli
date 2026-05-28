import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'
import type {
  ModelInfo,
  ProviderAdapter,
  ProviderCapability,
  ProviderConfig,
  TextChunk,
  TextRequest,
  TextResponse,
  ObjectRequest,
} from './types.js'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const OPENROUTER_REFERER = 'https://github.com/yasmina-hot/bluetonomous-cli'
const OPENROUTER_TITLE = 'bluetonomous-cli'

const FALLBACK_MODELS: ModelInfo[] = [
  {
    id: 'anthropic/claude-opus-4-7',
    displayName: 'Claude Opus 4.7 (via OR)',
    contextWindow: 200_000,
    capabilities: ['chat', 'vision', 'tools'],
  },
  {
    id: 'anthropic/claude-sonnet-4-6',
    displayName: 'Claude Sonnet 4.6 (via OR)',
    contextWindow: 200_000,
    capabilities: ['chat', 'vision', 'tools'],
  },
  {
    id: 'openai/gpt-4o',
    displayName: 'GPT-4o (via OR)',
    contextWindow: 128_000,
    capabilities: ['chat', 'vision', 'tools'],
  },
  {
    id: 'google/gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro (via OR)',
    contextWindow: 1_048_576,
    capabilities: ['chat', 'vision', 'tools'],
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    displayName: 'Llama 3.3 70B (via OR)',
    contextWindow: 131_072,
    capabilities: ['chat', 'tools'],
  },
]

type OpenRouterModel = {
  id?: string
  name?: string
  context_length?: number
  architecture?: {
    input_modalities?: string[]
    output_modalities?: string[]
  }
  pricing?: {
    prompt?: string
    completion?: string
  }
  supported_parameters?: string[]
}

type OpenRouterModelsResponse = {
  data?: OpenRouterModel[]
}

export class OpenRouterAdapter implements ProviderAdapter {
  readonly config: ProviderConfig
  private client
  private apiKey: string

  constructor(apiKey: string, config?: Partial<ProviderConfig>) {
    this.apiKey = apiKey
    this.client = createOpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      compatibility: 'compatible',
      headers: {
        'HTTP-Referer': OPENROUTER_REFERER,
        'X-Title': OPENROUTER_TITLE,
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
        yield {
          type: 'finish',
          finishReason: chunk.finishReason as TextChunk['finishReason'],
        }
      }
    }

    const usage = await result.usage
    if (usage) {
      yield {
        type: 'usage',
        usage: {
          inputTokens: usage.promptTokens,
          outputTokens: usage.completionTokens,
        },
      }
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
      usage: {
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
      },
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
    try {
      const resp = await fetch(`${OPENROUTER_BASE_URL}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': OPENROUTER_REFERER,
          'X-Title': OPENROUTER_TITLE,
        },
        signal: AbortSignal.timeout(5000),
      })

      if (!resp.ok) return FALLBACK_MODELS

      const data = (await resp.json()) as OpenRouterModelsResponse
      const models = (data.data ?? [])
        .map(mapOpenRouterModel)
        .filter((model): model is ModelInfo => model !== null)
      return models.length > 0 ? models : FALLBACK_MODELS
    } catch {
      return FALLBACK_MODELS
    }
  }
}

function mapOpenRouterModel(model: OpenRouterModel): ModelInfo | null {
  if (!model.id) return null

  return {
    id: model.id,
    displayName: model.name,
    contextWindow: model.context_length,
    capabilities: getCapabilities(model),
    inputCostPer1k: costPer1kTokens(model.pricing?.prompt),
    outputCostPer1k: costPer1kTokens(model.pricing?.completion),
  }
}

function getCapabilities(model: OpenRouterModel): ProviderCapability[] {
  const capabilities: ProviderCapability[] = ['chat']
  const inputModalities = new Set(model.architecture?.input_modalities ?? [])
  const supportedParameters = new Set(model.supported_parameters ?? [])

  if (inputModalities.has('image')) capabilities.push('vision')
  if (
    supportedParameters.has('tools') ||
    supportedParameters.has('tool_choice')
  ) {
    capabilities.push('tools')
  }
  if (
    supportedParameters.has('response_format') ||
    supportedParameters.has('structured_outputs')
  ) {
    capabilities.push('json-mode')
  }

  return capabilities
}

function costPer1kTokens(costPerToken?: string): number | undefined {
  if (!costPerToken) return undefined
  const parsed = Number(costPerToken)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed * 1000 : undefined
}
