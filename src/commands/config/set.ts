import { Args, Command } from '@oclif/core'

export default class ConfigSet extends Command {
  static description = 'Set a configuration value'
  static examples = [
    '<%= config.bin %> config set defaultProvider anthropic',
    '<%= config.bin %> config set defaultModel claude-sonnet-4-6',
    '<%= config.bin %> config set temperature 0.5',
  ]

  static args = {
    key: Args.string({ description: 'Config key', required: true }),
    value: Args.string({ description: 'Config value', required: true }),
  }

  async run() {
    const { args } = await this.parse(ConfigSet)
    const { config } = await import('../../config/manager.js')

    const parsed = parseValue(args.value)
    config.set(args.key as Parameters<typeof config.set>[0], parsed as never)
    this.log(`✓ Set ${args.key} = ${JSON.stringify(parsed)}`)
  }
}

function parseValue(raw: string): unknown {
  if (raw === 'true') return true
  if (raw === 'false') return false
  const n = Number(raw)
  if (!Number.isNaN(n) && raw.trim() !== '') return n
  return raw
}
