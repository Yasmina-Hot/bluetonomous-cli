import { Command, Flags } from '@oclif/core'

export default class ModelList extends Command {
  static description = 'List available models for a provider'
  static examples = [
    '<%= config.bin %> model list',
    '<%= config.bin %> model list --provider anthropic',
    '<%= config.bin %> model list --json',
  ]

  static flags = {
    provider: Flags.string({ char: 'p', description: 'Filter by provider ID' }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  }

  async run() {
    const { flags } = await this.parse(ModelList)
    const { providerRegistry } = await import('../../providers/registry.js')

    const adapters = flags.provider
      ? [{ id: flags.provider, adapter: providerRegistry.get(flags.provider) }].filter((a) => a.adapter)
      : providerRegistry.list()

    if (adapters.length === 0) {
      this.error('No providers configured. Add a key: bt keys set <provider>')
    }

    const allModels: Array<{ provider: string; id: string; displayName?: string; contextWindow?: number; capabilities: string[] }> = []

    for (const { id, adapter } of adapters) {
      if (!adapter) continue
      const models = (await adapter.listModels?.()) ?? []
      for (const m of models) {
        allModels.push({ provider: id, ...m, capabilities: m.capabilities as string[] })
      }
    }

    if (flags.json) {
      this.log(JSON.stringify(allModels, null, 2))
      return
    }

    let currentProvider = ''
    for (const m of allModels) {
      if (m.provider !== currentProvider) {
        if (currentProvider) this.log('')
        this.log(`\n${m.provider.toUpperCase()}`)
        this.log('─'.repeat(60))
        currentProvider = m.provider
      }
      const ctx = m.contextWindow ? ` (${(m.contextWindow / 1000).toFixed(0)}k ctx)` : ''
      const caps = m.capabilities.join(', ')
      this.log(`  ${m.id.padEnd(45)} ${ctx.padEnd(12)} [${caps}]`)
    }
  }
}
