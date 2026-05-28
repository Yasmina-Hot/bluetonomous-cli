import { Hook } from '@oclif/core'

// Non-blocking update check — runs in background, doesn't delay commands
const hook: Hook<'init'> = async function () {
  if (process.env.BTM_SKIP_UPDATE_CHECK) return

  try {
    const { createRequire } = await import('node:module')
    const require = createRequire(import.meta.url)
    const pkg = require('../../package.json') as { name: string; version: string }
    const currentVersion = pkg.version

    const resp = await fetch(`https://registry.npmjs.org/${pkg.name}/latest`, {
      signal: AbortSignal.timeout(3000),
    })

    if (resp.ok) {
      const data = await resp.json() as { version: string }
      const latestVersion = data.version

      if (latestVersion !== currentVersion) {
        process.stderr.write(`\n  Update available: ${currentVersion} → ${latestVersion}\n  Run: npm install -g bluetonomous\n\n`)
      }
    }
  } catch {
    // Silently ignore — update check is best-effort
  }
}

export default hook
