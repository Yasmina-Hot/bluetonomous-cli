export class BtmError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestions: string[] = [],
    public override readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'BtmError'
  }
}

export class ProviderError extends BtmError {
  constructor(message: string, cause?: unknown) {
    super(message, 'PROVIDER_ERROR', ['Check your API key with: bt keys get <provider>', 'Verify the provider is configured: bt provider list'], cause)
    this.name = 'ProviderError'
  }
}

export class AuthError extends BtmError {
  constructor(provider: string, cause?: unknown) {
    super(
      `No API key found for provider "${provider}"`,
      'AUTH_ERROR',
      [`Add your key: bt keys set ${provider}`, `Or set the environment variable: ${getEnvVarHint(provider)}`],
      cause,
    )
    this.name = 'AuthError'
  }
}

export class WorkflowError extends BtmError {
  constructor(message: string, suggestions: string[] = [], cause?: unknown) {
    super(message, 'WORKFLOW_ERROR', suggestions, cause)
    this.name = 'WorkflowError'
  }
}

export class MCPError extends BtmError {
  constructor(message: string, cause?: unknown) {
    super(message, 'MCP_ERROR', ['Check MCP server connection: bt mcp inspect <name>', 'Verify server is running: bt mcp list'], cause)
    this.name = 'MCPError'
  }
}

export class MediaError extends BtmError {
  constructor(message: string, cause?: unknown) {
    super(message, 'MEDIA_ERROR', ['Ensure ffmpeg is installed for video processing', 'Check the file format is supported'], cause)
    this.name = 'MediaError'
  }
}

function getEnvVarHint(provider: string): string {
  const map: Record<string, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY',
    groq: 'GROQ_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    'nvidia-nim': 'NVIDIA_API_KEY',
  }
  return map[provider] ?? `BLUETONOMOUS_${provider.toUpperCase()}_API_KEY`
}
