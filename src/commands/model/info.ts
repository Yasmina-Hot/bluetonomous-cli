import { Args, Command, Flags } from '@oclif/core'

export default class ModelInfo extends Command {
  static description = 'Show details about a specific model'
  static examples = [
    '<%= config.bin %> model info claude-sonnet-4-6',
    '<%= config.bin %> model info anthropic/claude-opus-4-7 --json',
  ]

  static args = {
    model: Args.string({ description: 'Model ID (optionally prefixed with provider/)', required: true }),
  }

  static flags = {
    provider: Flags.string({ char: 'p', description: 'Provider ID to search in' }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  }

  async run() {
    const { args, flags } = await this.parse(ModelInfo)
    const { providerRegistry } = await import('../../providers/registry.js')

    // Support "provider/model" shorthand
    let modelId = args.model
    let providerId = flags.provider
    if (args.model.includes('/') && !providerId) {
      const [p, ...rest] = args.model.split('/')
      providerId = p
      modelId = rest.join('/')
    }

    const adapters = providerId
      ? [{ id: providerId, adapter: providerRegistry.get(providerId) }].filter((a) => a.adapter)
      : providerRegistry.list()

    for (const { id, adapter } of adapters) {
      if (!adapter) continue
      const models = (await adapter.listModels?.()) ?? []
      const found = models.find((m) => m.id === modelId)
      if (found) {
        if (flags.json) {
          this.log(JSON.stringify({ provider: id, ...found }, null, 2))
        } else {
          this.log(`Model:          ${found.id}`)
          this.log(`Provider:       ${id}`)
          if (found.displayName) this.log(`Display Name:   ${found.displayName}`)
          if (found.contextWindow) this.log(`Context Window: ${found.contextWindow.toLocaleString()} tokens`)
          this.log(`Capabilities:   ${found.capabilities.join(', ')}`)
          if (found.inputCostPer1k) this.log(`Input cost:     $${found.inputCostPer1k}/1K tokens`)
          if (found.outputCostPer1k) this.log(`Output cost:    $${found.outputCostPer1k}/1K tokens`)
        }
        return
      }
    }

    this.error(`Model "${args.model}" not found. Run: bt model list`)
  }
}
