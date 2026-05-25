import { Args, Command, Flags } from '@oclif/core'
import { confirm } from '@clack/prompts'

export default class KeysDelete extends Command {
  static description = 'Delete a stored API key'
  static examples = ['<%= config.bin %> keys delete anthropic', '<%= config.bin %> keys delete openai --force']

  static args = {
    provider: Args.string({ description: 'Provider ID', required: true }),
  }

  static flags = {
    force: Flags.boolean({ char: 'f', description: 'Skip confirmation prompt' }),
  }

  async run() {
    const { args, flags } = await this.parse(KeysDelete)
    const { keys } = await import('../../keys/manager.js')

    if (!flags.force) {
      const ok = await confirm({ message: `Delete API key for "${args.provider}"?` })
      if (!ok) {
        this.log('Cancelled.')
        return
      }
    }

    await keys.delete(args.provider)
    this.log(`✓ API key deleted for "${args.provider}"`)
  }
}
