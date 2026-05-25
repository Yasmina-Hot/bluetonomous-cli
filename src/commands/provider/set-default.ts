import { Args, Command } from '@oclif/core'
import type { ProviderType } from '../../config/schema.js'

const VALID_PROVIDERS: ProviderType[] = ['anthropic', 'openai', 'google', 'ollama', 'openrouter', 'groq', 'nvidia-nim']

export default class ProviderSetDefault extends Command {
  static description = 'Set the default AI provider'
  static examples = ['<%= config.bin %> provider set-default anthropic', '<%= config.bin %> provider set-default openai']

  static args = {
    provider: Args.string({ description: `Provider ID (${VALID_PROVIDERS.join(', ')})`, required: true }),
  }

  async run() {
    const { args } = await this.parse(ProviderSetDefault)
    const { config } = await import('../../config/manager.js')

    if (!VALID_PROVIDERS.includes(args.provider as ProviderType)) {
      this.error(`Unknown provider "${args.provider}". Valid: ${VALID_PROVIDERS.join(', ')}`)
    }

    config.set('defaultProvider', args.provider as ProviderType)
    this.log(`✓ Default provider set to "${args.provider}"`)
  }
}
