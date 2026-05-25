import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import type { Message, ProviderAdapter } from '../providers/types.js'

export default class Chat extends Command {
  static description = 'Start an interactive AI chat session'
  static examples = [
    '<%= config.bin %> chat',
    '<%= config.bin %> chat --provider anthropic --model claude-opus-4-7',
    '<%= config.bin %> chat --system "You are a senior engineer. Be concise."',
    'echo "explain closures" | <%= config.bin %> chat --no-stream',
  ]

  static flags = {
    provider: Flags.string({ char: 'p', description: 'AI provider to use', env: 'BTM_PROVIDER' }),
    model: Flags.string({ char: 'm', description: 'Model ID to use', env: 'BTM_MODEL' }),
    system: Flags.string({ char: 's', description: 'System prompt', env: 'BTM_SYSTEM' }),
    'no-stream': Flags.boolean({ description: 'Disable streaming (wait for full response)' }),
    temperature: Flags.string({ description: 'Sampling temperature (0-2)', default: undefined }),
    'max-tokens': Flags.integer({ description: 'Maximum tokens in response' }),
    json: Flags.boolean({ description: 'Output responses as JSON (non-interactive)' }),
  }

  async run() {
    const { flags } = await this.parse(Chat)
    const { providerRegistry } = await import('../providers/registry.js')
    const { config } = await import('../config/manager.js')

    const providerId = flags.provider ?? config.get('defaultProvider') ?? 'anthropic'
    const adapter = providerRegistry.get(providerId)

    if (!adapter) {
      this.error(
        `Provider "${providerId}" is not configured.\n` +
          `  Add an API key: bt keys set ${providerId}\n` +
          `  List providers: bt provider list`,
      )
    }

    const model = flags.model ?? adapter.config.defaultModel ?? 'unknown'
    const isInteractive = process.stdin.isTTY
    const isPiped = !isInteractive

    if (isPiped) {
      // Non-interactive: read stdin, respond once, exit
      await this.handlePipedInput(adapter, model, flags)
    } else {
      // Interactive REPL
      await this.runInteractiveChat(adapter, model, flags)
    }
  }

  private async handlePipedInput(
    adapter: ProviderAdapter,
    model: string,
    flags: Awaited<ReturnType<typeof this.parse>>['flags'],
  ) {
    const { config } = await import('../config/manager.js')
    const input = await readStdin()
    if (!input.trim()) {
      this.error('No input provided via stdin.')
    }

    const messages: Message[] = [{ role: 'user', content: input }]
    const system = flags.system ?? undefined
    const temp = flags.temperature ? Number.parseFloat(flags.temperature) : config.get('temperature')

    if (flags['no-stream']) {
      const result = await adapter.generateText({ model, messages, system, temperature: temp, maxTokens: flags['max-tokens'] })
      if (flags.json) {
        this.log(JSON.stringify({ text: result.text, usage: result.usage }))
      } else {
        this.log(result.text)
      }
    } else {
      let fullText = ''
      for await (const chunk of adapter!.streamText({ model, messages, system, temperature: temp, maxTokens: flags['max-tokens'] })) {
        if (chunk.type === 'text' && chunk.text) {
          process.stdout.write(chunk.text)
          fullText += chunk.text
        }
      }
      if (fullText && !fullText.endsWith('\n')) process.stdout.write('\n')
    }
  }

  private async runInteractiveChat(
    adapter: ProviderAdapter,
    model: string,
    flags: Awaited<ReturnType<typeof this.parse>>['flags'],
  ) {
    const { config } = await import('../config/manager.js')
    const readline = await import('node:readline')

    const messages: Message[] = []
    const system = flags.system ?? undefined
    const temp = flags.temperature ? Number.parseFloat(flags.temperature) : config.get('temperature')
    const stream = !flags['no-stream'] && config.get('streamingEnabled') !== false

    process.stdout.write(chalk.dim(`bluetonomous `) + chalk.cyan(`${adapter!.config.displayName}`) + chalk.dim(` / ${model}\n`))
    process.stdout.write(chalk.dim('Type your message. Enter twice to send. Ctrl+C or /exit to quit.\n\n'))

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })

    const askQuestion = () =>
      new Promise<string | null>((resolve) => {
        process.stdout.write(chalk.green('You: '))
        let lines: string[] = []
        let lastWasEmpty = false

        const onLine = (line: string) => {
          if (line === '' && lastWasEmpty) {
            rl.removeListener('line', onLine)
            resolve(lines.slice(0, -1).join('\n').trim() || null)
            return
          }
          if (line === '/exit' || line === '/quit') {
            rl.removeListener('line', onLine)
            resolve(null)
            return
          }
          lastWasEmpty = line === ''
          lines.push(line)
        }

        rl.on('line', onLine)
      })

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const input = await askQuestion()

      if (input === null) {
        process.stdout.write(chalk.dim('\nGoodbye!\n'))
        rl.close()
        break
      }

      if (!input) continue

      messages.push({ role: 'user', content: input })
      process.stdout.write(chalk.blue('\nAssistant: '))

      try {
        let assistantText = ''

        if (stream) {
          for await (const chunk of adapter.streamText({ model, messages, system, temperature: temp, maxTokens: flags['max-tokens'] })) {
            if (chunk.type === 'text' && chunk.text) {
              process.stdout.write(chunk.text)
              assistantText += chunk.text
            }
          }
        } else {
          const result = await adapter.generateText({ model, messages, system, temperature: temp, maxTokens: flags['max-tokens'] })
          process.stdout.write(result.text)
          assistantText = result.text
        }

        if (assistantText && !assistantText.endsWith('\n')) process.stdout.write('\n')
        process.stdout.write('\n')

        messages.push({ role: 'assistant', content: assistantText })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        process.stdout.write(chalk.red(`\nError: ${message}\n\n`))
      }
    }
  }
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => { data += chunk })
    process.stdin.on('end', () => resolve(data))
  })
}
