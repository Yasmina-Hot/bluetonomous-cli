import { Args, Command, Flags } from '@oclif/core'
import ora from 'ora'

export default class ProviderTest extends Command {
  static description = 'Test connectivity and authentication for a provider'
  static examples = ['<%= config.bin %> provider test anthropic', '<%= config.bin %> provider test openai --model gpt-4o']

  static args = {
    provider: Args.string({ description: 'Provider ID to test', required: true }),
  }

  static flags = {
    model: Flags.string({ char: 'm', description: 'Model to use for test' }),
    json: Flags.boolean({ description: 'Output as JSON' }),
  }

  async run() {
    const { args, flags } = await this.parse(ProviderTest)
    const { providerRegistry } = await import('../../providers/registry.js')

    const adapter = providerRegistry.get(args.provider)
    if (!adapter) {
      this.error(`Provider "${args.provider}" not configured. Add a key first: bt keys set ${args.provider}`)
    }

    const model = flags.model ?? adapter.config.defaultModel ?? 'unknown'
    const spinner = ora(`Testing ${args.provider} with model ${model}...`).start()
    const start = Date.now()

    try {
      const result = await adapter.generateText({
        model,
        messages: [{ role: 'user', content: 'Say "OK" and nothing else.' }],
        maxTokens: 10,
      })

      const duration = Date.now() - start
      spinner.succeed(`${args.provider} is working (${duration}ms)`)

      if (flags.json) {
        this.log(JSON.stringify({ provider: args.provider, model, ok: true, response: result.text, durationMs: duration }))
      } else {
        this.log(`Response: ${result.text}`)
        this.log(`Tokens:   ${result.usage?.inputTokens ?? '?'} in / ${result.usage?.outputTokens ?? '?'} out`)
      }
    } catch (err) {
      const duration = Date.now() - start
      const message = err instanceof Error ? err.message : String(err)
      spinner.fail(`${args.provider} test failed (${duration}ms): ${message}`)

      if (flags.json) {
        this.log(JSON.stringify({ provider: args.provider, model, ok: false, error: message, durationMs: duration }))
      }

      this.exit(1)
    }
  }
}
