import { Args, Command, Flags } from '@oclif/core'
import { maskKey } from '../../utils/format.js'

export default class KeysGet extends Command {
  static description = 'Show stored API key info for a provider'
  static examples = ['<%= config.bin %> keys get anthropic', '<%= config.bin %> keys get openai --reveal']

  static args = {
    provider: Args.string({ description: 'Provider ID', required: true }),
  }

  static flags = {
    reveal: Flags.boolean({ description: 'Show full key (use with caution)' }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  }

  async run() {
    const { args, flags } = await this.parse(KeysGet)
    const { keys } = await import('../../keys/manager.js')

    const apiKey = await keys.get(args.provider)
    if (!apiKey) {
      this.error(`No API key found for "${args.provider}". Set one with: bt keys set ${args.provider}`)
    }

    const display = flags.reveal ? apiKey : maskKey(apiKey)
    const envVar = keys.getEnvVarName(args.provider)
    const entries = await keys.list()
    const entry = entries.find((e) => e.providerId === args.provider)
    const backend = entry?.backend ?? 'unknown'

    if (flags.json) {
      this.log(JSON.stringify({ provider: args.provider, key: display, backend }))
      return
    }

    this.log(`Provider:  ${args.provider}`)
    this.log(`Key:       ${display}`)
    this.log(`Backend:   ${backend}`)
    this.log(`Env var:   ${envVar}`)
  }
}
