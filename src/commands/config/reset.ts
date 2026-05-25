import { Args, Command, Flags } from '@oclif/core'
import { confirm } from '@clack/prompts'

export default class ConfigReset extends Command {
  static description = 'Reset configuration to defaults'
  static examples = ['<%= config.bin %> config reset', '<%= config.bin %> config reset defaultModel', '<%= config.bin %> config reset --all']

  static args = {
    key: Args.string({ description: 'Specific key to reset (omit to reset all)', required: false }),
  }

  static flags = {
    all: Flags.boolean({ description: 'Reset all config' }),
    force: Flags.boolean({ char: 'f', description: 'Skip confirmation' }),
  }

  async run() {
    const { args, flags } = await this.parse(ConfigReset)
    const { config } = await import('../../config/manager.js')

    if (!flags.force) {
      const target = args.key ? `"${args.key}"` : 'all configuration'
      const ok = await confirm({ message: `Reset ${target} to defaults?` })
      if (!ok) {
        this.log('Cancelled.')
        return
      }
    }

    if (args.key) {
      config.reset(args.key as Parameters<typeof config.reset>[0])
      this.log(`✓ Reset "${args.key}" to default`)
    } else {
      config.reset()
      this.log('✓ All configuration reset to defaults')
    }
  }
}
