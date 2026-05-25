import { Args, Command, Flags } from '@oclif/core'
import { password } from '@clack/prompts'

export default class KeysRotate extends Command {
  static description = 'Rotate (replace) an API key for a provider'
  static examples = ['<%= config.bin %> keys rotate anthropic']

  static args = {
    provider: Args.string({ description: 'Provider ID', required: true }),
  }

  static flags = {
    value: Flags.string({ char: 'v', description: 'New API key value' }),
  }

  async run() {
    const { args, flags } = await this.parse(KeysRotate)
    const { keys } = await import('../../keys/manager.js')

    let apiKey = flags.value
    if (!apiKey) {
      const result = await password({ message: `Enter new API key for ${args.provider}:`, mask: '*' })
      if (typeof result !== 'string' || !result) {
        this.error('No API key provided.')
      }
      apiKey = result
    }

    await keys.delete(args.provider)
    const backend = await keys.set(args.provider, apiKey)
    this.log(`✓ API key rotated for "${args.provider}" (stored in ${backend})`)
  }
}
