import { Hook } from '@oclif/core'

// Load config and bootstrap provider adapters before any command runs
const hook: Hook<'init'> = async function () {
  const { config } = await import('../../config/manager.js')
  const { keys } = await import('../../keys/manager.js')
  const { providerRegistry } = await import('../../providers/registry.js')

  const { AnthropicAdapter } = await import('../../providers/anthropic.js')
  const { OpenAIAdapter } = await import('../../providers/openai.js')
  const { GoogleAdapter } = await import('../../providers/google.js')
  const { GroqAdapter } = await import('../../providers/groq.js')
  const { OllamaAdapter } = await import('../../providers/ollama.js')
  const { OpenRouterAdapter } = await import('../../providers/openrouter.js')
  const { NvidiaNimAdapter } = await import('../../providers/nvidia-nim.js')

  const adapterMap: Record<string, (apiKey: string, baseUrl?: string) => InstanceType<typeof AnthropicAdapter>> = {
    anthropic: (key) => new AnthropicAdapter(key) as unknown as InstanceType<typeof AnthropicAdapter>,
    openai: (key) => new OpenAIAdapter(key) as unknown as InstanceType<typeof AnthropicAdapter>,
    google: (key) => new GoogleAdapter(key) as unknown as InstanceType<typeof AnthropicAdapter>,
    groq: (key) => new GroqAdapter(key) as unknown as InstanceType<typeof AnthropicAdapter>,
    openrouter: (key) => new OpenRouterAdapter(key) as unknown as InstanceType<typeof AnthropicAdapter>,
    'nvidia-nim': (key) => new NvidiaNimAdapter(key) as unknown as InstanceType<typeof AnthropicAdapter>,
  }

  // Register providers that have API keys
  for (const [providerId, factory] of Object.entries(adapterMap)) {
    const apiKey = await keys.get(providerId)
    if (apiKey) {
      providerRegistry.register(providerId, factory(apiKey) as unknown as Parameters<typeof providerRegistry.register>[1])
    }
  }

  // Always register Ollama (no API key needed)
  if (!providerRegistry.has('ollama')) {
    const ollamaConfig = config.get('providers')?.['ollama']
    providerRegistry.register('ollama', new OllamaAdapter(ollamaConfig?.baseUrl) as unknown as Parameters<typeof providerRegistry.register>[1])
  }
}

export default hook
