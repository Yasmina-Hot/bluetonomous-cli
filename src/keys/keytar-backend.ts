import type { KeyBackend } from './types.js'

const SERVICE = 'bluetonomous-cli'

type Keytar = {
  getPassword(service: string, account: string): Promise<string | null>
  setPassword(service: string, account: string, password: string): Promise<void>
  deletePassword(service: string, account: string): Promise<boolean>
  findPassword(service: string): Promise<string | null>
  findCredentials(service: string): Promise<Array<{ account: string; password: string }>>
}

export class KeytarBackend implements KeyBackend {
  private keytar: Keytar | null = null

  async isAvailable(): Promise<boolean> {
    try {
      const kt = await this.load()
      await kt.findPassword(SERVICE)
      return true
    } catch {
      return false
    }
  }

  private async load(): Promise<Keytar> {
    if (!this.keytar) {
      // keytar is an optional native dependency
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.keytar = (await import('keytar' as any)) as Keytar
    }
    return this.keytar
  }

  async get(providerId: string): Promise<string | null> {
    const kt = await this.load()
    return kt.getPassword(SERVICE, providerId)
  }

  async set(providerId: string, value: string): Promise<void> {
    const kt = await this.load()
    await kt.setPassword(SERVICE, providerId, value)
  }

  async delete(providerId: string): Promise<void> {
    const kt = await this.load()
    await kt.deletePassword(SERVICE, providerId)
  }

  async list(): Promise<string[]> {
    const kt = await this.load()
    const creds = await kt.findCredentials(SERVICE)
    return creds.map((c) => c.account)
  }
}
