import { Args, Command, Flags } from '@oclif/core'

export default class ConfigGet extends Command {
  static description = 'Get a configuration value'
  static examples = ['<%= config.bin %> config get defaultProvider', '<%= config.bin %> config get temperature']

  static args = {
    key: Args.string({ description: 'Config key', required: true }),
  }

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
  }

  async run() {
    const { args, flags } = await this.parse(ConfigGet)
    const { config } = await import('../../config/manager.js')

    const value = config.get(args.key as Parameters<typeof config.get>[0])
    if (value === undefined) {
      this.error(`Config key "${args.key}" not found`)
    }

    if (flags.json) {
      this.log(JSON.stringify({ key: args.key, value }))
    } else {
      this.log(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))
    }
  }
}
