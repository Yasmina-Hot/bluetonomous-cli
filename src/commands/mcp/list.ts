import { Command, Flags } from '@oclif/core'

export default class McpList extends Command {
  static description = 'List configured MCP servers'
  static examples = ['<%= config.bin %> mcp list', '<%= config.bin %> mcp list --json']

  static flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
  }

  async run() {
    const { flags } = await this.parse(McpList)
    const { config } = await import('../../config/manager.js')

    const servers = config.get('mcpServers') ?? {}
    const entries = Object.entries(servers)

    if (flags.json) {
      this.log(JSON.stringify(entries.map(([name, cfg]) => ({ name, ...cfg })), null, 2))
      return
    }

    if (entries.length === 0) {
      this.log('No MCP servers configured.')
      this.log('Add one: bt mcp add <name> --stdio "npx @modelcontextprotocol/server-github"')
      return
    }

    this.log('\nMCP Servers\n' + '─'.repeat(60))
    for (const [name, cfg] of entries) {
      const status = cfg.enabled ? '●' : '○'
      const transport = cfg.transport
      const endpoint = cfg.command ?? cfg.url ?? '(not set)'
      this.log(`${status} ${name.padEnd(20)} [${transport}] ${endpoint}`)
    }
  }
}
