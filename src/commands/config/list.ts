import { Command, Flags } from '@oclif/core'

export default class ConfigList extends Command {
  static description = 'List all configuration values'
  static examples = ['<%= config.bin %> config list', '<%= config.bin %> config list --json']

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
  }

  async run() {
    const { flags } = await this.parse(ConfigList)
    const { config } = await import('../../config/manager.js')

    const all = config.getAll()

    if (flags.json) {
      this.log(JSON.stringify(all, null, 2))
      return
    }

    this.log(`Config file: ${config.configPath}\n`)
    printObject(all, '', this.log.bind(this))
  }
}

function printObject(obj: unknown, prefix: string, log: (s: string) => void): void {
  if (typeof obj !== 'object' || obj === null) {
    log(`${prefix} = ${JSON.stringify(obj)}`)
    return
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      printObject(v, key, log)
    } else {
      log(`${key.padEnd(30)} = ${JSON.stringify(v)}`)
    }
  }
}
