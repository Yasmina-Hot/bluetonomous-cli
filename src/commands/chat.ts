import { Command, Flags } from '@oclif/core'
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

    const configuredDefault = config.get('defaultProvider')
    const fallbackProvider = providerRegistry.has('anthropic')
      ? 'anthropic'
      : (providerRegistry.list()[0]?.id ?? 'anthropic')
    const providerId = flags.provider ?? configuredDefault ?? fallbackProvider
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
    } else if (process.stdout.isTTY) {
      await this.runInteractiveChat(adapter, model, flags)
    } else {
      this.error('Interactive chat requires a TTY. Pipe input into chat or run it in a terminal.')
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
    const system = flags.system ?? undefined
    const temp = flags.temperature ? Number.parseFloat(flags.temperature) : config.get('temperature')
    const stream = !flags['no-stream'] && config.get('streamingEnabled') !== false
    const { runChatTui } = await import('../tui/chat.js')

    await runChatTui({
      adapter,
      model,
      system,
      temperature: temp,
      maxTokens: flags['max-tokens'],
      stream,
    })
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
