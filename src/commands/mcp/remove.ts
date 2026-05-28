import { Args, Command, Flags } from '@oclif/core'
import { confirm } from '@clack/prompts'

export default class McpRemove extends Command {
  static description = 'Remove an MCP server'
  static examples = ['<%= config.bin %> mcp remove github']

  static args = {
    name: Args.string({ description: 'MCP server name', required: true }),
  }

  static flags = {
    force: Flags.boolean({ char: 'f', description: 'Skip confirmation' }),
  }

  async run() {
    const { args, flags } = await this.parse(McpRemove)
    const { config } = await import('../../config/manager.js')

    const servers = config.get('mcpServers') ?? {}
    if (!servers[args.name]) {
      this.error(`MCP server "${args.name}" not found. List servers: bt mcp list`)
    }

    if (!flags.force) {
      const ok = await confirm({ message: `Remove MCP server "${args.name}"?` })
      if (!ok) {
        this.log('Cancelled.')
        return
      }
    }

    delete servers[args.name]
    config.set('mcpServers', servers)
    this.log(`✓ MCP server "${args.name}" removed`)
  }
}
