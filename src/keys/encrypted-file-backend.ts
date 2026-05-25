import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, hostname } from 'node:os'
import { join } from 'node:path'
import type { KeyBackend } from './types.js'

const ALGORITHM = 'aes-256-gcm'
const KEY_LEN = 32
const IV_LEN = 16
const TAG_LEN = 16

export class EncryptedFileBackend implements KeyBackend {
  private filePath: string
  private encKey: Buffer

  constructor() {
    const dir = join(homedir(), '.bluetonomous')
    if (!existsSync(dir)) mkdirSync(dir, { mode: 0o700 })
    this.filePath = join(dir, 'keys.enc')
    // Machine-derived key — not a user password, just better than plaintext
    const seed = `bluetonomous:${hostname()}:${process.getuid?.() ?? 0}`
    this.encKey = scryptSync(seed, 'bluetonomous-salt', KEY_LEN)
  }

  async isAvailable(): Promise<boolean> {
    return true
  }

  private encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LEN)
    const cipher = createCipheriv(ALGORITHM, this.encKey, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted]).toString('base64')
  }

  private decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, 'base64')
    const iv = buf.subarray(0, IV_LEN)
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
    const encrypted = buf.subarray(IV_LEN + TAG_LEN)
    const decipher = createDecipheriv(ALGORITHM, this.encKey, iv)
    decipher.setAuthTag(tag)
    return decipher.update(encrypted) + decipher.final('utf8')
  }

  private load(): Record<string, string> {
    if (!existsSync(this.filePath)) return {}
    try {
      const content = readFileSync(this.filePath, 'utf8')
      const decrypted = this.decrypt(content)
      return JSON.parse(decrypted) as Record<string, string>
    } catch {
      return {}
    }
  }

  private save(data: Record<string, string>): void {
    const encrypted = this.encrypt(JSON.stringify(data))
    writeFileSync(this.filePath, encrypted, { mode: 0o600 })
  }

  async get(providerId: string): Promise<string | null> {
    return this.load()[providerId] ?? null
  }

  async set(providerId: string, value: string): Promise<void> {
    const data = this.load()
    data[providerId] = value
    this.save(data)
  }

  async delete(providerId: string): Promise<void> {
    const data = this.load()
    delete data[providerId]
    this.save(data)
  }

  async list(): Promise<string[]> {
    return Object.keys(this.load())
  }
}
