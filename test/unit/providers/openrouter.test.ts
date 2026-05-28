import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenRouterAdapter } from '../../../src/providers/openrouter.js'

describe('OpenRouterAdapter.listModels', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches and maps the OpenRouter model catalog', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'openai/gpt-4o',
                name: 'OpenAI: GPT-4o',
                context_length: 128_000,
                architecture: {
                  input_modalities: ['text', 'image'],
                  output_modalities: ['text'],
                },
                pricing: {
                  prompt: '0.000001',
                  completion: '0.000002',
                },
                supported_parameters: ['tools', 'response_format'],
              },
              {
                id: 'openrouter/auto',
                name: 'Auto Router',
                context_length: 2_000_000,
                architecture: {
                  input_modalities: ['text'],
                  output_modalities: ['text'],
                },
                pricing: {
                  prompt: '-1',
                  completion: '-1',
                },
                supported_parameters: [],
              },
            ],
          }),
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const adapter = new OpenRouterAdapter('test-key')
    const models = await adapter.listModels()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'HTTP-Referer': 'https://github.com/yasmina-hot/bluetonomous-cli',
          'X-Title': 'bluetonomous-cli',
        }),
      }),
    )
    expect(models).toEqual([
      {
        id: 'openai/gpt-4o',
        displayName: 'OpenAI: GPT-4o',
        contextWindow: 128_000,
        capabilities: ['chat', 'vision', 'tools', 'json-mode'],
        inputCostPer1k: 0.001,
        outputCostPer1k: 0.002,
      },
      {
        id: 'openrouter/auto',
        displayName: 'Auto Router',
        contextWindow: 2_000_000,
        capabilities: ['chat'],
        inputCostPer1k: undefined,
        outputCostPer1k: undefined,
      },
    ])
  })

  it('falls back to bundled models when the catalog cannot be fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )

    const adapter = new OpenRouterAdapter('test-key')
    const models = await adapter.listModels()

    expect(models.some((model) => model.id === 'openai/gpt-4o')).toBe(true)
    expect(
      models.some((model) => model.id === 'anthropic/claude-sonnet-4-6'),
    ).toBe(true)
  })
})
