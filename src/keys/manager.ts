import { EnvBackend } from './env-backend.js'
import { EncryptedFileBackend } from './encrypted-file-backend.js'
import { KeytarBackend } from './keytar-backend.js'
import type { StorageBackend } from './types.js'

export class KeyManager {
  private envBackend = new EnvBackend()
  private fileBackend = new EncryptedFileBackend()
  private keytarBackend = new KeytarBackend()
  private _keytarAvailable: boolean | null = null

  private static _instance: KeyManager | null = null

  static getInstance(): KeyManager {
    if (!this._instance) this._instance = new KeyManager()
    return this._instance
  }

  private async keytarAvailable(): Promise<boolean> {
    if (this._keytarAvailable === null) {
      this._keytarAvailable = await this.keytarBackend.isAvailable()
    }
    return this._keytarAvailable
  }

  /** Get an API key — checks env → keychain → encrypted file */
  async get(providerId: string): Promise<string | null> {
    const fromEnv = await this.envBackend.get(providerId)
    if (fromEnv) return fromEnv

    if (await this.keytarAvailable()) {
      const fromKeytar = await this.keytarBackend.get(providerId)
      if (fromKeytar) return fromKeytar
    }

    return this.fileBackend.get(providerId)
  }

  /** Persist an API key to the best available backend */
  async set(providerId: string, value: string): Promise<StorageBackend> {
    if (await this.keytarAvailable()) {
      await this.keytarBackend.set(providerId, value)
      return 'keychain'
    }

    await this.fileBackend.set(providerId, value)
    return 'encrypted-file'
  }

  async delete(providerId: string): Promise<void> {
    if (await this.keytarAvailable()) {
      await this.keytarBackend.delete(providerId).catch(() => {})
    }
    await this.fileBackend.delete(providerId).catch(() => {})
  }

  /** List all provider IDs that have keys stored */
  async list(): Promise<Array<{ providerId: string; backend: StorageBackend }>> {
    const results: Array<{ providerId: string; backend: StorageBackend }> = []
    const seen = new Set<string>()

    const envIds = await this.envBackend.list()
    for (const id of envIds) {
      seen.add(id)
      results.push({ providerId: id, backend: 'env' })
    }

    if (await this.keytarAvailable()) {
      const keytarIds = await this.keytarBackend.list()
      for (const id of keytarIds) {
        if (!seen.has(id)) {
          seen.add(id)
          results.push({ providerId: id, backend: 'keychain' })
        }
      }
    }

    const fileIds = await this.fileBackend.list()
    for (const id of fileIds) {
      if (!seen.has(id)) {
        results.push({ providerId: id, backend: 'encrypted-file' })
      }
    }

    return results
  }

  getEnvVarName(providerId: string): string {
    return this.envBackend.getEnvVarName(providerId)
  }
}

export const keys = KeyManager.getInstance()
