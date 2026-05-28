#!/usr/bin/env node

import { run } from '@oclif/core'

const args = process.argv.slice(2)
const shouldLaunchTui = args.length === 0 && process.stdin.isTTY && process.stdout.isTTY

await run(shouldLaunchTui ? ['chat'] : args, import.meta.url)
