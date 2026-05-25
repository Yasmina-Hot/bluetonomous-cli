import { Command, Flags } from '@oclif/core'

const ALL_PROVIDERS = [
  { id: 'anthropic', displayName: 'Anthropic', models: 'Claude Opus/Sonnet/Haiku' },
  { id: 'openai', displayName: 'OpenAI', models: 'GPT-4o, o3, o4-mini, DALL-E' },
  { id: 'google', displayName: 'Google Gemini', models: 'Gemini 2.0/2.5 Pro & Flash' },
  { id: 'groq', displayName: 'Groq', models: 'Llama 3.3, Mixtral (ultra-fast)' },
  { id: 'ollama', displayName: 'Ollama (Local)', models: 'Any locally installed model' },
  { id: 'openrouter', displayName: 'OpenRouter', models: '300+ models via unified API' },
  { id: 'nvidia-nim', displayName: 'NVIDIA NIM', models: 'Llama, Nemotron, Mistral' },
]

export default class ProviderList extends Command {
  static description = 'List all supported AI providers and their auth status'
  static examples = ['<%= config.bin %> provider list', '<%= config.bin %> provider list --json']

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
  }

  async run() {
    const { flags } = await this.parse(ProviderList)
    const { keys } = await import('../../keys/manager.js')
    const { config } = await import('../../config/manager.js')
    const { providerRegistry } = await import('../../providers/registry.js')

    const keyEntries = await keys.list()
    const keyMap = new Map(keyEntries.map((e) => [e.providerId, e.backend]))
    const defaultProvider = config.get('defaultProvider')

    const rows = ALL_PROVIDERS.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      models: p.models,
      auth: keyMap.has(p.id) ? `✓ (${keyMap.get(p.id)})` : p.id === 'ollama' ? '✓ (local)' : '✗ not set',
      ready: providerRegistry.has(p.id),
      default: p.id === defaultProvider,
    }))

    if (flags.json) {
      this.log(JSON.stringify(rows, null, 2))
      return
    }

    this.log('\nAI Providers\n' + '─'.repeat(80))
    for (const row of rows) {
      const marker = row.default ? ' (default)' : ''
      const status = row.ready ? '●' : '○'
      this.log(`${status} ${row.id.padEnd(14)} ${row.displayName.padEnd(20)} ${row.auth}${marker}`)
      this.log(`  Models: ${row.models}`)
    }
    this.log('\n● = ready to use  ○ = needs API key\n')
    this.log(`Set a key:      bt keys set <provider>`)
    this.log(`Set default:    bt provider set-default <provider>`)
  }
}
