import { Args, Command, Flags } from '@oclif/core'
import { password } from '@clack/prompts'

export default class KeysSet extends Command {
  static description = 'Store an API key for a provider'
  static examples = ['<%= config.bin %> keys set anthropic', '<%= config.bin %> keys set openai --value sk-...']

  static args = {
    provider: Args.string({ description: 'Provider ID (anthropic, openai, google, groq, openrouter, nvidia-nim)', required: true }),
  }

  static flags = {
    value: Flags.string({ char: 'v', description: 'API key value (prompts if not provided)', env: 'BTM_KEY_VALUE' }),
  }

  async run() {
    const { args, flags } = await this.parse(KeysSet)
    const { keys } = await import('../../keys/manager.js')

    let apiKey = flags.value
    if (!apiKey) {
      const result = await password({
        message: `Enter API key for ${args.provider}:`,
        mask: '*',
      })
      if (typeof result !== 'string' || !result) {
        this.error('No API key provided.')
      }
      apiKey = result
    }

    const backend = await keys.set(args.provider, apiKey)
    this.log(`✓ API key stored for "${args.provider}" (${backend})`)
  }
}
