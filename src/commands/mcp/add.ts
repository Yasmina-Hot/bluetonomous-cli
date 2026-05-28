import { Args, Command, Flags } from '@oclif/core'
import type { MCPServerConfig } from '../../config/schema.js'

export default class McpAdd extends Command {
  static description = 'Add an MCP server connection'
  static examples = [
    '<%= config.bin %> mcp add github --stdio "npx @modelcontextprotocol/server-github"',
    '<%= config.bin %> mcp add myserver --sse https://my-server.example.com/sse',
    '<%= config.bin %> mcp add localfs --stdio "npx @modelcontextprotocol/server-filesystem /home/user"',
  ]

  static args = {
    name: Args.string({ description: 'Unique name for this MCP server', required: true }),
  }

  static flags = {
    stdio: Flags.string({ description: 'Shell command for stdio transport (e.g. "npx @mcp/server-github")' }),
    sse: Flags.string({ description: 'SSE endpoint URL' }),
    http: Flags.string({ description: 'HTTP endpoint URL' }),
    env: Flags.string({ description: 'Environment variable (KEY=VALUE)', multiple: true }),
    disabled: Flags.boolean({ description: 'Add server but disable auto-connect' }),
  }

  async run() {
    const { args, flags } = await this.parse(McpAdd)
    const { config } = await import('../../config/manager.js')

    if (!flags.stdio && !flags.sse && !flags.http) {
      this.error('Specify a transport: --stdio <command>, --sse <url>, or --http <url>')
    }

    const envVars: Record<string, string> = {}
    for (const envEntry of flags.env ?? []) {
      const eqIdx = envEntry.indexOf('=')
      if (eqIdx < 0) this.error(`Invalid env format "${envEntry}" — use KEY=VALUE`)
      envVars[envEntry.slice(0, eqIdx)] = envEntry.slice(eqIdx + 1)
    }

    let serverConfig: MCPServerConfig
    if (flags.stdio) {
      const [command, ...args_] = flags.stdio.split(' ')
      serverConfig = {
        transport: 'stdio',
        command,
        args: args_,
        env: envVars,
        headers: {},
        enabled: !flags.disabled,
        autoConnect: !flags.disabled,
        timeout: 30_000,
      }
    } else if (flags.sse) {
      serverConfig = {
        transport: 'sse',
        url: flags.sse,
        headers: {},
        env: {},
        args: [],
        enabled: !flags.disabled,
        autoConnect: !flags.disabled,
        timeout: 30_000,
      }
    } else {
      serverConfig = {
        transport: 'http',
        url: flags.http,
        headers: {},
        env: {},
        args: [],
        enabled: !flags.disabled,
        autoConnect: !flags.disabled,
        timeout: 30_000,
      }
    }

    const existing = config.get('mcpServers') ?? {}
    existing[args.name] = serverConfig
    config.set('mcpServers', existing)

    this.log(`✓ MCP server "${args.name}" added (${serverConfig.transport})`)
    this.log(`  Inspect tools: bt mcp inspect ${args.name}`)
  }
}
