import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import pino from 'pino'

const logDir = join(homedir(), '.bluetonomous', 'logs')
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true })
}

export const logger = pino(
  {
    level: process.env.BTM_LOG_LEVEL ?? 'warn',
    name: 'bluetonomous',
  },
  pino.destination(join(logDir, 'bluetonomous.log')),
)
